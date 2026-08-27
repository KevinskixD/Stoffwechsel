import { getDocs } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog'
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable'
import { EditableCell } from '../../shared/components/EditableCell'
import { FilterDateInput } from '../../shared/components/FilterDateInput'
import { FilterField } from '../../shared/components/FilterField'
import { FilterSelect } from '../../shared/components/FilterSelect'
import { PageHeader, PrimaryLinkButton } from '../../shared/components/PageHeader'
import { Pagination } from '../../shared/components/Pagination'
import { SearchInput } from '../../shared/components/SearchInput'
import { useToast } from '../../shared/components/ToastProvider'
import { useDebounce } from '../../shared/hooks/useDebounce'
import { useRowSelection } from '../../shared/hooks/useRowSelection'
import { formatDateDe } from '../../shared/utils/date'
import { matchesAllTokens } from '../../shared/utils/search'
import { statusColors } from '../../shared/utils/statusColors'
import { articleDisplayLabel } from '../../types/article'
import { employeeDisplayName } from '../../types/employee'
import type { Order } from '../../types/order'
import { useArticles } from '../articles/hooks'
import { generateBestelldateien } from '../bestellFormular/generate'
import { useBestellFormularSettings } from '../bestellFormular/hooks'
import { useEmployees } from '../employees/hooks'
import { useOrderListSettings } from '../orderListSettings/hooks'
import { useOrderStatuses } from '../orderStatuses/hooks'
import { ExchangeOrderDialog } from './ExchangeOrderDialog'
import {
  deleteAllOrders,
  deleteOrder,
  deleteOrders,
  ordersQuery,
  updateOrderArticleNames,
  updateOrderDate,
  updateOrderEmployeeNames,
  updateOrderPickupLocationNames,
  updateOrderQuantity,
  updateOrderStatus,
  updateOrdersStatus,
} from './api'
import { useOrders } from './hooks'

const PAGE_SIZE = 25

/** Only orders in this status can be exchanged — same literal-name convention as ORDERED_STATUS_NAME in api.ts. */
const PICKED_UP_STATUS_NAME = 'Abgeholt'

type PendingDelete = { kind: 'single'; order: Order } | { kind: 'bulk'; ids: string[] } | { kind: 'all' }

