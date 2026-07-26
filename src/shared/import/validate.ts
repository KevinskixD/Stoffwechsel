import { buildCompositeKey } from './compositeKey'
import type { ImportEntityConfig, ImportFieldConfig, ImportRowState } from './types'

function normalizeToISODate(value: unknown): string | null {
  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
    const deMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
    if (deMatch) {
      const [, day, month, year] = deMatch
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
  }
  return null
}

function coerceField(rawValue: unknown, field: ImportFieldConfig): { value?: unknown; error?: string } {
  const stringValue = rawValue === undefined || rawValue === null ? '' : String(rawValue).trim()

  if (!stringValue) {
    return field.required ? { error: `Pflichtfeld "${field.label}" fehlt.` } : {}
  }
  if (field.type === 'number') {
    const num = Number(stringValue.replace(',', '.'))
    if (Number.isNaN(num)) return { error: `"${field.label}" ist keine gültige Zahl.` }
    return { value: num }
  }
  if (field.type === 'date') {
    const iso = normalizeToISODate(rawValue)
    if (!iso) return { error: `"${field.label}" ist kein gültiges Datum.` }
    return { value: iso }
  }
  return { value: stringValue }
}

export async function validateAndResolveRows<T, P>(
  rawRows: Record<string, unknown>[],
  mapping: Record<string, string>,
  config: ImportEntityConfig<T, P>,
): Promise<ImportRowState[]> {
  const existingKeys = config.fetchExistingKeys ? await config.fetchExistingKeys() : new Set<string>()
  const prefetched = config.prefetch ? await config.prefetch() : (undefined as P)
  const seenInFile = new Set<string>()

  return rawRows.map((raw, index) => {
    const data: Record<string, unknown> = {}
    const errors: string[] = []

    for (const field of config.fields) {
      const sourceHeader = mapping[field.targetField]
      const rawValue = sourceHeader ? raw[sourceHeader] : undefined
      const { value, error } = coerceField(rawValue, field)
      if (error) errors.push(error)
      else if (value !== undefined) data[field.targetField] = value
    }

    let finalData = data
    if (errors.length === 0 && config.resolveRow) {
      const resolved = config.resolveRow(data, prefetched)
      finalData = { ...data, ...resolved.data }
      errors.push(...resolved.errors)
    }

    if (errors.length === 0 && config.uniqueKeyFields && config.uniqueKeyFields.length > 0) {
      const keyValue = buildCompositeKey(finalData, config.uniqueKeyFields)
      const fieldLabels = config.uniqueKeyFields
        .map((f) => config.fields.find((field) => field.targetField === f)?.label ?? f)
        .join(' + ')
      if (existingKeys.has(keyValue)) {
        errors.push(`Eintrag mit dieser Kombination (${fieldLabels}) existiert bereits.`)
      } else if (seenInFile.has(keyValue)) {
        errors.push(`Eintrag mit dieser Kombination (${fieldLabels}) ist mehrfach in der Datei vorhanden.`)
      } else {
        seenInFile.add(keyValue)
      }
    }

    return { rowIndex: index, raw, data: finalData, errors }
  })
}
