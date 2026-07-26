import { useRef, useState } from 'react'
import type { DataTableColumn } from '../components/DataTable'

export interface RowSelection<T> {
  selectedIds: Set<string>
  selectedCount: number
  toggleOne: (id: string, checked: boolean, shiftKey?: boolean) => void
  clear: () => void
  /** Checkbox column — spread first into `DataTableColumn<T>[]` passed to `DataTable`. */
  column: DataTableColumn<T>
}

/** Selection is scoped to `rows` (the currently rendered/visible rows) — "select all" only selects those. */
export function useRowSelection<T extends { id: string }>(rows: T[]): RowSelection<T> {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const lastClickedId = useRef<string | null>(null)
  const shiftPressed = useRef(false)
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id))

  /** Shift+click selects the range between the last clicked row and this one. */
  function toggleOne(id: string, checked: boolean, shiftKey?: boolean) {
    // Captured before setSelectedIds — its updater may run after this function returns, by which
    // point `lastClickedId.current = id` below would already have overwritten the previous value.
    const previousId = lastClickedId.current
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const fromIndex = shiftKey && previousId ? rows.findIndex((row) => row.id === previousId) : -1
      const toIndex = shiftKey ? rows.findIndex((row) => row.id === id) : -1
      if (fromIndex !== -1 && toIndex !== -1) {
        const [start, end] = fromIndex < toIndex ? [fromIndex, toIndex] : [toIndex, fromIndex]
        for (let i = start; i <= end; i++) {
          if (checked) next.add(rows[i].id)
          else next.delete(rows[i].id)
        }
      } else if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
    lastClickedId.current = id
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? new Set(rows.map((row) => row.id)) : new Set())
  }

  function clear() {
    setSelectedIds(new Set())
  }

  const column: DataTableColumn<T> = {
    key: 'select',
    header: (
      <input
        type="checkbox"
        checked={allSelected}
        onChange={(e) => toggleAll(e.target.checked)}
        className="rounded border-black/20 accent-brand"
      />
    ),
    render: (row) => (
      <input
        type="checkbox"
        checked={selectedIds.has(row.id)}
        onClick={(e) => {
          shiftPressed.current = e.shiftKey
        }}
        onChange={(e) => toggleOne(row.id, e.target.checked, shiftPressed.current)}
        className="rounded border-black/20 accent-brand"
      />
    ),
  }

  return { selectedIds, selectedCount: selectedIds.size, toggleOne, clear, column }
}
