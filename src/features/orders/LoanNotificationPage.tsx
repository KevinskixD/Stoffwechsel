import { useState } from 'react'
import { PageHeader } from '../../shared/components/PageHeader'
import { formatDateDe } from '../../shared/utils/date'
import { renderNotificationText } from '../../shared/utils/notificationTemplate'
import { hasLoanReturnNotification, type Order } from '../../types/order'
import { useNotificationSettings } from '../notificationSettings/hooks'
import { markLoanOrdersAsNotified } from './api'
import { useOrders } from './hooks'

interface EmployeeGroup {
  employeeId: string
  employeeName: string
  orders: Order[]
}

export function LoanNotificationPage() {
  const { data: orders, loading: ordersLoading } = useOrders({})
  const { data: settings, loading: settingsLoading } = useNotificationSettings()
  const [openGroupId, setOpenGroupId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [confirmedOrderIds, setConfirmedOrderIds] = useState<Set<string>>(new Set())

  const groupsById = new Map<string, EmployeeGroup>()
  for (const order of orders) {
    if (!order.isLoanIssue || order.returnRequired === false || order.returnedDate ||
        hasLoanReturnNotification(order) || confirmedOrderIds.has(order.id)) continue
    const group = groupsById.get(order.employeeId)
    if (group) group.orders.push(order)
    else groupsById.set(order.employeeId, { employeeId: order.employeeId, employeeName: order.employeeName, orders: [order] })
  }
  const groups = Array.from(groupsById.values()).sort((a, b) => a.employeeName.localeCompare(b.employeeName))
  const openGroup = groups.find((group) => group.employeeId === openGroupId) ?? null
  const notificationText = openGroup
    ? renderNotificationText(settings.loanGreetingTemplate, settings.loanLineTemplate, openGroup.employeeName,
        openGroup.orders.map((order) => ({
          quantity: order.quantity,
          articleName: order.articleName,
          articleSize: order.articleSize,
          pickupLocationName: order.pickupLocationName,
          issuedDate: formatDateDe(order.issuedDate || order.orderDate),
        })))
    : ''

  function close() {
    if (saving) return
    setOpenGroupId(null)
    setError('')
    setCopied(false)
  }

  async function confirm() {
    if (!openGroup || saving) return
    setSaving(true)
    setError('')
    try {
      const orderIds = openGroup.orders.map((order) => order.id)
      await markLoanOrdersAsNotified(orderIds, openGroup.employeeName)
      setConfirmedOrderIds((current) => new Set([...current, ...orderIds]))
      closeAfterSave()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Der Kommentar konnte nicht gespeichert werden.')
    } finally {
      setSaving(false)
    }
  }

  function closeAfterSave() {
    setOpenGroupId(null)
    setCopied(false)
  }

  return (
    <div className="px-4 pt-[4.5rem] pb-10 lg:px-11 lg:pt-9 lg:pb-15">
      <PageHeader title="Leihgaben informieren" subtitle="Offene Rückgaben pro Mitarbeiter, gruppiert nach Person" />
      {ordersLoading || settingsLoading ? (
        <p className="text-gray-400">Lädt…</p>
      ) : groups.length === 0 ? (
        <p className="rounded-lg border border-black/[0.08] bg-surface p-4 text-[13.5px] text-black/55">
          Aktuell keine offenen Leihgaben mit Rückgabe.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.employeeId} className="rounded-xl border border-black/[0.08] bg-surface p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-[15px] font-extrabold text-gray-900">{group.employeeName}</h2>
                <button type="button" onClick={() => setOpenGroupId(group.employeeId)}
                  className="rounded-lg bg-brand px-4 py-2 text-[13px] font-bold text-white hover:bg-brand-dark">
                  Notifizierung erstellen
                </button>
              </div>
              <ul className="space-y-1 text-[13.5px] text-black/70">
                {group.orders.map((order) => (
                  <li key={order.id}>
                    {order.quantity}x {order.articleName} · Ausgabe: {formatDateDe(order.issuedDate || order.orderDate)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {openGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.45)] p-4" onClick={close}>
          <div role="dialog" aria-modal="true" aria-labelledby="loan-notification-title"
            className="w-full max-w-lg rounded-2xl bg-surface p-7 shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
            onClick={(event) => event.stopPropagation()}>
            <h2 id="loan-notification-title" className="text-[17px] font-extrabold text-gray-900">
              Rückgabe-Mitteilung für {openGroup.employeeName}
            </h2>
            <p className="mt-1 text-[13px] text-black/55">
              Text kopieren und an die Person schicken. Nach Bestätigung wird die Information mit heutigem Datum
              in allen {openGroup.orders.length} ursprünglichen Bestellungen vermerkt.
            </p>
            <textarea readOnly aria-label="Mitteilungstext" value={notificationText} rows={12}
              className="mt-4 w-full rounded-lg border border-black/[0.14] bg-black/[0.02] p-3 font-mono text-[13px] text-gray-900" />
            {error && <p role="alert" className="mt-3 text-[13px] text-red-700">{error}</p>}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button type="button" onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(notificationText)
                    setCopied(true)
                    setError('')
                  } catch {
                    setError('Kopieren fehlgeschlagen. Bitte den Text manuell kopieren.')
                  }
                }} className="rounded-lg border border-black/[0.12] px-4.5 py-2.5 text-[13.5px] font-bold text-gray-900">
                  Kopieren
                </button>
                {copied && <span className="text-[13px] font-semibold text-brand">Kopiert!</span>}
              </div>
              <div className="flex items-center gap-2.5">
                <button type="button" disabled={saving} onClick={close}
                  className="rounded-lg border border-black/[0.12] px-4.5 py-2.5 text-[13.5px] font-bold text-gray-900 disabled:opacity-50">
                  Abbrechen
                </button>
                <button type="button" disabled={saving} onClick={confirm}
                  className="rounded-lg bg-brand px-4.5 py-2.5 text-[13.5px] font-bold text-white hover:bg-brand-dark disabled:opacity-50">
                  {saving ? 'Speichert…' : 'OK — Information vermerken'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
