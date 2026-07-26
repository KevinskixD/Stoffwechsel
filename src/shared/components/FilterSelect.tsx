import type { ReactNode } from 'react'
import { FilterField } from './FilterField'

interface FilterSelectProps {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}

export function FilterSelect({ label, value, onChange, children }: FilterSelectProps) {
  return (
    <FilterField label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full truncate rounded-lg border border-black/[0.12] px-3 py-2 text-[13.5px] font-medium text-gray-900"
      >
        {children}
      </select>
    </FilterField>
  )
}
