import { useState } from 'react'
import { Autocomplete, type AutocompleteOption } from '../../shared/components/Autocomplete'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog'
import { PageHeader } from '../../shared/components/PageHeader'
import { articleDisplayLabel } from '../../types/article'
import type { StarterKitCategory } from '../../types/starterKit'
import { useArticles } from '../articles/hooks'
import {
  addArticleToCategory,
  createStarterKitCategory,
  deleteStarterKitCategory,
  removeArticleFromCategory,
  renameStarterKitCategory,
  reorderStarterKitCategories,
} from './api'
import { useStarterKitCategories } from './hooks'

function GripIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="3" r="1.3" />
      <circle cx="11" cy="3" r="1.3" />
      <circle cx="5" cy="8" r="1.3" />
      <circle cx="11" cy="8" r="1.3" />
      <circle cx="5" cy="13" r="1.3" />
      <circle cx="11" cy="13" r="1.3" />
    </svg>
  )
}

export function StarterKitSettingsPage() {
  const { data: categories, loading } = useStarterKitCategories()
  const { data: articles } = useArticles(true)
  const [newLabel, setNewLabel] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingLabel, setEditingLabel] = useState('')
  const [pendingDelete, setPendingDelete] = useState<StarterKitCategory | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  async function handleAdd() {
    const trimmed = newLabel.trim()
    if (!trimmed) return
    await createStarterKitCategory(trimmed)
    setNewLabel('')
  }

  function startEdit(category: StarterKitCategory) {
    setEditingId(category.id)
    setEditingLabel(category.label)
  }

  async function commitEdit(category: StarterKitCategory) {
    const trimmed = editingLabel.trim()
    setEditingId(null)
    if (!trimmed || trimmed === category.label) return
    await renameStarterKitCategory(category.id, trimmed)
  }

  function handleDrop(targetId: string) {
    const sourceId = dragId
    setDragId(null)
    setDragOverId(null)
    if (!sourceId || sourceId === targetId) return
    const fromIndex = categories.findIndex((c) => c.id === sourceId)
    const toIndex = categories.findIndex((c) => c.id === targetId)
    if (fromIndex === -1 || toIndex === -1) return
    const reordered = [...categories]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)
    reorderStarterKitCategories(reordered.map((c) => c.id))
  }

  return (
    <div className="px-11 pt-9 pb-15">
      <PageHeader
        title="Einstellungen"
        subtitle="Basisausrüstung verwalten — Kategorien und ihre zugeordneten Artikel (z. B. Größenvarianten)"
      />

      {loading ? (
        <p className="text-gray-400">Lädt…</p>
      ) : (
        <ul className="divide-y divide-black/[0.06] rounded-xl border border-black/[0.08] bg-surface">
          {categories.map((category) => {
            const categoryArticles = category.articleIds
              .map((id) => articles.find((a) => a.id === id))
              .filter((a): a is NonNullable<typeof a> => Boolean(a))

            const addOptions: AutocompleteOption<null>[] = articles
              .filter((a) => !category.articleIds.includes(a.id))
              .map((a) => ({
                value: a.id,
                label: a.active ? articleDisplayLabel(a) : `${articleDisplayLabel(a)} (inaktiv)`,
                data: null,
              }))

            return (
              <li
                key={category.id}
                draggable
                onDragStart={() => setDragId(category.id)}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (dragOverId !== category.id) setDragOverId(category.id)
                }}
                onDragEnd={() => {
                  setDragId(null)
                  setDragOverId(null)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  handleDrop(category.id)
                }}
                className={`flex flex-col gap-2.5 border-t-2 px-5 py-3 transition-colors ${
                  dragId === category.id ? 'opacity-40' : ''
                } ${dragOverId === category.id && dragId !== category.id ? 'border-brand bg-brand/5' : 'border-transparent'}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="cursor-grab text-black/25 hover:text-black/45 active:cursor-grabbing"
                    title="Ziehen zum Verschieben"
                  >
                    <GripIcon />
                  </span>

                  <div className="flex-1">
                    {editingId === category.id ? (
                      <input
                        autoFocus
                        value={editingLabel}
                        onChange={(e) => setEditingLabel(e.target.value)}
                        onBlur={() => commitEdit(category)}
                        onKeyDown={(e) => e.key === 'Enter' && commitEdit(category)}
                        className="w-full rounded-lg border border-black/[0.14] px-2.5 py-1.5 text-[13.5px] focus:border-brand focus:outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(category)}
                        className="text-[13.5px] font-semibold text-gray-900"
                      >
                        {category.label}
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setPendingDelete(category)}
                    className="text-[13px] font-semibold text-red-600 hover:underline"
                  >
                    Löschen
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 pl-7">
                  {categoryArticles.map((article) => (
                    <span
                      key={article.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.05] px-3 py-1 text-[12.5px] font-medium text-gray-900"
                    >
                      {articleDisplayLabel(article)}
                      {!article.active && <span className="text-black/40">(inaktiv)</span>}
                      <button
                        type="button"
                        onClick={() => removeArticleFromCategory(category.id, article.id)}
                        className="text-black/40 hover:text-red-600"
                        title="Entfernen"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <div className="w-56">
                    <Autocomplete
                      key={category.articleIds.length}
                      options={addOptions}
                      value={null}
                      onChange={(value) => {
                        if (value) void addArticleToCategory(category.id, value)
                      }}
                      placeholder="Artikel hinzufügen…"
                    />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Kategorie löschen"
        message={pendingDelete ? `"${pendingDelete.label}" unwiderruflich löschen?` : ''}
        confirmLabel="Löschen"
        onConfirm={async () => {
          if (!pendingDelete) return
          await deleteStarterKitCategory(pendingDelete.id)
          setPendingDelete(null)
        }}
        onCancel={() => setPendingDelete(null)}
      />

      <div className="mt-4 flex gap-2.5">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Neue Kategorie…"
          className="flex-1 rounded-lg border border-black/[0.14] px-3 py-2.5 text-[13.5px] focus:border-brand focus:outline-none"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-lg bg-brand px-4.5 py-2.5 text-[13.5px] font-bold text-white hover:bg-brand-dark"
        >
          Hinzufügen
        </button>
      </div>
    </div>
  )
}
