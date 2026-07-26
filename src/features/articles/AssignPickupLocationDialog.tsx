import { useState } from 'react'
import type { PickupLocation } from '../../types/pickupLocation'

interface AssignPickupLocationDialogProps {
  open: boolean
  count: number
  pickupLocations: PickupLocation[]
  onConfirm: (pickupLocationId: string, pickupLocationName: string) => void
  onCancel: () => void
}

export function AssignPickupLocationDialog({
  open,
  count,
  pickupLocations,
  onConfirm,
  onCancel,
}: AssignPickupLocationDialogProps) {
  const [selectedId, setSelectedId] = useState('')

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[17px] font-extrabold text-gray-900">Abholort zuweisen</h2>
        <p className="mt-1 text-[13px] text-black/55">
          {`Abholort für ${count} ausgewählte Artikel setzen.`}
        </p>
        <select
          autoFocus
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="mt-4 w-full rounded-lg border border-black/[0.14] px-3 py-2.5 text-[13.5px] focus:border-brand focus:outline-none"
        >
          <option value="" disabled>
            Abholort auswählen…
          </option>
          {pickupLocations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <div className="mt-6 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-black/[0.12] px-4.5 py-2.5 text-[13.5px] font-bold text-gray-900"
          >
            Abbrechen
          </button>
          <button
            type="button"
            disabled={!selectedId}
            onClick={() => {
              const selected = pickupLocations.find((l) => l.id === selectedId)
              if (selected) onConfirm(selected.id, selected.name)
            }}
            className="rounded-lg bg-brand px-4.5 py-2.5 text-[13.5px] font-bold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            Zuweisen
          </button>
        </div>
      </div>
    </div>
  )
}
