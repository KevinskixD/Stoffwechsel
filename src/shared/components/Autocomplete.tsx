import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
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
  const [activeIndex, setActiveIndex] = useState(0)
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

  function selectOption(option: AutocompleteOption<T>) {
    onChange(option.value, option)
    setQuery(option.label)
    setOpen(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const activeOption = filtered[Math.min(activeIndex, filtered.length - 1)]

    if (event.key === 'ArrowDown' && filtered.length > 0) {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) => (index + 1) % filtered.length)
      return
    }

    if (event.key === 'ArrowUp' && filtered.length > 0) {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) => (index - 1 + filtered.length) % filtered.length)
      return
    }

    if (event.key === 'Enter' && open && activeOption) {
      event.preventDefault()
      selectOption(activeOption)
      return
    }

    if (event.key === 'Escape') {
      setOpen(false)
      setQuery(selected ? selected.label : '')
      return
    }

    // Commit the highlighted match before the browser advances focus. This makes Tab move
    // directly from a searchable order-form field to the next form control.
    if (event.key === 'Tab' && open && activeOption) {
      selectOption(activeOption)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true)
          setActiveIndex(Math.max(0, filtered.findIndex((option) => option.value === selected?.value)))
        }}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setActiveIndex(0)
        }}
        onKeyDown={handleKeyDown}
        className="w-full rounded-lg border border-black/[0.14] px-3 py-2 text-[13.5px] focus:border-brand focus:outline-none"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-black/[0.08] bg-surface shadow-lg">
          {filtered.map((option, index) => (
            <li
              key={option.value}
              className={`cursor-pointer px-3 py-2 text-[13.5px] hover:bg-brand-tint ${
                index === Math.min(activeIndex, filtered.length - 1) ? 'bg-brand-tint' : ''
              }`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={() => {
                selectOption(option)
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
