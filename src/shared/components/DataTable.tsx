import { Fragment, type MouseEvent, type ReactNode } from 'react'
import { isInteractiveClickTarget } from '../utils/rowClick'

export interface DataTableColumn<T> {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
}

function alignClass(align: DataTableColumn<unknown>['align']): string {
  if (align === 'center') return 'text-center'
  if (align === 'right') return 'text-right'
  return 'text-left'
}

/**
 * Cell content for non-left alignment is wrapped in a flex row instead of relying on inherited
 * `text-align` — form controls like `<select>` are replaced elements whose own box doesn't
 * reliably center via inherited text-align across browsers, so flex is used to position the
 * element itself rather than just its text.
 */
function justifyClass(align: DataTableColumn<unknown>['align']): string {
  if (align === 'center') return 'justify-center'
  if (align === 'right') return 'justify-end'
  return 'justify-start'
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  sortKey?: string
  sortDirection?: 'asc' | 'desc'
  onSortChange?: (key: string) => void
  emptyMessage?: string
  /** Row whose key matches gets `renderExpandedRow`'s output in a full-width row right beneath it. */
  expandedRowId?: string | null
  renderExpandedRow?: (row: T) => ReactNode
  /** Fires when a row is clicked outside of any link/button/input/select — e.g. to toggle selection. */
  onRowClick?: (row: T, event: MouseEvent<HTMLTableRowElement>) => void
  isRowSelected?: (row: T) => boolean
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  sortKey,
  sortDirection,
  onSortChange,
  emptyMessage = 'Keine Einträge vorhanden.',
  expandedRowId,
  renderExpandedRow,
  onRowClick,
  isRowSelected,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-black/[0.08] bg-surface">
      <table className="min-w-full text-sm">
        <thead className="border-b border-black/[0.08] bg-page">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-5 py-3 text-[11.5px] font-bold tracking-wide text-black/45 uppercase ${alignClass(
                  col.align,
                )} ${col.sortable ? 'cursor-pointer select-none' : ''}`}
                onClick={col.sortable ? () => onSortChange?.(col.key) : undefined}
              >
                {col.header}
                {col.sortable && sortKey === col.key ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-5 py-12 text-center text-sm text-black/40">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const key = rowKey(row)
              const selected = isRowSelected?.(row) ?? false
              return (
                <Fragment key={key}>
                  <tr
                    className={`border-b border-black/[0.06] last:border-0 hover:bg-[#FBFAF9] dark:hover:bg-white/[0.04] ${
                      onRowClick ? 'cursor-pointer' : ''
                    } ${selected ? 'bg-brand/5' : ''}`}
                    onClick={
                      onRowClick
                        ? (e) => {
                            if (isInteractiveClickTarget(e.target as EventTarget)) return
                            onRowClick(row, e)
                          }
                        : undefined
                    }
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={`px-5 py-3.5 text-[13.5px] text-gray-900 ${alignClass(col.align)}`}>
                        {col.align && col.align !== 'left' ? (
                          <div className={`flex items-center ${justifyClass(col.align)}`}>{col.render(row)}</div>
                        ) : (
                          col.render(row)
                        )}
                      </td>
                    ))}
                  </tr>
                  {expandedRowId === key && renderExpandedRow && (
                    <tr className="border-b border-black/[0.06] last:border-0 bg-page">
                      <td colSpan={columns.length} className="px-5 py-4">
                        {renderExpandedRow(row)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
