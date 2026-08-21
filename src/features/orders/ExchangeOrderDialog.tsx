import { Fragment, useState } from 'react'
import { Autocomplete, type AutocompleteOption } from '../../shared/components/Autocomplete'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog'
import { formInputClass } from '../../shared/components/FormField'
import { articleDisplayLabel } from '../../types/article'
import type { Article } from '../../types/article'
import type { Order } from '../../types/order'
import type { OrderStatus } from '../../types/orderStatus'
import { exchangeOrder } from './api'

const EXCHANGE_STATUS_NAME = 'Umtausch'
const DEFAULT_NEW_STATUS_NAME = 'Abgeholt'

interface ExchangeOrderDialogProps {
  open: boolean
  order: Order | null
  articles: Article[]
  orderStatuses: OrderStatus[]
  onDone: () => void
  onCancel: () => void
}

export function ExchangeOrderDialog({ open, order, articles, orderStatuses, onDone, onCancel }: ExchangeOrderDialogProps) {
  const [newArticleId, setNewArticleId] = useState('')
  const [newStatusId, setNewStatusId] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmNegativeStock, setConfirmNegativeStock] = useState(false)

  const activeStatuses = orderStatuses.filter((s) => s.active)
  const exchangeStatus = orderStatuses.find((s) => s.name === EXCHANGE_STATUS_NAME)
  const selectedNewArticle = articles.find((a) => a.id === newArticleId)
  const effectiveNewStatusId =
    newStatusId || activeStatuses.find((s) => s.name === DEFAULT_NEW_STATUS_NAME)?.id || activeStatuses[0]?.id || ''
  const selectedNewStatus = activeStatuses.find((s) => s.id === effectiveNewStatusId)

  if (!open || !order) return null
  const currentOrder = order

  const articleOptions: AutocompleteOption<null>[] = articles
    .filter((a) => a.id !== currentOrder.articleId && (a.active || a.id === newArticleId))
    .map((a) => ({ value: a.id, label: articleDisplayLabel(a), data: null }))

  const valid = Boolean(selectedNewArticle && selectedNewStatus && exchangeStatus)

  function reset() {
    setNewArticleId('')
    setNewStatusId('')
    setConfirmNegativeStock(false)
  }

  async function doExchange() {
    if (!selectedNewArticle || !selectedNewStatus || !exchangeStatus) return
    setBusy(true)
    try {
      await exchangeOrder({
        oldOrderId: currentOrder.id,
        newArticleId: selectedNewArticle.id,
        newArticleName: selectedNewArticle.articleName,
        newArticleNumber: selectedNewArticle.articleNumber,
        newArticleSize: selectedNewArticle.size,
        newPickupLocationName: selectedNewArticle.pickupLocationName,
        newStatusId: selectedNewStatus.id,
        newStatus: selectedNewStatus.name,
        exchangeStatusId: exchangeStatus.id,
        exchangeStatusName: exchangeStatus.name,
      })
      reset()
      onDone()
    } finally {
      setBusy(false)
    }
  }

  function handleConfirmClick() {
    if (!valid || !selectedNewArticle) return
    const projected = selectedNewArticle.trackInventory ? selectedNewArticle.inventoryQuantity - currentOrder.quantity : null
    if (projected !== null && projected < 0) {
      setConfirmNegativeStock(true)
      return
    }
    void doExchange()
  }

  return (
    <Fragment>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.45)] p-4" onClick={onCancel}>
        <div
          className="w-full max-w-sm rounded-2xl bg-surface p-7 shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
          onClick={(e) => e.stopPropagation()}
        >
        <h2 className="text-[17px] font-extrabold text-gray-900">Bestellung umtauschen</h2>
        <p className="mt-1 text-[13px] text-black/55">
          {`${articleDisplayLabel(order)} · Menge ${order.quantity} für ${order.employeeName}`}
        </p>

        {!exchangeStatus ? (
          <p className="mt-4 text-[13px] font-semibold text-red-600">
            Status "Umtausch" wurde nicht gefunden – bitte in den Einstellungen anlegen.
          </p>
        ) : null}

        <label className="mt-4 block text-[13px] font-semibold text-black/70">Neuer Artikel</label>
        <div className="mt-1.5">
          <Autocomplete
            options={articleOptions}
            value={newArticleId || null}
            onChange={(value) => setNewArticleId(value)}
            placeholder="Ersatzartikel auswählen…"
          />
        </div>
        {selectedNewArticle?.trackInventory ? (
          <p className="mt-1 text-[12.5px] text-black/45">
            Lagerbestand: {selectedNewArticle.inventoryQuantity}
            {' · nach dem Umtausch: '}
            <span
              className={selectedNewArticle.inventoryQuantity - order.quantity < 0 ? 'font-bold text-red-600' : undefined}
            >
              {selectedNewArticle.inventoryQuantity - order.quantity}
            </span>
          </p>
        ) : null}

        <label className="mt-4 block text-[13px] font-semibold text-black/70">Status der neuen Bestellung</label>
        <select
          value={effectiveNewStatusId}
          onChange={(e) => setNewStatusId(e.target.value)}
          className={`mt-1.5 ${formInputClass}`}
        >
          {activeStatuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <div className="mt-6 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={() => {
              reset()
              onCancel()
            }}
            className="rounded-lg border border-black/[0.12] px-4.5 py-2.5 text-[13.5px] font-bold text-gray-900"
          >
            Abbrechen
          </button>
          <button
            type="button"
            disabled={!valid || busy}
            onClick={handleConfirmClick}
            className="rounded-lg bg-brand px-4.5 py-2.5 text-[13.5px] font-bold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            Umtauschen
          </button>
        </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmNegativeStock}
        title="Bestand würde negativ werden"
        message={
          selectedNewArticle
            ? `Der Lagerbestand von "${selectedNewArticle.articleName}" würde auf ${selectedNewArticle.inventoryQuantity - order.quantity} sinken. Trotzdem umtauschen?`
            : ''
        }
        confirmLabel="Trotzdem umtauschen"
        onConfirm={() => {
          setConfirmNegativeStock(false)
          void doExchange()
        }}
        onCancel={() => setConfirmNegativeStock(false)}
      />
    </Fragment>
  )
}
