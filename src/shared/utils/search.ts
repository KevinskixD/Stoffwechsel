/** Lowercases and strips diacritics so "Müller" matches a search for "muller". */
export function normalizeForSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

export function matchesSearch(term: string, ...fields: string[]): boolean {
  if (!term.trim()) return true
  const normalizedTerm = normalizeForSearch(term)
  return fields.some((field) => normalizeForSearch(field).includes(normalizedTerm))
}

/**
 * Splits `term` on whitespace/commas and requires every token to appear somewhere across
 * `fields` combined — order-independent, so "Michael Sommer" matches a stored "Sommer, Michael"
 * just as well as "Sommer Michael" or "Sommer" alone.
 */
export function matchesAllTokens(term: string, ...fields: string[]): boolean {
  const tokens = normalizeForSearch(term)
    .replace(/,/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  if (tokens.length === 0) return true
  const haystack = fields.map((field) => normalizeForSearch(field)).join(' ')
  return tokens.every((token) => haystack.includes(token))
}
