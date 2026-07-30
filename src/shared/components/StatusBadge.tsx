import { statusColors } from '../utils/statusColors'

export function StatusBadge({ status, color }: { status: string; color?: string }) {
  const c = statusColors({ name: status, color })
  return (
    <span
      className="inline-block rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ backgroundColor: c.bg, color: c.fg }}
    >
      {status}
    </span>
  )
}
