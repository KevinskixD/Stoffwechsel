export interface StatusColor {
  bg: string
  fg: string
}

// Semantic grouping of the default order-status workflow: red = needs action,
// amber = in progress / waiting, green = done. Used as a fallback until a status
// is given an explicit color, and as the initial value offered in the color picker.
const RED_STATUSES = new Set(['zu bestellen', 'umtausch'])
const AMBER_STATUSES = new Set(['bestellt', 'geliefert', 'informiert'])
const GREEN_STATUSES = new Set(['abgeholt', 'abgeschlossen'])

const RED_HEX = '#f4dcdb'
const AMBER_HEX = '#fdf3d9'
const GREEN_HEX = '#e7f5ec'
const NEUTRAL_HEX = '#e5e7eb'

/** Concrete hex fallback for a status without a configured color — used to seed the color picker. */
export function legacyHexBg(name: string): string {
  const key = name.trim().toLowerCase()
  if (RED_STATUSES.has(key)) return RED_HEX
  if (AMBER_STATUSES.has(key)) return AMBER_HEX
  if (GREEN_STATUSES.has(key)) return GREEN_HEX
  return NEUTRAL_HEX
}

function legacyStatusColor(name: string): StatusColor {
  const key = name.trim().toLowerCase()
  if (RED_STATUSES.has(key)) return { bg: 'var(--color-badge-red-bg)', fg: 'var(--color-badge-red-fg)' }
  if (AMBER_STATUSES.has(key)) return { bg: 'var(--color-badge-amber-bg)', fg: 'var(--color-badge-amber-fg)' }
  if (GREEN_STATUSES.has(key)) return { bg: 'var(--color-badge-green-bg)', fg: 'var(--color-badge-green-fg)' }
  return { bg: 'rgba(0,0,0,0.06)', fg: 'rgba(0,0,0,0.5)' }
}

/** Picks black or white text for readable contrast against an arbitrary hex background. */
export function contrastFg(hexBg: string): string {
  const hex = hexBg.replace('#', '')
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#1f2933' : '#ffffff'
}

/** Uses the status's own configured `color` if set, otherwise falls back to the legacy semantic grouping. */
export function statusColors(status: { name: string; color?: string }): StatusColor {
  if (status.color) return { bg: status.color, fg: contrastFg(status.color) }
  return legacyStatusColor(status.name)
}
