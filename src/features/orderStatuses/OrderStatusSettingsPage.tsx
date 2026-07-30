import { useRef, useState } from 'react'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog'
import { PageHeader } from '../../shared/components/PageHeader'
import { useSelection } from '../../shared/hooks/useRowSelection'
import { isInteractiveClickTarget } from '../../shared/utils/rowClick'
import { legacyHexBg } from '../../shared/utils/statusColors'
import type { OrderStatus } from '../../types/orderStatus'
import { MergeStatusDialog } from './MergeStatusDialog'
import {
  createOrderStatus,
  deleteOrderStatus,
  isStatusNameTaken,
  mergeOrderStatuses,
  renameOrderStatus,
  reorderOrderStatuses,
  setOrderStatusActive,
  updateOrderStatusColor,
} from './api'
import { useOrderStatuses } from './hooks'

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

export function OrderStatusSettingsPage() {
  const { data: statuses, loading } = useOrderStatuses(true)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [pendingDelete, setPendingDelete] = useState<OrderStatus | null>(null)
  const selection = useSelection(statuses)
  const shiftPressed = useRef(false)
  const [pendingMerge, setPendingMerge] = useState<OrderStatus[] | null>(null)
  const [mergeName, setMergeName] = useState('')
  const [mergeError, setMergeError] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  async function handleAdd() {
    const trimmed = newName.trim()
    if (!trimmed) return
    setError(null)
    if (await isStatusNameTaken(trimmed)) {
      setError('Dieser Status existiert bereits.')
      return
    }
    await createOrderStatus(trimmed)
    setNewName('')
  }

  function startEdit(status: OrderStatus) {
    setEditingId(status.id)
    setEditingName(status.name)
  }

  async function commitEdit(status: OrderStatus) {
    const trimmed = editingName.trim()
    setEditingId(null)
    if (!trimmed || trimmed === status.name) return
    setError(null)
    if (await isStatusNameTaken(trimmed, status.id)) {
      setError('Dieser Status existiert bereits.')
      return
    }
    await renameOrderStatus(status.id, trimmed)
  }

  function openMerge() {
    const selected = statuses.filter((s) => selection.selectedIds.has(s.id))
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
    if (await isStatusNameTaken(trimmed, pendingMerge.map((s) => s.id))) {
      setMergeError('Dieser Status existiert bereits.')
      return
    }
    await mergeOrderStatuses(
      keep.id,
      rest.map((s) => s.id),
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
    const fromIndex = statuses.findIndex((s) => s.id === sourceId)
    const toIndex = statuses.findIndex((s) => s.id === targetId)
    if (fromIndex === -1 || toIndex === -1) return
    const reordered = [...statuses]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)
    reorderOrderStatuses(reordered.map((s) => s.id))
  }

  return (
    <div className="px-11 pt-9 pb-15">
      <PageHeader
        title="Einstellungen"
        subtitle="Bestellstatus verwalten — bestimmt Auswahl und Reihenfolge im Bestellformular"
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
        <ul className="divide-y divide-black/[0.06] rounded-xl border border-black/[0.08] bg-white">
          {statuses.map((status) => (
            <li
              key={status.id}
              draggable
              onDragStart={() => setDragId(status.id)}
              onDragOver={(e) => {
                e.preventDefault()
                if (dragOverId !== status.id) setDragOverId(status.id)
              }}
              onDragEnd={() => {
                setDragId(null)
                setDragOverId(null)
              }}
              onDrop={(e) => {
                e.preventDefault()
                handleDrop(status.id)
              }}
              onClick={(e) => {
                if (isInteractiveClickTarget(e.target)) return
                selection.toggleRowClick(status.id, e.shiftKey)
              }}
              className={`flex cursor-pointer items-center gap-3 border-t-2 px-5 py-2.5 transition-colors ${
                dragId === status.id ? 'opacity-40' : ''
              } ${dragOverId === status.id && dragId !== status.id ? 'border-brand bg-brand/5' : 'border-transparent'} ${
                selection.selectedIds.has(status.id) ? 'bg-brand/5' : ''
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
                checked={selection.selectedIds.has(status.id)}
                onClick={(e) => {
                  shiftPressed.current = e.shiftKey
                }}
                onChange={(e) => selection.toggleOne(status.id, e.target.checked, shiftPressed.current)}
                className="size-4 rounded border-black/20 accent-brand"
              />

              <div className="flex-1">
                {editingId === status.id ? (
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => commitEdit(status)}
                    onKeyDown={(e) => e.key === 'Enter' && commitEdit(status)}
                    className="w-full rounded-lg border border-black/[0.14] px-2.5 py-1.5 text-[13.5px] focus:border-brand focus:outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => startEdit(status)}
                    className={`text-[13.5px] font-semibold ${status.active ? 'text-gray-900' : 'text-black/35'}`}
                  >
                    {status.name}
                    {!status.active && <span className="ml-2 text-xs font-medium">(inaktiv)</span>}
                  </button>
                )}
              </div>

              <input
                type="color"
                value={status.color || legacyHexBg(status.name)}
                onChange={(e) => void updateOrderStatusColor(status.id, e.target.value)}
                title="Hintergrundfarbe"
                className="h-7 w-7 cursor-pointer rounded border border-black/[0.12] p-0.5"
              />

              <button
                type="button"
                onClick={() => setOrderStatusActive(status.id, !status.active)}
                className="text-[13px] font-semibold text-black/45 hover:underline"
              >
                {status.active ? 'Deaktivieren' : 'Reaktivieren'}
              </button>
              <button
                type="button"
                onClick={() => setPendingDelete(status)}
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
        title="Status löschen"
        message={
          pendingDelete
            ? `"${pendingDelete.name}" unwiderruflich löschen? Bestellungen mit diesem Status behalten den gespeicherten Namen, verweisen aber auf keinen bestehenden Status mehr.`
            : ''
        }
        confirmLabel="Löschen"
        onConfirm={async () => {
          if (!pendingDelete) return
          await deleteOrderStatus(pendingDelete.id)
          setPendingDelete(null)
        }}
        onCancel={() => setPendingDelete(null)}
      />

      <MergeStatusDialog
        open={pendingMerge !== null}
        names={pendingMerge?.map((s) => s.name) ?? []}
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
          placeholder="Neuer Status…"
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
