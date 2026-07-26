function normalizeKeyPart(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}

/**
 * Builds an AND-combined duplicate key from multiple fields (e.g. articleName + articleNumber),
 * so a single shared/blank field (like a placeholder article number) doesn't by itself flag
 * unrelated records as duplicates — all listed fields must match together.
 */
export function buildCompositeKey(data: Record<string, unknown>, fields: string[]): string {
  return fields.map((field) => normalizeKeyPart(data[field])).join('|')
}
