import { DataTable, type DataTableColumn } from '../../shared/components/DataTable'
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
  const { data: orders, loading } = useOrders({})
  const rows = flattenReportRows(computeByArticleReport(orders))

  return (
    <div className="px-11 pt-9 pb-15">
      <h1 className="mb-1.5 text-2xl font-extrabold text-gray-900">Berichte</h1>
      <p className="mb-5 text-sm text-black/50">Summen und Verteilungen über alle Bestellungen</p>
      <ReportTabs />
      {loading ? (
        <p className="text-gray-400">Lädt…</p>
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.articleId} />
      )}
    </div>
  )
}
