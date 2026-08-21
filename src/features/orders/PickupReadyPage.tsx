import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../shared/components/PageHeader'
import type { NotificationLineData } from '../../shared/utils/notificationTemplate'
import type { Order } from '../../types/order'
import { useArticles } from '../articles/hooks'
import { useNotificationSettings } from '../notificationSettings/hooks'
import { useOrderStatuses } from '../orderStatuses/hooks'
import { NotificationPreviewDialog } from './NotificationPreviewDialog'
import { useOrders } from './hooks'

interface EmployeeGroup {
  employeeId: string
  employeeName: string
  orders: Order[]
}

export function PickupReadyPage() {
  const { data: settings, loading: settingsLoading } = useNotificationSettings()
  const { data: rawOrders, loading: ordersLoading } = useOrders({})
  const { data: articles } = useArticles(true)
  const { data: statuses } = useOrderStatuses(true)
  const [openGroupId, setOpenGroupId] = useState<string | null>(null)

  const articlesById = new Map(articles.map((a) => [a.id, a]))
  const targetStatusName = statuses.find((s) => s.id === settings.targetStatusId)?.name ?? ''

  const readyOrders = settings.triggerStatusId
    ? rawOrders.filter((o) => o.statusId === settings.triggerStatusId)
    : []

  const groupsById = new Map<string, EmployeeGroup>()
  for (const order of readyOrders) {
    const existing = groupsById.get(order.employeeId)
    if (existing) existing.orders.push(order)
    else groupsById.set(order.employeeId, { employeeId: order.employeeId, employeeName: order.employeeName, orders: [order] })
  }
  const groups = Array.from(groupsById.values()).sort((a, b) => a.employeeName.localeCompare(b.employeeName))
  const openGroup = groups.find((g) => g.employeeId === openGroupId) ?? null

  function lineDataFor(order: Order): NotificationLineData {
    const article = articlesById.get(order.articleId)
    return {
      quantity: order.quantity,
      articleName: order.articleName,
      articleSize: order.articleSize || article?.size || '',
      pickupLocationName: order.pickupLocationName || article?.pickupLocationName || '',
    }
  }

  const loading = settingsLoading || ordersLoading

  return (
    <div className="px-4 pt-[4.5rem] pb-10 lg:px-11 lg:pt-9 lg:pb-15">
      <PageHeader title="Abholbereit" subtitle="Offene Abholungen pro Mitarbeiter, gruppiert nach Person" />

      {!settingsLoading && !settings.triggerStatusId ? (
        <p className="rounded-lg border border-black/[0.08] bg-surface p-4 text-[13.5px] text-black/55">
          Kein Auslöse-Status konfiguriert.{' '}
          <Link to="/settings/notifications" className="font-semibold text-brand hover:underline">
            In den Einstellungen festlegen
          </Link>
          .
        </p>
      ) : loading ? (
        <p className="text-gray-400">Lädt…</p>
      ) : groups.length === 0 ? (
        <p className="rounded-lg border border-black/[0.08] bg-surface p-4 text-[13.5px] text-black/55">
          Aktuell keine offenen Abholungen.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.employeeId} className="rounded-xl border border-black/[0.08] bg-surface p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[15px] font-extrabold text-gray-900">{group.employeeName}</h2>
                <button
                  type="button"
                  onClick={() => setOpenGroupId(group.employeeId)}
                  className="rounded-lg bg-brand px-4 py-2 text-[13px] font-bold text-white hover:bg-brand-dark"
                >
                  Notifizierung erstellen
                </button>
              </div>
              <ul className="space-y-1 text-[13.5px] text-gray-900">
                {group.orders.map((order) => {
                  const line = lineDataFor(order)
                  return (
                    <li key={order.id} className="text-black/70">
                      {line.quantity}x {line.articleName}
                      {line.pickupLocationName ? ` (${line.pickupLocationName})` : ''}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      <NotificationPreviewDialog
        open={openGroup !== null}
        employeeName={openGroup?.employeeName ?? ''}
        orderIds={openGroup?.orders.map((o) => o.id) ?? []}
        lines={openGroup?.orders.map(lineDataFor) ?? []}
        greetingTemplate={settings.greetingTemplate}
        lineTemplate={settings.lineTemplate}
        targetStatusId={settings.targetStatusId}
        targetStatusName={targetStatusName}
        onConfirmed={() => setOpenGroupId(null)}
        onCancel={() => setOpenGroupId(null)}
      />
    </div>
  )
}
