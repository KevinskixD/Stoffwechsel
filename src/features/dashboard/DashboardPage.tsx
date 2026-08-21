import { Link } from 'react-router-dom'
import { StatusBadge } from '../../shared/components/StatusBadge'
import { formatDateDe } from '../../shared/utils/date'
import type { Order } from '../../types/order'
import { useArticles } from '../articles/hooks'
import { useNotificationSettings } from '../notificationSettings/hooks'
import { useOrderStatuses } from '../orderStatuses/hooks'
import { useOrders } from '../orders/hooks'

function countByStatus(orders: Order[], statusName: string) {
  return orders.filter((o) => o.status === statusName).length
}

export function DashboardPage() {
  const { data: orders, loading: ordersLoading } = useOrders({})
  const { data: articles, loading: articlesLoading } = useArticles(false)
  const { data: statuses, loading: statusesLoading } = useOrderStatuses(false)
  const { data: allStatuses } = useOrderStatuses(true)
  const { data: notificationSettings, loading: settingsLoading } = useNotificationSettings()

  const loading = ordersLoading || articlesLoading || statusesLoading || settingsLoading

  // Mirrors PickupReadyPage: "Abholbereit" means the configured trigger status, not any
  // hardcoded status name — trigger/target status names are fully user-editable data.
  const pickupReadyCount = notificationSettings.triggerStatusId
    ? orders.filter((o) => o.statusId === notificationSettings.triggerStatusId).length
    : 0

  const kpis = [
    {
      label: 'Zu Bestellen',
      value: countByStatus(orders, 'Zu Bestellen'),
      delta: 'warten auf Bestellung',
      deltaColor: 'var(--color-badge-red-fg)',
    },
    {
      label: 'Bestellt',
      value: countByStatus(orders, 'Bestellt'),
      delta: 'bei Lieferant',
      deltaColor: 'var(--color-badge-amber-fg)',
    },
    {
      label: 'Abholbereit',
      value: pickupReadyCount,
      delta: 'warten auf Abholung',
      deltaColor: 'var(--color-badge-green-fg)',
    },
    {
      label: 'Artikel im Sortiment',
      value: articles.length,
      delta: 'aktive Artikel',
      deltaColor: 'rgba(0,0,0,0.45)',
    },
  ]

  const recentOrders = orders.slice(0, 5)

  return (
    <div className="p-9 pb-16">
      <div className="mb-7">
        <h1 className="mb-1.5 text-2xl font-extrabold text-gray-900">Übersicht</h1>
        <p className="text-sm text-black/50">Aktueller Stand der Uniformverwaltung</p>
      </div>

      {loading ? (
        <p className="text-gray-400">Lädt…</p>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-4 gap-4">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="flex flex-col gap-2 rounded-xl border border-black/[0.08] bg-surface p-5">
                <span className="text-xs font-bold uppercase tracking-wide text-black/45">{kpi.label}</span>
                <span className="text-3xl font-extrabold text-gray-900">{kpi.value}</span>
                <span className="text-xs font-semibold" style={{ color: kpi.deltaColor }}>
                  {kpi.delta}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[1.4fr_1fr] gap-5">
            <div className="rounded-xl border border-black/[0.08] bg-surface p-6">
              <h3 className="mb-4 text-base font-extrabold text-gray-900">Letzte Bestellungen</h3>
              {recentOrders.length === 0 ? (
                <p className="text-sm text-black/40">Noch keine Bestellungen.</p>
              ) : (
                <div className="flex flex-col">
                  {recentOrders.map((o) => (
                    <Link
                      key={o.id}
                      to={`/orders/${o.id}/edit`}
                      className="flex items-center justify-between border-b border-black/[0.06] py-2.5 last:border-0"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-gray-900">{o.employeeName}</span>
                        <span className="text-xs text-black/45">
                          {o.articleName} · {formatDateDe(o.orderDate)}
                        </span>
                      </div>
                      <StatusBadge status={o.status} color={allStatuses.find((s) => s.id === o.statusId)?.color} />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3.5 rounded-xl bg-brand p-6 text-white">
              <h3 className="text-base font-extrabold">Bestellungen nach Status</h3>
              {statuses.map((s) => (
                <Link
                  key={s.id}
                  to={`/orders?status=${encodeURIComponent(s.name)}`}
                  className="flex items-center justify-between border-b border-white/20 py-2.5 last:border-0 hover:opacity-80"
                >
                  <span className="text-sm font-semibold">{s.name}</span>
                  <span className="text-sm font-extrabold">{countByStatus(orders, s.name)}</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
