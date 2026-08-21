import { useRef, useState } from 'react'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog'
import { PageHeader } from '../../shared/components/PageHeader'
import { useSelection } from '../../shared/hooks/useRowSelection'
import { isInteractiveClickTarget } from '../../shared/utils/rowClick'
import type { PickupLocation } from '../../types/pickupLocation'
import { MergePickupLocationDialog } from './MergePickupLocationDialog'
import {
  createPickupLocation,
  deletePickupLocation,
  isPickupLocationNameTaken,
  mergePickupLocations,
  renamePickupLocation,
  reorderPickupLocations,
  setPickupLocationActive,
} from './api'
import { usePickupLocations } from './hooks'

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

export function PickupLocationSettingsPage() {
  const { data: locations, loading } = usePickupLocations(true)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [pendingDelete, setPendingDelete] = useState<PickupLocation | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const selection = useSelection(locations)
  const shiftPressed = useRef(false)
  const [pendingMerge, setPendingMerge] = useState<PickupLocation[] | null>(null)
  const [mergeName, setMergeName] = useState('')
  const [mergeError, setMergeError] = useState<string | null>(null)

  async function handleAdd() {
    const trimmed = newName.trim()
    if (!trimmed) return
    setError(null)
    if (await isPickupLocationNameTaken(trimmed)) {
      setError('Dieser Abholort existiert bereits.')
      return
    }
    await createPickupLocation(trimmed)
    setNewName('')
  }

  function startEdit(location: PickupLocation) {
    setEditingId(location.id)
    setEditingName(location.name)
  }

  async function commitEdit(location: PickupLocation) {
    const trimmed = editingName.trim()
    setEditingId(null)
    if (!trimmed || trimmed === location.name) return
    setError(null)
    if (await isPickupLocationNameTaken(trimmed, location.id)) {
      setError('Dieser Abholort existiert bereits.')
      return
    }
    await renamePickupLocation(location.id, trimmed)
  }

  function openMerge() {
    const selected = locations.filter((l) => selection.selectedIds.has(l.id))
    if (selected.length < 2) return
    setMergeName(selected[0].name)
    setMergeError(null)
    setPendingMerge(selected)
  }

  async function confirmMerge() {
    if (!pendingMerge || pendingMerge.length < 2) return
    const trimmed = mergeName.trim()
    if (!trimmed) {
      setMergeError('Bitte einen Namen angeben.')
      return
    }
    const [keep, ...rest] = pendingMerge
    setMergeError(null)
    if (await isPickupLocationNameTaken(trimmed, pendingMerge.map((l) => l.id))) {
      setMergeError('Dieser Abholort existiert bereits.')
      return
    }
    await mergePickupLocations(
      keep.id,
      rest.map((l) => l.id),
      trimmed,
    )
    setPendingMerge(null)
    selection.clear()
  }

  function handleDrop(targetId: string) {
    const sourceId = dragId
    setDragId(null)
    setDragOverId(null)
    if (!sourceId || sourceId === targetId) return
    const fromIndex = locations.findIndex((l) => l.id === sourceId)
    const toIndex = locations.findIndex((l) => l.id === targetId)
    if (fromIndex === -1 || toIndex === -1) return
    const reordered = [...locations]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)
    reorderPickupLocations(reordered.map((l) => l.id))
  }

  return (
    <div className="px-4 pt-[4.5rem] pb-10 lg:px-11 lg:pt-9 lg:pb-15">
      <PageHeader
        title="Einstellungen"
        subtitle="Abholorte verwalten — bestimmt Auswahl und Reihenfolge im Artikelformular"
      />

      {selection.selectedCount > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-brand/25 bg-brand/5 px-4 py-2.5">
          <span className="text-[13px] font-semibold text-gray-900">{selection.selectedCount} ausgewählt</span>
          <div className="flex items-center gap-4">
            {selection.selectedCount >= 2 ? (
              <button type="button" onClick={openMerge} className="text-[13px] font-bold text-brand hover:underline">
                Zusammenführen
              </button>
            ) : (
              <span className="text-[13px] text-black/45">Mind. 2 auswählen zum Zusammenführen</span>
            )}
            <button
              type="button"
              onClick={() => selection.clear()}
              className="text-[13px] font-semibold text-black/45 hover:underline"
            >
              Auswahl aufheben
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400">Lädt…</p>
      ) : (
        <ul className="divide-y divide-black/[0.06] rounded-xl border border-black/[0.08] bg-surface">
          {locations.map((location) => (
            <li
              key={location.id}
              draggable
              onDragStart={() => setDragId(location.id)}
              onDragOver={(e) => {
                e.preventDefault()
                if (dragOverId !== location.id) setDragOverId(location.id)
              }}
              onDragEnd={() => {
                setDragId(null)
                setDragOverId(null)
              }}
              onDrop={(e) => {
                e.preventDefault()
                handleDrop(location.id)
              }}
              onClick={(e) => {
                if (isInteractiveClickTarget(e.target)) return
                selection.toggleRowClick(location.id, e.shiftKey)
              }}
              className={`flex cursor-pointer items-center gap-3 border-t-2 px-5 py-2.5 transition-colors ${
                dragId === location.id ? 'opacity-40' : ''
              } ${dragOverId === location.id && dragId !== location.id ? 'border-brand bg-brand/5' : 'border-transparent'} ${
                selection.selectedIds.has(location.id) ? 'bg-brand/5' : ''
              }`}
            >
              <span
                data-no-row-select
                className="cursor-grab text-black/25 hover:text-black/45 active:cursor-grabbing"
                title="Ziehen zum Verschieben"
              >
                <GripIcon />
              </span>

              <input
                type="checkbox"
                checked={selection.selectedIds.has(location.id)}
                onClick={(e) => {
                  shiftPressed.current = e.shiftKey
                }}
                onChange={(e) => selection.toggleOne(location.id, e.target.checked, shiftPressed.current)}
                className="size-4 rounded border-black/20 accent-brand"
              />

              <div className="flex-1">
                {editingId === location.id ? (
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => commitEdit(location)}
                    onKeyDown={(e) => e.key === 'Enter' && commitEdit(location)}
                    className="w-full rounded-lg border border-black/[0.14] px-2.5 py-1.5 text-[13.5px] focus:border-brand focus:outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => startEdit(location)}
                    className={`text-[13.5px] font-semibold ${location.active ? 'text-gray-900' : 'text-black/35'}`}
                  >
                    {location.name}
                    {!location.active && <span className="ml-2 text-xs font-medium">(inaktiv)</span>}
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setPickupLocationActive(location.id, !location.active)}
                className="text-[13px] font-semibold text-black/45 hover:underline"
              >
                {location.active ? 'Deaktivieren' : 'Reaktivieren'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null)
                  setPendingDelete(location)
                }}
                className="text-[13px] font-semibold text-red-600 hover:underline"
              >
                Löschen
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Abholort löschen"
        message={
          deleteError
            ? deleteError
            : pendingDelete
              ? `"${pendingDelete.name}" unwiderruflich löschen?`
              : ''
        }
        confirmLabel="Löschen"
        onConfirm={async () => {
          if (!pendingDelete) return
          try {
            await deletePickupLocation(pendingDelete.id)
            setPendingDelete(null)
          } catch (err) {
            setDeleteError(err instanceof Error ? err.message : String(err))
          }
        }}
        onCancel={() => {
          setPendingDelete(null)
          setDeleteError(null)
        }}
      />

      <MergePickupLocationDialog
        open={pendingMerge !== null}
        names={pendingMerge?.map((l) => l.name) ?? []}
        name={mergeName}
        onNameChange={setMergeName}
        error={mergeError}
        onConfirm={confirmMerge}
        onCancel={() => setPendingMerge(null)}
      />

      <div className="mt-4 flex gap-2.5">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Neuer Abholort…"
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
      {error ? <p className="mt-2 text-[13px] text-red-600">{error}</p> : null}
    </div>
  )
}
