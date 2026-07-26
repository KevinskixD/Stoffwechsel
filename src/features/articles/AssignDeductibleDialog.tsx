import { useState } from 'react'

interface AssignDeductibleDialogProps {
  open: boolean
  count: number
  onConfirm: (hasDeductible: boolean, deductibleAmount: number) => void
  onCancel: () => void
}

export function AssignDeductibleDialog({ open, count, onConfirm, onCancel }: AssignDeductibleDialogProps) {
  const [hasDeductible, setHasDeductible] = useState(true)
  const [deductibleAmount, setDeductibleAmount] = useState(0)

  if (!open) return null

  const valid = !hasDeductible || deductibleAmount > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[17px] font-extrabold text-gray-900">Selbstbehalt anpassen</h2>
        <p className="mt-1 text-[13px] text-black/55">{`Selbstbehalt für ${count} ausgewählte Artikel setzen.`}</p>

        <label className="mt-4 flex items-center gap-2 text-[13.5px] text-gray-900">
          <input
            type="checkbox"
            checked={hasDeductible}
            onChange={(e) => setHasDeductible(e.target.checked)}
            className="h-4 w-4 rounded border-black/[0.25] accent-brand"
          />
          Selbstbehalt zu entrichten
        </label>

        {hasDeductible ? (
          <input
            autoFocus
            type="number"
            min="0"
            step="0.05"
            value={deductibleAmount}
            onChange={(e) => setDeductibleAmount(e.target.valueAsNumber || 0)}
            placeholder="Betrag (€)"
            className="mt-3 w-full rounded-lg border border-black/[0.14] px-3 py-2.5 text-[13.5px] focus:border-brand focus:outline-none"
          />
        ) : null}

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
            disabled={!valid}
            onClick={() => onConfirm(hasDeductible, deductibleAmount)}
            className="rounded-lg bg-brand px-4.5 py-2.5 text-[13.5px] font-bold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            Übernehmen
          </button>
        </div>
      </div>
    </div>
  )
}
