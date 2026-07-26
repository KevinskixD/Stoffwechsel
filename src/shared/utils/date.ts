/** Converts a `YYYY-MM-DD` order date string to German `dd.mm.yyyy` display format. */
export function formatDateDe(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  if (!year || !month || !day) return isoDate
  return `${day}.${month}.${year}`
}

/** Today as a `YYYY-MM-DD` string, suitable as a default value for `<input type="date">`. */
export function todayISO(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}
