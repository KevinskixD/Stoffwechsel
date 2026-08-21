import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FilterDateInput } from '../../shared/components/FilterDateInput'
import { FilterField } from '../../shared/components/FilterField'
import { FilterSelect } from '../../shared/components/FilterSelect'
import { PageHeader } from '../../shared/components/PageHeader'
import { SearchInput } from '../../shared/components/SearchInput'
import { useDebounce } from '../../shared/hooks/useDebounce'
import { formatDateTimeDe } from '../../shared/utils/date'
import { matchesAllTokens } from '../../shared/utils/search'
import type { OrderHistoryAction } from '../../types/orderHistory'
import { useOrderHistory } from './hooks'

const ACTION_LABELS: Record<OrderHistoryAction, string> = {
  created: 'Erstellt',
  updated: 'Bearbeitet',
  status_changed: 'Statusänderung',
  exchanged: 'Umgetauscht',
}

const ACTION_COLORS: Record<OrderHistoryAction, { bg: string; fg: string }> = {
  created: { bg: 'var(--color-badge-green-bg)', fg: 'var(--color-badge-green-fg)' },
  status_changed: { bg: 'var(--color-badge-amber-bg)', fg: 'var(--color-badge-amber-fg)' },
  updated: { bg: 'var(--color-badge-neutral-bg)', fg: 'var(--color-badge-neutral-fg)' },
  exchanged: { bg: 'var(--color-badge-red-bg)', fg: 'var(--color-badge-red-fg)' },
}

function ActionBadge({ action }: { action: OrderHistoryAction }) {
  const c = ACTION_COLORS[action]
  return (
    <span
      className="inline-block shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ backgroundColor: c.bg, color: c.fg }}
    >
      {ACTION_LABELS[action]}
    </span>
  )
}

function withinRange(date: Date, dateFrom: string, dateTo: string): boolean {
  if (dateFrom && date < new Date(`${dateFrom}T00:00:00`)) return false
  if (dateTo && date > new Date(`${dateTo}T23:59:59.999`)) return false
  return true
}

export function OrderHistoryPage() {
  const { data: entries, loading } = useOrderHistory()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [action, setAction] = useState<'' | OrderHistoryAction>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filtered = entries
    .filter((e) => (action ? e.action === action : true))
    .filter((e) => withinRange(e.createdAt, dateFrom, dateTo))
    .filter((e) => matchesAllTokens(debouncedSearch, e.employeeName, e.articleName))

  return (
    <div className="px-4 pt-[4.5rem] pb-10 lg:px-11 lg:pt-9 lg:pb-15">
      <PageHeader title="Verlauf" subtitle="Erstellung, Bearbeitung und Statusänderungen aller Bestellungen" />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <FilterSelect label="Ereignis" value={action} onChange={(v) => setAction(v as '' | OrderHistoryAction)}>
          <option value="">Alle</option>
          <option value="created">Erstellt</option>
          <option value="updated">Bearbeitet</option>
          <option value="status_changed">Statusänderung</option>
          <option value="exchanged">Umgetauscht</option>
        </FilterSelect>
        <FilterField label="Von">
          <FilterDateInput value={dateFrom} onChange={setDateFrom} />
        </FilterField>
        <FilterField label="Bis">
          <FilterDateInput value={dateTo} onChange={setDateTo} />
        </FilterField>
        <FilterField label="Suche">
          <SearchInput value={search} onChange={setSearch} placeholder="Mitarbeiter oder Artikel…" />
        </FilterField>
      </div>

      {loading ? (
        <p className="text-gray-400">Lädt…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-black/[0.08] bg-surface p-4 text-[13.5px] text-black/55">
          Keine Einträge vorhanden.
        </p>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-black/[0.08] bg-surface p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <ActionBadge action={entry.action} />
                  <span className="text-[13.5px] font-bold text-gray-900">{entry.employeeName}</span>
                  <span className="text-[13.5px] text-black/45">·</span>
                  <span className="text-[13.5px] text-black/70">{entry.articleName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-black/45">{formatDateTimeDe(entry.createdAt)}</span>
                  <Link to={`/orders/${entry.orderId}/edit`} className="text-xs font-semibold text-brand hover:underline">
                    Bestellung öffnen
                  </Link>
                </div>
              </div>
              {entry.changes.length > 0 ? (
                <ul className="space-y-1 text-[13px] text-black/70">
                  {entry.changes.map((change) => (
                    <li key={change.field}>
                      <span className="font-semibold text-black/55">{change.label}:</span>{' '}
                      {change.from ? (
                        <>
                          {change.from} <span className="text-black/35">→</span> {change.to}
                        </>
                      ) : (
                        change.to
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
