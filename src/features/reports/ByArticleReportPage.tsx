import { useState } from 'react'
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable'
import { FilterDateInput } from '../../shared/components/FilterDateInput'
import { FilterField } from '../../shared/components/FilterField'
import { SearchInput } from '../../shared/components/SearchInput'
import { matchesSearch } from '../../shared/utils/search'
import { articleDisplayLabel } from '../../types/article'
import { useOrders } from '../orders/hooks'
import { flattenReportRows } from './flattenReportRows'
import { computeByArticleReport, type ArticleReportRow } from './reportQueries'
import { ReportTabs } from './ReportTabs'

const columns: DataTableColumn<ArticleReportRow>[] = [
  { key: 'articleName', header: 'Artikel', render: (r) => articleDisplayLabel(r) },
  { key: 'totalQuantity', header: 'Gesamtmenge', render: (r) => r.totalQuantity },
  { key: 'orderCount', header: 'Anzahl Bestellungen', render: (r) => r.orderCount },
]

export function ByArticleReportPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const { data: orders, loading } = useOrders({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })
  const rows = flattenReportRows(computeByArticleReport(orders)).filter((r) =>
    matchesSearch(search, r.articleName, r.articleNumber),
  )

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
          <SearchInput value={search} onChange={setSearch} placeholder="Artikel oder Nummer…" />
        </FilterField>
      </div>

      {loading ? (
        <p className="text-gray-400">Lädt…</p>
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.articleId} />
      )}
    </div>
  )
}
