import { useState } from 'react'
import type { NotificationLineData } from '../../shared/utils/notificationTemplate'
import { renderNotificationText } from '../../shared/utils/notificationTemplate'
import { updateOrdersStatus } from './api'

interface NotificationPreviewDialogProps {
  open: boolean
  employeeName: string
  orderIds: string[]
  lines: NotificationLineData[]
  greetingTemplate: string
  lineTemplate: string
  targetStatusId: string
  targetStatusName: string
  onConfirmed: () => void
  onCancel: () => void
}

export function NotificationPreviewDialog({
  open,
  employeeName,
  orderIds,
  lines,
  greetingTemplate,
  lineTemplate,
  targetStatusId,
  targetStatusName,
  onConfirmed,
  onCancel,
}: NotificationPreviewDialogProps) {
  const [copied, setCopied] = useState(false)

  if (!open) return null

  const text = renderNotificationText(greetingTemplate, lineTemplate, employeeName, lines)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.45)] p-4" onClick={onCancel}>
      <div
        className="w-full max-w-lg rounded-2xl bg-surface p-7 shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[17px] font-extrabold text-gray-900">Notifizierung für {employeeName}</h2>
        <p className="mt-1 text-[13px] text-black/55">
          Text kopieren und direkt an die Person schicken. Nach Bestätigung wechseln alle {orderIds.length} Position
          {orderIds.length === 1 ? '' : 'en'} auf „{targetStatusName || '—'}“.
        </p>

        <textarea
          readOnly
          value={text}
          rows={12}
          className="mt-4 w-full rounded-lg border border-black/[0.14] bg-black/[0.02] p-3 font-mono text-[13px] text-gray-900 focus:border-brand focus:outline-none"
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

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-black/[0.12] px-4.5 py-2.5 text-[13.5px] font-bold text-gray-900"
            >
              Abbrechen
            </button>
            <button
              type="button"
              disabled={!targetStatusId}
              title={!targetStatusId ? 'Zielstatus in den Einstellungen konfigurieren' : undefined}
              onClick={async () => {
                await updateOrdersStatus(orderIds, targetStatusId, targetStatusName)
                onConfirmed()
              }}
              className="rounded-lg bg-brand px-4.5 py-2.5 text-[13.5px] font-bold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              OK — als {targetStatusName || '…'} markieren
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
