import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog'
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable'
import { EditableCell } from '../../shared/components/EditableCell'
import { FilterField } from '../../shared/components/FilterField'
import { FilterSelect } from '../../shared/components/FilterSelect'
import { PageHeader, PrimaryLinkButton } from '../../shared/components/PageHeader'
import { Pagination } from '../../shared/components/Pagination'
import { SearchInput } from '../../shared/components/SearchInput'
import { useDebounce } from '../../shared/hooks/useDebounce'
import { useRowSelection } from '../../shared/hooks/useRowSelection'
import { formatDateDe } from '../../shared/utils/date'
import { matchesAllTokens } from '../../shared/utils/search'
import { statusColors } from '../../shared/utils/statusColors'
import { articleDisplayLabel } from '../../types/article'
import { employeeDisplayName } from '../../types/employee'
import type { Order } from '../../types/order'
import { useArticles } from '../articles/hooks'
import { useEmployees } from '../employees/hooks'
import { useOrderStatuses } from '../orderStatuses/hooks'
import { deleteAllOrders, deleteOrder, deleteOrders, updateOrderDate, updateOrderQuantity, updateOrderStatus } from './api'
import { useOrders } from './hooks'

const PAGE_SIZE = 25

type PendingDelete = { kind: 'single'; order: Order } | { kind: 'bulk'; ids: string[] } | { kind: 'all' }

