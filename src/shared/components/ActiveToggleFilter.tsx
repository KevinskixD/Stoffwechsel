interface ActiveToggleFilterProps {
  showInactive: boolean
  onChange: (showInactive: boolean) => void
}

export function ActiveToggleFilter({ showInactive, onChange }: ActiveToggleFilterProps) {
  return (
    <label className="flex items-center gap-2 text-[13.5px] font-medium text-black/55">
      <input
        type="checkbox"
        checked={showInactive}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-black/20 accent-brand"
      />
      Auch inaktive anzeigen
    </label>
  )
}
