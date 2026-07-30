import { useRef, useState } from 'react'
import type { DataTableColumn } from '../components/DataTable'

export interface Selection {
  selectedIds: Set<string>
  selectedCount: number
  allSelected: boolean
  toggleOne: (id: string, checked: boolean, shiftKey?: boolean) => void
  toggleAll: (checked: boolean) => void
  /** Toggles the row's current state — for click-anywhere-on-row selection (no native checkbox event to read `checked` from). */
  toggleRowClick: (id: string, shiftKey?: boolean) => void
  clear: () => void
}

export interface RowSelection<T> extends Selection {
  /** Checkbox column — spread first into `DataTableColumn<T>[]` passed to `DataTable`. */
  column: DataTableColumn<T>
}

/** Selection is scoped to `rows` (the currently rendered/visible rows) — "select all" only selects those. */
export function useSelection<T extends { id: string }>(rows: T[]): Selection {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const lastClickedId = useRef<string | null>(null)
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

  function toggleRowClick(id: string, shiftKey?: boolean) {
    toggleOne(id, !selectedIds.has(id), shiftKey)
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? new Set(rows.map((row) => row.id)) : new Set())
  }

  function clear() {
    setSelectedIds(new Set())
  }

  return { selectedIds, selectedCount: selectedIds.size, allSelected, toggleOne, toggleAll, toggleRowClick, clear }
}

/** `useSelection` plus a ready-made checkbox `DataTableColumn`, for `DataTable`-based list pages. */
export function useRowSelection<T extends { id: string }>(rows: T[]): RowSelection<T> {
  const selection = useSelection(rows)
  const shiftPressed = useRef(false)

  const column: DataTableColumn<T> = {
    key: 'select',
    header: (
      <input
        type="checkbox"
        checked={selection.allSelected}
        onChange={(e) => selection.toggleAll(e.target.checked)}
        className="rounded border-black/20 accent-brand"
      />
    ),
    render: (row) => (
      <input
        type="checkbox"
        checked={selection.selectedIds.has(row.id)}
        onClick={(e) => {
          shiftPressed.current = e.shiftKey
        }}
        onChange={(e) => selection.toggleOne(row.id, e.target.checked, shiftPressed.current)}
        className="rounded border-black/20 accent-brand"
      />
    ),
  }

  return { ...selection, column }
}