export function OrderListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') ?? ''
  function setStatus(value: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set('status', value)
        else next.delete('status')
        return next
      },
      { replace: true },
    )
  }

  const [employeeId, setEmployeeId] = useState('')
  const [articleId, setArticleId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [page, setPage] = useState(0)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)

  const { data: rawOrders, loading } = useOrders({
    employeeId: employeeId || undefined,
    articleId: articleId || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  })
  const { data: employees } = useEmployees(true)
  const { data: articles } = useArticles(true)
  const { data: activeOrderStatuses } = useOrderStatuses(false)

  const statusOptions = Array.from(new Set(rawOrders.map((o) => o.status))).sort()

  const personnelNumberByEmployeeId = new Map(employees.map((e) => [e.id, e.personnelNumber]))

  const filtered = rawOrders
    .filter((o) => (status ? o.status === status : true))
    .filter((o) =>
      matchesAllTokens(debouncedSearch, o.employeeName, o.articleName, personnelNumberByEmployeeId.get(o.employeeId) ?? ''),
    )

  useEffect(() => {
    setPage(0)
  }, [employeeId, articleId, status, dateFrom, dateTo, debouncedSearch])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const selection = useRowSelection(pageItems)

  const columns: DataTableColumn<Order>[] = [
    selection.column,
    {
      key: 'orderDate',
      header: 'Datum',
      render: (o) => (
        <EditableCell
          type="date"
          value={o.orderDate}
          display={formatDateDe(o.orderDate)}
          onCommit={(v) => {
            if (v) void updateOrderDate(o.id, v)
          }}
        />
      ),
    },
    { key: 'employeeName', header: 'Mitarbeiter', render: (o) => o.employeeName },
    { key: 'articleName', header: 'Artikel', render: (o) => articleDisplayLabel(o) },
    {
      key: 'quantity',
      header: 'Menge',
      render: (o) => (
        <EditableCell
          type="number"
          min={1}
          step={1}
          value={String(o.quantity)}
          onCommit={(v) => {
            const n = Number(v)
            if (Number.isInteger(n) && n > 0) void updateOrderQuantity(o.id, n)
          }}
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (o) => {
        const c = statusColors(o.status)
        return (
          <select
            value={o.statusId}
            onChange={(e) => {
              const selected = activeOrderStatuses.find((s) => s.id === e.target.value)
              if (selected) void updateOrderStatus(o.id, selected.id, selected.name)
            }}
            className="appearance-none rounded-full border-0 px-3 py-1 text-xs font-semibold"
            style={{ backgroundColor: c.bg, color: c.fg }}
          >
            {!activeOrderStatuses.some((s) => s.id === o.statusId) && (
              <option value={o.statusId}>{o.status}</option>
            )}
            {activeOrderStatuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )
      },
    },
    {
      key: 'actions',
      header: '',
      render: (o) => (
        <div className="flex gap-4 text-[13px] font-semibold">
          <Link to={`/orders/${o.id}/edit`} className="text-brand hover:underline">
            Bearbeiten
          </Link>
          <button
            type="button"
            onClick={() => setPendingDelete({ kind: 'single', order: o })}
            className="text-black/45 hover:underline"
          >
            Löschen
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="px-11 pt-9 pb-15">
      <PageHeader
        title="Bestellungen"
        subtitle="Bestellte und ausgegebene Uniformteile pro Mitarbeiter"
        action={
          <>
            <Link
              to="/orders/import"
              className="rounded-lg border border-black/[0.12] px-4 py-2.5 text-[13.5px] font-bold text-gray-900"
            >
              Excel-Import
            </Link>
            <button
              type="button"
              onClick={() => setPendingDelete({ kind: 'all' })}
              className="rounded-lg border border-red-300 px-4 py-2.5 text-[13.5px] font-bold text-red-600"
            >
              Alle löschen
            </button>
            <PrimaryLinkButton to="/orders/new">+ Neue Bestellung</PrimaryLinkButton>
          </>
        }
      />

      <div className="mb-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <FilterSelect label="Mitarbeiter" value={employeeId} onChange={setEmployeeId}>
          <option value="">Alle</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {employeeDisplayName(e)}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="Artikel" value={articleId} onChange={setArticleId}>
          <option value="">Alle</option>
          {articles.map((a) => (
            <option key={a.id} value={a.id}>
              {a.articleName}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="Status" value={status} onChange={setStatus}>
          <option value="">Alle</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </FilterSelect>
        <FilterField label="Von">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full rounded-lg border border-black/[0.12] px-3 py-2 text-[13.5px]"
          />
        </FilterField>
        <FilterField label="Bis">
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full rounded-lg border border-black/[0.12] px-3 py-2 text-[13.5px]"
          />
        </FilterField>
        <FilterField label="Suche">
          <SearchInput value={search} onChange={setSearch} placeholder="Mitarbeiter, Personalnummer oder Artikel…" />
        </FilterField>
      </div>
      <div className="mb-4.5 flex items-center justify-end gap-3">
        {selection.selectedCount > 0 && (
          <button
            type="button"
            onClick={() => setPendingDelete({ kind: 'bulk', ids: Array.from(selection.selectedIds) })}
            className="rounded-lg border border-red-300 px-3.5 py-1.5 text-[13px] font-bold text-red-600"
          >
            {selection.selectedCount} ausgewählt löschen
          </button>
        )}
        <span className="text-xs font-semibold text-black/45">{filtered.length} Einträge</span>
      </div>

      {loading ? (
        <p className="text-gray-400">Lädt…</p>
      ) : (
        <>
          <DataTable columns={columns} rows={pageItems} rowKey={(o) => o.id} />
          <Pagination
            hasPrevious={page > 0}
            hasNext={page < pageCount - 1}
            onPrevious={() => setPage((p) => Math.max(0, p - 1))}
            onNext={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            pageLabel={`Seite ${page + 1} von ${pageCount} (${filtered.length} Bestellungen)`}
          />
        </>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={
          pendingDelete?.kind === 'all'
            ? 'Alle Bestellungen löschen'
            : pendingDelete?.kind === 'bulk'
              ? 'Ausgewählte Bestellungen löschen'
              : 'Bestellung löschen'
        }
        message={
          pendingDelete?.kind === 'all'
            ? 'Wirklich ALLE Bestellungen unwiderruflich löschen? Dies betrifft auch Bestellungen außerhalb der aktuellen Filter.'
            : pendingDelete?.kind === 'bulk'
              ? `${pendingDelete.ids.length} ausgewählte Bestellungen wirklich löschen?`
              : pendingDelete?.kind === 'single'
                ? `Bestellung von "${pendingDelete.order.employeeName}" über "${pendingDelete.order.articleName}" wirklich löschen?`
                : ''
        }
        confirmLabel="Löschen"
        onConfirm={async () => {
          if (!pendingDelete) return
          if (pendingDelete.kind === 'single') await deleteOrder(pendingDelete.order.id)
          else if (pendingDelete.kind === 'bulk') {
            await deleteOrders(pendingDelete.ids)
            selection.clear()
          } else if (pendingDelete.kind === 'all') {
            await deleteAllOrders()
            selection.clear()
          }
          setPendingDelete(null)
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
