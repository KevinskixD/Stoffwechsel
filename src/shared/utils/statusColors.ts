export interface StatusColor {
  bg: string
  fg: string
}

// Semantic grouping of the default order-status workflow: red = needs action,
// amber = in progress / waiting, green = done. Custom statuses the user adds later
// fall back to a neutral color rather than breaking.
const RED_STATUSES = new Set(['zu bestellen', 'umtausch'])
const AMBER_STATUSES = new Set(['bestellt', 'geliefert', 'informiert'])
const GREEN_STATUSES = new Set(['abgeholt', 'abgeschlossen'])

export function statusColors(status: string): StatusColor {
  const key = status.trim().toLowerCase()
  if (RED_STATUSES.has(key)) return { bg: 'var(--color-badge-red-bg)', fg: 'var(--color-badge-red-fg)' }
  if (AMBER_STATUSES.has(key)) return { bg: 'var(--color-badge-amber-bg)', fg: 'var(--color-badge-amber-fg)' }
  if (GREEN_STATUSES.has(key)) return { bg: 'var(--color-badge-green-bg)', fg: 'var(--color-badge-green-fg)' }
  return { bg: 'rgba(0,0,0,0.06)', fg: 'rgba(0,0,0,0.5)' }
}
