import { useState } from 'react'
import type { Order } from '../../types/order'
import { renderBestellMailText } from './bestellMailText'

interface BestellMailPreviewDialogProps {
  open: boolean
  orders: Order[]
  onClose: () => void
}

export function BestellMailPreviewDialog({ open, orders, onClose }: BestellMailPreviewDialogProps) {
  const [copied, setCopied] = useState(false)

  if (!open) return null

  const text = renderBestellMailText(orders)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.45)] p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bestell-mail-title"
        className="w-full max-w-2xl rounded-2xl bg-surface p-7 shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="bestell-mail-title" className="text-[17px] font-extrabold text-gray-900">
          Mailtext zur Bestellliste
        </h2>
        <p className="mt-1 text-[13px] text-black/55">
          Die Bestelldatei wurde erstellt. Diesen Text kannst du direkt in die E-Mail kopieren.
        </p>

        <textarea
          readOnly
          value={text}
          rows={exchangeOrdersCount(orders) > 0 ? 15 : 10}
          className="mt-4 w-full resize-y rounded-lg border border-black/[0.14] bg-black/[0.02] p-3 font-mono text-[13px] leading-5 text-gray-900 focus:border-brand focus:outline-none"
        />

        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(text)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className="rounded-lg border border-black/[0.12] px-4.5 py-2.5 text-[13.5px] font-bold text-gray-900"
            >
              Kopieren
            </button>
            {copied ? <span className="text-[13px] font-semibold text-brand">Kopiert!</span> : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-brand px-4.5 py-2.5 text-[13.5px] font-bold text-white hover:bg-brand-dark"
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  )
}

function exchangeOrdersCount(orders: Order[]): number {
  return orders.filter((order) => order.exchangedFromOrderId).length
}
