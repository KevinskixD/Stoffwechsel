export function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <span
      className="inline-block rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ backgroundColor: 'var(--color-badge-green-bg)', color: 'var(--color-badge-green-fg)' }}
    >
      Aktiv
    </span>
  ) : (
    <span className="inline-block rounded-full bg-black/[0.06] px-2.5 py-1 text-xs font-semibold text-black/50">
      Inaktiv
    </span>
  )
}
