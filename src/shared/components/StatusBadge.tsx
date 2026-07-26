import { statusColors } from '../utils/statusColors'

export function StatusBadge({ status }: { status: string }) {
  const c = statusColors(status)
  return (
    <span
      className="inline-block rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ backgroundColor: c.bg, color: c.fg }}
    >
      {status}
    </span>
  )
}
