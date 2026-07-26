/**
 * Best-effort extraction of a clothing size token from an article name. Order matters: longer/
 * more specific patterns are tried first so e.g. "XXL" isn't cut short by the plain "L" pattern.
 * Always user-overridable — this only pre-fills a suggestion, never blocks saving.
 */
const LETTER_SIZE_PATTERNS: RegExp[] = [/\b([2-5]XL)\b/i, /\b(XXXL|XXL|XL|L|M|S|XS)\b/i]
const OTHER_SIZE_PATTERNS: RegExp[] = [
  /\bGr\.?\s?(\d{2,3})\b/i,
  /\b(3[4-9]|4[0-9]|5[0-6])\b/,
  /\b(Universal|Onesize|One Size|Einheitsgr(?:öße|osse))\b/i,
]

export function extractSizeFromArticleName(articleName: string): string {
  for (const pattern of LETTER_SIZE_PATTERNS) {
    const match = articleName.match(pattern)
    if (match) return match[1].toUpperCase()
  }
  for (const pattern of OTHER_SIZE_PATTERNS) {
    const match = articleName.match(pattern)
    if (match) return match[1]
  }
  return ''
}
