import { useState } from 'react'
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable'
import { FilterDateInput } from '../../shared/components/FilterDateInput'
import { FilterField } from '../../shared/components/FilterField'
import { SearchInput } from '../../shared/components/SearchInput'
import { StatusBadge } from '../../shared/components/StatusBadge'
import { formatDateDe } from '../../shared/utils/date'
import { matchesAllTokens } from '../../shared/utils/search'
import { useOrderStatuses } from '../orderStatuses/hooks'
import { useOrders } from '../orders/hooks'
import { flattenReportRows } from './flattenReportRows'
import { computeByEmployeeReport, type EmployeeReportRow } from './reportQueries'
import { ReportTabs } from './ReportTabs'

type SortKey = 'employeeName' | 'totalQuantity' | 'orderCount'

export function ByEmployeeReportPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const { data: orders, loading } = useOrders({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })
  const { data: statuses } = useOrderStatuses(true)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('employeeName')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const rows = flattenReportRows(computeByEmployeeReport(orders))
  const filtered = rows.filter((r) => matchesAllTokens(search, r.employeeName))

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDirection === 'asc' ? 1 : -1
    if (sortKey === 'employeeName') return a.employeeName.localeCompare(b.employeeName) * dir
    return (a[sortKey] - b[sortKey]) * dir
  })

  function handleSortChange(key: string) {
    if (key === sortKey) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key as SortKey)
      setSortDirection('asc')
    }
  }

  const columns: DataTableColumn<EmployeeReportRow>[] = [
    { key: 'employeeName', header: 'Mitarbeiter', render: (r) => r.employeeName, sortable: true },
    { key: 'totalQuantity', header: 'Gesamtmenge', render: (r) => r.totalQuantity, sortable: true },
    { key: 'orderCount', header: 'Anzahl Bestellungen', render: (r) => r.orderCount, sortable: true },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <button
          type="button"
          onClick={() => setExpandedId(expandedId === r.employeeId ? null : r.employeeId)}
          className="text-[13px] font-semibold text-brand hover:underline"
        >
          {expandedId === r.employeeId ? 'Verbergen' : 'Historie'}
        </button>
      ),
    },
  ]

  return (
    <div className="px-11 pt-9 pb-15">
      <h1 className="mb-1.5 text-2xl font-extrabold text-gray-900">Berichte</h1>
      <p className="mb-5 text-sm text-black/50">Summen und Verteilungen über alle Bestellungen</p>
      <ReportTabs />

      <div className="mb-4.5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <FilterField label="Von">
          <FilterDateInput value={dateFrom} onChange={setDateFrom} />
        </FilterField>
        <FilterField label="Bis">
          <FilterDateInput value={dateTo} onChange={setDateTo} />
        </FilterField>
        <FilterField label="Suche">
          <SearchInput value={search} onChange={setSearch} placeholder="Mitarbeiter suchen…" />
        </FilterField>
      </div>
      <div className="mb-4.5 flex items-center justify-end">
        <span className="text-xs font-semibold text-black/45">{sorted.length} Einträge</span>
      </div>

      {loading ? (
        <p className="text-gray-400">Lädt…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={sorted}
          rowKey={(r) => r.employeeId}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          expandedRowId={expandedId}
          renderExpandedRow={(r) => (
            <div>
              <h2 className="mb-2 text-sm font-extrabold text-gray-900">Bestellhistorie: {r.employeeName}</h2>
              <ul className="divide-y divide-black/[0.06] rounded-xl border border-black/[0.08] bg-white text-[13.5px]">
                {r.orders
                  .slice()
                  .sort((a, b) => b.orderDate.localeCompare(a.orderDate))
                  .map((o) => (
                    <li key={o.id} className="flex items-center justify-between px-5 py-2.5">
                      <span>
                        {formatDateDe(o.orderDate)} — {o.articleName} ({o.quantity}x)
                      </span>
                      <StatusBadge status={o.status} color={statuses.find((s) => s.id === o.statusId)?.color} />
                    </li>
                  ))}
              </ul>
            </div>
          )}
        />
      )}
    </div>
  )
}
