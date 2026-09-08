import { useState } from 'react'
import { ChevronDownIcon } from '../../shared/components/icons'
import { PageHeader } from '../../shared/components/PageHeader'
import { CHANGELOG_ENTRIES, type ChangeType } from './changelog'

const CHANGE_TYPE_CONFIG: Record<ChangeType, { label: string; background: string; color: string }> = {
  neu: { label: 'Neu', background: 'var(--color-badge-red-bg)', color: 'var(--color-badge-red-fg)' },
  verbessert: { label: 'Verbessert', background: 'var(--color-badge-amber-bg)', color: 'var(--color-badge-amber-fg)' },
  fix: { label: 'Fix', background: 'var(--color-badge-green-bg)', color: 'var(--color-badge-green-fg)' },
  hinweis: { label: 'Hinweis', background: 'var(--color-badge-neutral-bg)', color: 'var(--color-badge-neutral-fg)' },
}

function formatReleaseDate(date: string) {
  return new Intl.DateTimeFormat('de-AT', { day: '2-digit', month: 'long', year: 'numeric' }).format(
    new Date(`${date}T00:00:00`),
  )
}

export function ChangelogPage() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  return (
    <div className="px-4 pt-[4.5rem] pb-10 lg:px-11 lg:pt-9 lg:pb-15">
      <PageHeader
        title="Versionshistorie"
        subtitle="Neuerungen, Verbesserungen und Fehlerbehebungen der Uniformverwaltung"
      />

      <div className="max-w-3xl pl-8">
        <div className="space-y-3">
          {CHANGELOG_ENTRIES.map((entry, index) => {
            const isCurrent = index === 0
            const isExpanded = isCurrent || Boolean(expanded[entry.version])
            const toggle = () => setExpanded((previous) => ({ ...previous, [entry.version]: !previous[entry.version] }))
            const hasFollowingEntry = index < CHANGELOG_ENTRIES.length - 1

            return (
              <section key={entry.version} className="relative">
                {hasFollowingEntry ? (
                  <span aria-hidden="true" className="absolute top-8 -bottom-11 -left-6 w-px bg-black/[0.10]" />
                ) : null}
                <span
                  aria-hidden="true"
                  className={`absolute rounded-full ${
                    isCurrent
                      ? 'top-[25px] -left-[31px] h-3.5 w-3.5 bg-brand ring-4 ring-brand-tint'
                      : 'top-[27px] -left-[29px] h-2.5 w-2.5 bg-black/25'
                  }`}
                />

                <div className={`rounded-xl border bg-surface ${isCurrent ? 'border-brand/30 shadow-sm' : 'border-black/[0.08]'}`}>
                  <button
                    type="button"
                    onClick={isCurrent ? undefined : toggle}
                    disabled={isCurrent}
                    className={`flex min-h-16 w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left ${
                      isCurrent ? 'cursor-default' : 'cursor-pointer hover:bg-brand-tint/45'
                    }`}
                    aria-expanded={isCurrent ? true : isExpanded}
                  >
                    <span className="text-sm font-extrabold text-gray-900">v{entry.version}</span>
                    {isCurrent ? (
                      <span className="rounded-full bg-brand-tint px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-brand">
                        AKTUELLE VERSION
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-black/45">
                        {entry.changes.length === 1 ? '1 Änderung' : `${entry.changes.length} Änderungen`}
                      </span>
                    )}
                    <span className="ml-auto text-xs font-semibold text-black/45">{formatReleaseDate(entry.date)}</span>
                    {!isCurrent ? (
                      <span className={`flex h-4 w-4 items-center justify-center text-black/45 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        <ChevronDownIcon />
                      </span>
                    ) : null}
                  </button>

                  {isExpanded ? (
                    <ul className="space-y-2 border-t border-black/[0.06] px-4 py-4">
                      {entry.changes.map((change, changeIndex) => {
                        const config = CHANGE_TYPE_CONFIG[change.type]
                        return (
                          <li key={`${entry.version}-${changeIndex}`} className="flex items-center gap-2.5 text-[13.5px] leading-5 text-black/70">
                            <span
                              className="flex w-[94px] shrink-0 items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-bold"
                              style={{ backgroundColor: config.background, color: config.color }}
                            >
                              {config.label}
                            </span>
                            <span>{change.text}</span>
                          </li>
                        )
                      })}
                    </ul>
                  ) : null}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
