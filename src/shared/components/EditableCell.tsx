import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

interface EditableCellProps {
  value: string
  onCommit: (value: string) => void | Promise<void>
  type?: 'text' | 'number' | 'date'
  min?: number
  step?: number
  /** Overrides the read-mode rendering of `value`, e.g. a formatted date. */
  display?: ReactNode
  emptyText?: ReactNode
  className?: string
}

export function EditableCell({
  value,
  onCommit,
  type = 'text',
  min,
  step,
  display,
  emptyText = '–',
  className = '',
}: EditableCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const cancelledRef = useRef(false)

  function startEdit() {
    cancelledRef.current = false
    setDraft(value)
    setEditing(true)
  }

  function handleBlur() {
    setEditing(false)
    if (cancelledRef.current) return
    const next = type === 'text' ? draft.trim() : draft
    if (next !== value) void onCommit(next)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    } else if (e.key === 'Escape') {
      cancelledRef.current = true
      e.currentTarget.blur()
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        type={type}
        min={min}
        step={step}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`w-full rounded-lg border border-black/[0.14] px-2.5 py-1.5 text-[13.5px] focus:border-brand focus:outline-none ${className}`}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className={`-mx-1.5 rounded px-1.5 py-0.5 text-left hover:bg-black/[0.04] ${className}`}
    >
      {display ?? (value ? value : <span className="text-black/35">{emptyText}</span>)}
    </button>
  )
}
