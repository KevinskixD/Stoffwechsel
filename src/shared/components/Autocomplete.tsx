import { useEffect, useRef, useState } from 'react'
import { matchesSearch } from '../utils/search'

export interface AutocompleteOption<T> {
  value: string
  label: string
  data: T
}

interface AutocompleteProps<T> {
  options: AutocompleteOption<T>[]
  value: string | null
  onChange: (value: string, option: AutocompleteOption<T> | null) => void
  placeholder?: string
}

/**
 * Searchable select restricted to `options` — typing filters the list, but blur without a
 * pick reverts the text to the current selection. Used so employee/article order-form
 * fields can only reference existing master-data records, never free text.
 */
export function Autocomplete<T>({ options, value, onChange, placeholder = 'Auswählen…' }: AutocompleteProps<T>) {
  const selected = options.find((o) => o.value === value) ?? null
  const [query, setQuery] = useState(selected?.label ?? '')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(selected ? selected.label : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.value])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
        setQuery(selected ? selected.label : '')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selected])

  const filtered =
    query.trim() === '' || query === selected?.label
      ? options
      : options.filter((o) => matchesSearch(query, o.label))

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        className="w-full rounded-lg border border-black/[0.14] px-3 py-2 text-[13.5px] focus:border-brand focus:outline-none"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-black/[0.08] bg-white shadow-lg">
          {filtered.map((option) => (
            <li
              key={option.value}
              className="cursor-pointer px-3 py-2 text-[13.5px] hover:bg-brand-tint"
              onMouseDown={() => {
                onChange(option.value, option)
                setQuery(option.label)
                setOpen(false)
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