export function OrderListPage() {
  const { showToast } = useToast()
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
  const [bestellConfirmOrders, setBestellConfirmOrders] = useState<Order[] | null>(null)
  const [bestellBusy, setBestellBusy] = useState(false)
  const [pendingNameSync, setPendingNameSync] = useState<{ id: string; employeeName: string }[] | null>(null)
  const [pendingPickupLocationSync, setPendingPickupLocationSync] = useState<
    { id: string; pickupLocationName: string }[] | null
  >(null)
  const [pendingArticleSync, setPendingArticleSync] = useState<
    { id: string; articleName: string; articleNumber: string }[] | null
  >(null)
  const [pendingQuantityConfirm, setPendingQuantityConfirm] = useState<{
    order: Order
    quantity: number
    projected: number
    resolve: (ok: boolean) => void
  } | null>(null)
  const [exchangingOrder, setExchangingOrder] = useState<Order | null>(null)

  const { data: rawOrders, loading } = useOrders({
    employeeId: employeeId || undefined,
    articleId: articleId || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  })
  const { data: employees } = useEmployees(true)
  const { data: articles } = useArticles(true)
  const { data: activeOrderStatuses } = useOrderStatuses(false)
  const { data: allOrderStatuses } = useOrderStatuses(true)
  const { data: bestellSettings } = useBestellFormularSettings()
  const { data: buttonSettings } = useOrderListSettings()

  const statusOptions = Array.from(new Set(rawOrders.map((o) => o.status))).sort()

  const personnelNumberByEmployeeId = new Map(employees.map((e) => [e.id, e.personnelNumber]))

  const filtered = rawOrders
    .filter((o) => (status ? o.status === status : true))
    .filter((o) =>
      matchesAllTokens(
        debouncedSearch,
        o.employeeName,
        o.articleName,
        o.articleNumber,
        personnelNumberByEmployeeId.get(o.employeeId) ?? '',
      ),
    )

  useEffect(() => {
    setPage(0)
  }, [employeeId, articleId, status, dateFrom, dateTo, debouncedSearch])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const selection = useRowSelection(pageItems)

  async function handleQuantityCommit(order: Order, quantity: number) {
    const article = articles.find((a) => a.id === order.articleId)
    const projected = article?.trackInventory ? article.inventoryQuantity - (quantity - order.quantity) : null
    if (projected !== null && projected < 0) {
      const confirmed = await new Promise<boolean>((resolve) =>
        setPendingQuantityConfirm({ order, quantity, projected, resolve }),
      )
      if (!confirmed) return
    }
    await updateOrderQuantity(order.id, quantity)
  }

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
    {
      key: 'articleName',
      header: 'Artikel',
      render: (o) => (
        <div>
          {articleDisplayLabel(o)}
          {o.exchangedToOrderId ? (
            <Link
              to={`/orders/${o.exchangedToOrderId}/edit`}
              className="block text-xs font-semibold text-black/45 hover:underline"
            >
              → umgetauscht zu {o.exchangedToArticleName}
            </Link>
          ) : null}
          {o.exchangedFromOrderId ? (
            <Link
              to={`/orders/${o.exchangedFromOrderId}/edit`}
              className="block text-xs font-semibold text-black/45 hover:underline"
            >
              ← Umtausch von {o.exchangedFromArticleName}
            </Link>
          ) : null}
        </div>
      ),
    },
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
            if (Number.isInteger(n) && n > 0) void handleQuantityCommit(o, n)
          }}
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (o) => {
        const c = statusColors(allOrderStatuses.find((s) => s.id === o.statusId) ?? { name: o.status })
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
          {o.status === PICKED_UP_STATUS_NAME && !o.exchangedToOrderId ? (
            <button
              type="button"
              onClick={() => setExchangingOrder(o)}
              className="text-brand hover:underline"
            >
              Umtausch
            </button>
          ) : null}
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

  const bestellTriggerStatus = allOrderStatuses.find((s) => s.id === bestellSettings.triggerStatusId)
  const bestellTargetStatus = allOrderStatuses.find((s) => s.id === bestellSettings.targetStatusId)

  function bestellFilePreviewCount(orders: Order[]): number {
    const upperCapacity = bestellSettings.upperTable.endRow - bestellSettings.upperTable.startRow + 1
    const lowerCapacity = bestellSettings.lowerTable.endRow - bestellSettings.lowerTable.startRow + 1
    const upperCount = orders.filter((o) => o.articleNumber !== '').length
    const lowerCount = orders.filter((o) => o.articleNumber === '').length
    const upperPages = upperCapacity > 0 ? Math.ceil(upperCount / upperCapacity) : 0
    const lowerPages = lowerCapacity > 0 ? Math.ceil(lowerCount / lowerCapacity) : 0
    return Math.max(upperPages, lowerPages)
  }

  async function handleGenerateBestelldateiClick() {
    if (!bestellSettings.templateBase64) {
      showToast('Keine Vorlage konfiguriert. Siehe Einstellungen → Bestellformular.', 'error')
      return
    }
    if (!bestellTriggerStatus) {
      showToast('Kein auslösender Status konfiguriert. Siehe Einstellungen → Bestellformular.', 'error')
      return
    }
    setBestellBusy(true)
    const snapshot = await getDocs(ordersQuery({ status: bestellTriggerStatus.name }))
    setBestellBusy(false)
    const matchingOrders = snapshot.docs.map((d) => d.data())
    if (matchingOrders.length === 0) {
      showToast(`Keine Bestellungen mit Status "${bestellTriggerStatus.name}" gefunden.`, 'info')
      return
    }
    setBestellConfirmOrders(matchingOrders)
  }

  async function handleConfirmGenerateBestelldatei() {
    if (!bestellConfirmOrders) return
    setBestellBusy(true)
    const result = await generateBestelldateien(bestellConfirmOrders, bestellSettings, articles)
    if (bestellTargetStatus) {
      await updateOrdersStatus(result.includedOrderIds, bestellTargetStatus.id, bestellTargetStatus.name)
    }
    setBestellBusy(false)
    setBestellConfirmOrders(null)
    showToast(
      `${result.fileCount} Datei(en) erzeugt, ${result.includedOrderIds.length} Bestellung(en)` +
        (bestellTargetStatus ? ` auf "${bestellTargetStatus.name}" gesetzt.` : '.'),
      'success',
    )
  }

  function handleSyncEmployeeNamesClick() {
    const employeeById = new Map(employees.map((e) => [e.id, e]))
    const mismatches = rawOrders
      .map((o) => {
        const employee = employeeById.get(o.employeeId)
        if (!employee) return null
        const correctName = employeeDisplayName(employee)
        return correctName !== o.employeeName ? { id: o.id, employeeName: correctName } : null
      })
      .filter((x): x is { id: string; employeeName: string } => x !== null)

    if (mismatches.length === 0) {
      showToast('Alle geladenen Bestellungen sind mit den aktuellen Mitarbeiternamen synchron.', 'info')
      return
    }
    setPendingNameSync(mismatches)
  }

  async function handleConfirmSyncEmployeeNames() {
    if (!pendingNameSync) return
    await updateOrderEmployeeNames(pendingNameSync)
    showToast(`${pendingNameSync.length} Bestellung(en) aktualisiert.`, 'success')
    setPendingNameSync(null)
  }

  function handleSyncPickupLocationsClick() {
    const articleById = new Map(articles.map((a) => [a.id, a]))
    const mismatches = rawOrders
      .map((o) => {
        const article = articleById.get(o.articleId)
        if (!article) return null
        return article.pickupLocationName !== o.pickupLocationName
          ? { id: o.id, pickupLocationName: article.pickupLocationName }
          : null
      })
      .filter((x): x is { id: string; pickupLocationName: string } => x !== null)

    if (mismatches.length === 0) {
      showToast('Alle geladenen Bestellungen sind mit den aktuellen Abholorten synchron.', 'info')
      return
    }
    setPendingPickupLocationSync(mismatches)
  }

  async function handleConfirmSyncPickupLocations() {
    if (!pendingPickupLocationSync) return
    await updateOrderPickupLocationNames(pendingPickupLocationSync)
    showToast(`${pendingPickupLocationSync.length} Bestellung(en) aktualisiert.`, 'success')
    setPendingPickupLocationSync(null)
  }

  function handleSyncArticleNamesClick() {
    const articleById = new Map(articles.map((a) => [a.id, a]))
    const mismatches = rawOrders
      .map((o) => {
        const article = articleById.get(o.articleId)
        if (!article) return null
        return article.articleName !== o.articleName || article.articleNumber !== o.articleNumber
          ? { id: o.id, articleName: article.articleName, articleNumber: article.articleNumber }
          : null
      })
      .filter((x): x is { id: string; articleName: string; articleNumber: string } => x !== null)

    if (mismatches.length === 0) {
      showToast('Alle geladenen Bestellungen sind mit den aktuellen Artikeldaten synchron.', 'info')
      return
    }
    setPendingArticleSync(mismatches)
  }

  async function handleConfirmSyncArticleNames() {
    if (!pendingArticleSync) return
    await updateOrderArticleNames(pendingArticleSync)
    showToast(`${pendingArticleSync.length} Bestellung(en) aktualisiert.`, 'success')
    setPendingArticleSync(null)
  }

  return (
    <div className="px-4 pt-[4.5rem] pb-10 lg:px-11 lg:pt-9 lg:pb-15">
      <PageHeader
        title="Bestellungen"
        subtitle="Bestellte und ausgegebene Uniformteile pro Mitarbeiter"
        action={
          <>
            {buttonSettings.showExcelImport ? (
              <Link
                to="/orders/import"
                className="rounded-lg border border-black/[0.12] px-4 py-2.5 text-[13.5px] font-bold text-gray-900"
              >
                Excel-Import
              </Link>
            ) : null}
            {buttonSettings.showEmployeeNameSync ? (
              <button
                type="button"
                onClick={handleSyncEmployeeNamesClick}
                title="Aktualisiert den gespeicherten Mitarbeiternamen auf allen aktuell geladenen Bestellungen (respektiert die Filter oben) anhand der aktuellen Mitarbeiterdaten."
                className="rounded-lg border border-black/[0.12] px-4 py-2.5 text-[13.5px] font-bold text-gray-900"
              >
                Mitarbeiternamen abgleichen
              </button>
            ) : null}
            {buttonSettings.showPickupLocationSync ? (
              <button
                type="button"
                onClick={handleSyncPickupLocationsClick}
                title="Aktualisiert den gespeicherten Abholort auf allen aktuell geladenen Bestellungen (respektiert die Filter oben) anhand der aktuellen Artikeldaten."
                className="rounded-lg border border-black/[0.12] px-4 py-2.5 text-[13.5px] font-bold text-gray-900"
              >
                Abholorte abgleichen
              </button>
            ) : null}
            {buttonSettings.showArticleDataSync ? (
              <button
                type="button"
                onClick={handleSyncArticleNamesClick}
                title="Aktualisiert Artikelbezeichnung und Artikelnummer auf allen aktuell geladenen Bestellungen (respektiert die Filter oben) anhand der aktuellen Artikeldaten."
                className="rounded-lg border border-black/[0.12] px-4 py-2.5 text-[13.5px] font-bold text-gray-900"
              >
                Artikeldaten abgleichen
              </button>
            ) : null}
            {buttonSettings.showGenerateBestellFile ? (
              <button
                type="button"
                onClick={() => void handleGenerateBestelldateiClick()}
                disabled={bestellBusy}
                className="rounded-lg border border-black/[0.12] px-4 py-2.5 text-[13.5px] font-bold text-gray-900 disabled:opacity-50"
              >
                Bestelldatei generieren
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setPendingDelete({ kind: 'all' })}
              className="rounded-lg border border-red-300 px-4 py-2.5 text-[13.5px] font-bold text-red-600"
            >
              Alle löschen
            </button>
            <Link
              to="/orders/starter-kit"
              className="rounded-lg border border-black/[0.12] px-4 py-2.5 text-[13.5px] font-bold text-gray-900"
            >
              Basisausrüstung bestellen
            </Link>
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
          <FilterDateInput value={dateFrom} onChange={setDateFrom} />
        </FilterField>
        <FilterField label="Bis">
          <FilterDateInput value={dateTo} onChange={setDateTo} />
        </FilterField>
        <FilterField label="Suche">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Mitarbeiter, Personalnummer, Artikel oder Artikelnummer…"
          />
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
          <DataTable
            columns={columns}
            rows={pageItems}
            rowKey={(o) => o.id}
            onRowClick={(o, ev) => selection.toggleRowClick(o.id, ev.shiftKey)}
            isRowSelected={(o) => selection.selectedIds.has(o.id)}
          />
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

      <ConfirmDialog
        open={bestellConfirmOrders !== null}
        title="Bestelldatei generieren"
        message={
          bestellConfirmOrders
            ? `${bestellConfirmOrders.length} Bestellung(en) mit Status "${bestellTriggerStatus?.name}" werden in ` +
              `${bestellFilePreviewCount(bestellConfirmOrders)} Datei(en) exportiert` +
              (bestellTargetStatus ? ` und auf "${bestellTargetStatus.name}" gesetzt.` : '.')
            : ''
        }
        confirmLabel="Generieren"
        onConfirm={() => void handleConfirmGenerateBestelldatei()}
        onCancel={() => setBestellConfirmOrders(null)}
      />

      <ConfirmDialog
        open={pendingNameSync !== null}
        title="Mitarbeiternamen abgleichen"
        message={
          pendingNameSync
            ? `${pendingNameSync.length} Bestellung(en) haben einen abweichenden Mitarbeiternamen und werden auf die aktuellen Mitarbeiterdaten aktualisiert.`
            : ''
        }
        confirmLabel="Aktualisieren"
        onConfirm={() => void handleConfirmSyncEmployeeNames()}
        onCancel={() => setPendingNameSync(null)}
      />

      <ConfirmDialog
        open={pendingPickupLocationSync !== null}
        title="Abholorte abgleichen"
        message={
          pendingPickupLocationSync
            ? `${pendingPickupLocationSync.length} Bestellung(en) haben einen abweichenden Abholort und werden auf die aktuellen Artikeldaten aktualisiert.`
            : ''
        }
        confirmLabel="Aktualisieren"
        onConfirm={() => void handleConfirmSyncPickupLocations()}
        onCancel={() => setPendingPickupLocationSync(null)}
      />

      <ConfirmDialog
        open={pendingQuantityConfirm !== null}
        title="Bestand würde negativ werden"
        message={
          pendingQuantityConfirm
            ? `Der Lagerbestand von "${pendingQuantityConfirm.order.articleName}" würde auf ${pendingQuantityConfirm.projected} sinken. Trotzdem speichern?`
            : ''
        }
        confirmLabel="Trotzdem speichern"
        onConfirm={() => {
          pendingQuantityConfirm?.resolve(true)
          setPendingQuantityConfirm(null)
        }}
        onCancel={() => {
          pendingQuantityConfirm?.resolve(false)
          setPendingQuantityConfirm(null)
        }}
      />

      <ConfirmDialog
        open={pendingArticleSync !== null}
        title="Artikeldaten abgleichen"
        message={
          pendingArticleSync
            ? `${pendingArticleSync.length} Bestellung(en) haben eine abweichende Artikelbezeichnung oder -nummer und werden auf die aktuellen Artikeldaten aktualisiert.`
            : ''
        }
        confirmLabel="Aktualisieren"
        onConfirm={() => void handleConfirmSyncArticleNames()}
        onCancel={() => setPendingArticleSync(null)}
      />

      <ExchangeOrderDialog
        open={exchangingOrder !== null}
        order={exchangingOrder}
        articles={articles}
        orderStatuses={allOrderStatuses}
        onDone={() => setExchangingOrder(null)}
        onCancel={() => setExchangingOrder(null)}
      />
    </div>
  )
}
