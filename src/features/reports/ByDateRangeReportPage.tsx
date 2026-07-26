import { useState } from 'react'
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable'
import { formatDateDe } from '../../shared/utils/date'
import { useOrders } from '../orders/hooks'
import { flattenReportRows } from './flattenReportRows'
import { computeByDateReport, type DateReportRow } from './reportQueries'
import { ReportTabs } from './ReportTabs'

export function ByDateRangeReportPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const { data: orders, loading } = useOrders({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })
  const rows = flattenReportRows(computeByDateReport(orders))
  const maxQuantity = Math.max(1, ...rows.map((r) => r.totalQuantity))

  const columns: DataTableColumn<DateReportRow>[] = [
    { key: 'date', header: 'Datum', render: (r) => formatDateDe(r.date) },
    { key: 'orderCount', header: 'Anzahl Bestellungen', render: (r) => r.orderCount },
    { key: 'totalQuantity', header: 'Gesamtmenge', render: (r) => r.totalQuantity },
    {
      key: 'chart',
      header: 'Verlauf',
      render: (r) => (
        <div className="h-2 rounded-full bg-brand/30" style={{ width: `${(r.totalQuantity / maxQuantity) * 100}%` }} />
      ),
    },
  ]

  return (
    <div className="px-11 pt-9 pb-15">
      <h1 className="mb-1.5 text-2xl font-extrabold text-gray-900">Berichte</h1>
      <p className="mb-5 text-sm text-black/50">Summen und Verteilungen über alle Bestellungen</p>
      <ReportTabs />

      <div className="mb-4.5 flex gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-black/45">Von</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-black/[0.12] px-3 py-2 text-[13.5px]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-black/45">Bis</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-black/[0.12] px-3 py-2 text-[13.5px]"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400">Lädt…</p>
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.date} />
      )}
    </div>
  )
}
