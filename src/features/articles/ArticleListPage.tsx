import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ActiveBadge } from '../../shared/components/ActiveBadge'
import { ActiveToggleFilter } from '../../shared/components/ActiveToggleFilter'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog'
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable'
import { EditableCell } from '../../shared/components/EditableCell'
import { PageHeader, PrimaryLinkButton } from '../../shared/components/PageHeader'
import { SearchInput } from '../../shared/components/SearchInput'
import { useRowSelection } from '../../shared/hooks/useRowSelection'
import { matchesSearch } from '../../shared/utils/search'
import type { Article } from '../../types/article'
import { usePickupLocations } from '../pickupLocations/hooks'
import { AssignDeductibleDialog } from './AssignDeductibleDialog'
import { AssignPickupLocationDialog } from './AssignPickupLocationDialog'
import {
  assignDeductibleToArticles,
  assignPickupLocationToArticles,
  backfillArticleSizes,
  deleteAllArticles,
  deleteArticle,
  deleteArticles,
  setArticleActive,
  updateArticleDeductibleAmount,
  updateArticleField,
} from './api'
import { useArticles } from './hooks'

type PendingDelete = { kind: 'single'; article: Article } | { kind: 'bulk'; ids: string[] } | { kind: 'all' }

export function ArticleListPage() {
  const [showInactive, setShowInactive] = useState(false)
  const [search, setSearch] = useState('')
  const [pendingDeactivate, setPendingDeactivate] = useState<Article | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [assigningPickupLocation, setAssigningPickupLocation] = useState(false)
  const [assigningDeductible, setAssigningDeductible] = useState(false)
  const [backfillMessage, setBackfillMessage] = useState<string | null>(null)
  const { data: articles, loading } = useArticles(showInactive)
  const { data: pickupLocations } = usePickupLocations(false)

  const filtered = articles.filter((a) => matchesSearch(search, a.articleName, a.articleNumber))
  const selection = useRowSelection(filtered)

  const columns: DataTableColumn<Article>[] = [
    selection.column,
    {
      key: 'articleName',
      header: 'Artikelbezeichnung',
      render: (a) => (
        <EditableCell
          value={a.articleName}
          onCommit={(v) => {
            if (v) void updateArticleField(a.id, 'articleName', v)
          }}
        />
      ),
    },
    {
      key: 'articleNumber',
      header: 'Artikelnummer',
      render: (a) => (
        <EditableCell value={a.articleNumber} onCommit={(v) => void updateArticleField(a.id, 'articleNumber', v)} />
      ),
    },
    {
      key: 'deductible',
      header: 'Selbstbehalt',
      render: (a) =>
        a.hasDeductible ? (
          <span className="inline-flex items-center gap-1">
            <EditableCell
              type="number"
              min={0}
              step={0.05}
              value={String(a.deductibleAmount)}
              display={`${a.deductibleAmount.toFixed(2)} €`}
              onCommit={(v) => {
                const n = Number(v)
                if (Number.isFinite(n) && n > 0) void updateArticleDeductibleAmount(a.id, n)
              }}
            />
          </span>
        ) : (
          <span className="text-black/35">–</span>
        ),
    },
    {
      key: 'size',
      header: 'Größe',
      render: (a) => <EditableCell value={a.size} onCommit={(v) => void updateArticleField(a.id, 'size', v)} />,
    },
    {
      key: 'pickupLocation',
      header: 'Abholort',
      render: (a) => (
        <select
          value={a.pickupLocationId}
          onChange={(e) => {
            const selected = pickupLocations.find((l) => l.id === e.target.value)
            void assignPickupLocationToArticles([a.id], e.target.value, selected?.name ?? '')
          }}
          className="-mx-1.5 appearance-none rounded border-0 bg-transparent px-1.5 py-1 text-[13.5px] hover:bg-black/[0.04] focus:outline-none"
        >
          <option value="">Kein Abholort</option>
          {a.pickupLocationId && !pickupLocations.some((l) => l.id === a.pickupLocationId) && (
            <option value={a.pickupLocationId}>{a.pickupLocationName} (inaktiv)</option>
          )}
          {pickupLocations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      ),
    },
    { key: 'status', header: 'Status', render: (a) => <ActiveBadge active={a.active} /> },
    {
      key: 'actions',
      header: '',
      render: (a) => (
        <div className="flex gap-4 text-[13px] font-semibold">
          <Link to={`/articles/${a.id}/edit`} className="text-brand hover:underline">
            Bearbeiten
          </Link>
          {a.active ? (
            <button type="button" onClick={() => setPendingDeactivate(a)} className="text-black/45 hover:underline">
              Deaktivieren
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setArticleActive(a.id, true)}
              className="text-black/45 hover:underline"
            >
              Reaktivieren
            </button>
          )}
          <button
            type="button"
            onClick={() => setPendingDelete({ kind: 'single', article: a })}
            className="text-red-600 hover:underline"
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
        title="Artikel"
        subtitle="Uniformteile im Sortiment"
        action={
          <>
            <Link
              to="/articles/import"
              className="rounded-lg border border-black/[0.12] px-4 py-2.5 text-[13.5px] font-bold text-gray-900"
            >
              Excel-Import
            </Link>
            <button
              type="button"
              onClick={async () => {
                const { updated } = await backfillArticleSizes()
                setBackfillMessage(`${updated} Artikel aktualisiert.`)
                setTimeout(() => setBackfillMessage(null), 3000)
              }}
              className="rounded-lg border border-black/[0.12] px-4 py-2.5 text-[13.5px] font-bold text-gray-900"
            >
              Größen aus Namen ergänzen
            </button>
            <button
              type="button"
              onClick={() => setPendingDelete({ kind: 'all' })}
              className="rounded-lg border border-red-300 px-4 py-2.5 text-[13.5px] font-bold text-red-600"
            >
              Alle löschen
            </button>
            <PrimaryLinkButton to="/articles/new">+ Neuer Artikel</PrimaryLinkButton>
          </>
        }
      />

      <div className="mb-4.5 flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Bezeichnung oder Nummer…" />
        <ActiveToggleFilter showInactive={showInactive} onChange={setShowInactive} />
        {selection.selectedCount > 0 && (
          <>
            <button
              type="button"
              onClick={() => setAssigningPickupLocation(true)}
              className="rounded-lg border border-black/[0.12] px-3.5 py-1.5 text-[13px] font-bold text-gray-900"
            >
              {selection.selectedCount} ausgewählt: Abholort zuweisen
            </button>
            <button
              type="button"
              onClick={() => setAssigningDeductible(true)}
              className="rounded-lg border border-black/[0.12] px-3.5 py-1.5 text-[13px] font-bold text-gray-900"
            >
              {selection.selectedCount} ausgewählt: Selbstbehalt anpassen
            </button>
            <button
              type="button"
              onClick={() => setPendingDelete({ kind: 'bulk', ids: Array.from(selection.selectedIds) })}
              className="rounded-lg border border-red-300 px-3.5 py-1.5 text-[13px] font-bold text-red-600"
            >
              {selection.selectedCount} ausgewählt löschen
            </button>
          </>
        )}
        {backfillMessage ? <span className="text-[13px] font-semibold text-brand">{backfillMessage}</span> : null}
        <span className="ml-auto text-xs font-semibold text-black/45">{filtered.length} Einträge</span>
      </div>

      {loading ? (
        <p className="text-gray-400">Lädt…</p>
      ) : (
        <DataTable columns={columns} rows={filtered} rowKey={(a) => a.id} />
      )}

      <ConfirmDialog
        open={pendingDeactivate !== null}
        title="Artikel deaktivieren"
        message={
          pendingDeactivate
            ? `"${pendingDeactivate.articleName}" wird aus der Auswahl im Bestellformular entfernt. Bestehende Bestellungen bleiben erhalten.`
            : ''
        }
        confirmLabel="Deaktivieren"
        onConfirm={() => {
          if (pendingDeactivate) void setArticleActive(pendingDeactivate.id, false)
          setPendingDeactivate(null)
        }}
        onCancel={() => setPendingDeactivate(null)}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title={
          pendingDelete?.kind === 'all'
            ? 'Alle Artikel löschen'
            : pendingDelete?.kind === 'bulk'
              ? 'Ausgewählte Artikel löschen'
              : 'Artikel löschen'
        }
        message={
          pendingDelete?.kind === 'all'
            ? 'Wirklich ALLE Artikel (aktiv und inaktiv) unwiderruflich löschen? Bestellungen behalten die gespeicherten Artikeldaten, verweisen aber auf keinen bestehenden Artikel mehr.'
            : pendingDelete?.kind === 'bulk'
              ? `${pendingDelete.ids.length} ausgewählte Artikel unwiderruflich löschen? Bestellungen behalten die gespeicherten Artikeldaten.`
              : pendingDelete?.kind === 'single'
                ? `"${pendingDelete.article.articleName}" unwiderruflich löschen? Bestehende Bestellungen behalten die gespeicherten Artikeldaten, verweisen aber auf keinen bestehenden Artikel mehr.`
                : ''
        }
        confirmLabel="Löschen"
        onConfirm={async () => {
          if (!pendingDelete) return
          if (pendingDelete.kind === 'single') await deleteArticle(pendingDelete.article.id)
          else if (pendingDelete.kind === 'bulk') {
            await deleteArticles(pendingDelete.ids)
            selection.clear()
          } else if (pendingDelete.kind === 'all') {
            await deleteAllArticles()
            selection.clear()
          }
          setPendingDelete(null)
        }}
        onCancel={() => setPendingDelete(null)}
      />

      <AssignPickupLocationDialog
        open={assigningPickupLocation}
        count={selection.selectedCount}
        pickupLocations={pickupLocations}
        onConfirm={async (pickupLocationId, pickupLocationName) => {
          await assignPickupLocationToArticles(Array.from(selection.selectedIds), pickupLocationId, pickupLocationName)
          selection.clear()
          setAssigningPickupLocation(false)
        }}
        onCancel={() => setAssigningPickupLocation(false)}
      />

      <AssignDeductibleDialog
        open={assigningDeductible}
        count={selection.selectedCount}
        onConfirm={async (hasDeductible, deductibleAmount) => {
          await assignDeductibleToArticles(Array.from(selection.selectedIds), hasDeductible, deductibleAmount)
          selection.clear()
          setAssigningDeductible(false)
        }}
        onCancel={() => setAssigningDeductible(false)}
      />
    </div>
  )
}
