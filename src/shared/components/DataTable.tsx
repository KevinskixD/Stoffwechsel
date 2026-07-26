import { Fragment, type ReactNode } from 'react'

export interface DataTableColumn<T> {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  sortable?: boolean
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
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-black/[0.08] bg-white">
      <table className="min-w-full text-sm">
        <thead className="border-b border-black/[0.08] bg-page">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-5 py-3 text-left text-[11.5px] font-bold tracking-wide text-black/45 uppercase ${
                  col.sortable ? 'cursor-pointer select-none' : ''
                }`}
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
              return (
                <Fragment key={key}>
                  <tr className="border-b border-black/[0.06] last:border-0 hover:bg-[#FBFAF9]">
                    {columns.map((col) => (
                      <td key={col.key} className="px-5 py-3.5 text-[13.5px] text-gray-900">
                        {col.render(row)}
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
