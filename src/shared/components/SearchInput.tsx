import { SearchIcon } from './icons'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchInput({ value, onChange, placeholder = 'Suchen…' }: SearchInputProps) {
  return (
    <div className="relative max-w-[340px] flex-1">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-black/40">
        <SearchIcon />
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-black/[0.12] pr-3.5 pl-9 text-[13.5px] focus:border-brand focus:outline-none"
      />
    </div>
  )
}
