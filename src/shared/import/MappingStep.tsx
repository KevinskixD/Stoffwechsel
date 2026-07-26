import { useState } from 'react'
import type { ImportEntityConfig } from './types'

interface MappingStepProps<T, P> {
  config: ImportEntityConfig<T, P>
  headers: string[]
  onContinue: (mapping: Record<string, string>) => void
  onBack: () => void
}

const NONE = '__none__'

export function MappingStep<T, P>({ config, headers, onContinue, onBack }: MappingStepProps<T, P>) {
  const [mapping, setMapping] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const field of config.fields) {
      const guess = headers.find((h) => h.trim().toLowerCase() === field.label.trim().toLowerCase())
      initial[field.targetField] = guess ?? ''
    }
    return initial
  })

  const missingRequired = config.fields.filter((f) => f.required && !mapping[f.targetField])

  return (
    <div>
      <h2 className="mb-3 text-sm font-extrabold text-gray-900">Spalten zuordnen</h2>
      <div className="space-y-3">
        {config.fields.map((field) => (
          <div key={field.targetField} className="flex items-center gap-3">
            <label className="w-40 shrink-0 text-[13.5px] text-gray-600">
              {field.label}
              {field.required ? ' *' : ''}
            </label>
            <select
              value={mapping[field.targetField] || NONE}
              onChange={(e) =>
                setMapping({ ...mapping, [field.targetField]: e.target.value === NONE ? '' : e.target.value })
              }
              className="rounded-lg border border-black/[0.14] px-2.5 py-2 text-[13.5px] focus:border-brand focus:outline-none"
            >
              {field.required ? (
                <option value={NONE} disabled>
                  Spalte auswählen…
                </option>
              ) : (
                <option value={NONE}>nicht importieren</option>
              )}
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-2.5">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-black/[0.12] px-4.5 py-2.5 text-[13.5px] font-bold text-gray-900"
        >
          Zurück
        </button>
        <button
          type="button"
          disabled={missingRequired.length > 0}
          onClick={() => onContinue(mapping)}
          className="rounded-lg bg-brand px-4.5 py-2.5 text-[13.5px] font-bold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          Weiter zur Vorschau
        </button>
      </div>
    </div>
  )
}
