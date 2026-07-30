interface FilterDateInputProps {
  value: string
  onChange: (value: string) => void
}

export function FilterDateInput({ value, onChange }: FilterDateInputProps) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-lg border border-black/[0.12] px-3 text-[13.5px] text-gray-900"
    />
  )
}
