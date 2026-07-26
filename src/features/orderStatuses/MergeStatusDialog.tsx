interface MergeStatusDialogProps {
  open: boolean
  nameA: string | null
  nameB: string | null
  name: string
  onNameChange: (name: string) => void
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}

export function MergeStatusDialog({
  open,
  nameA,
  nameB,
  name,
  onNameChange,
  error,
  onConfirm,
  onCancel,
}: MergeStatusDialogProps) {
  if (!open || !nameA || !nameB) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[17px] font-extrabold text-gray-900">Status zusammenführen</h2>
        <p className="mt-1 text-[13px] text-black/55">
          {`"${nameA}" und "${nameB}" werden zu einem Status zusammengeführt. Bestellungen mit einem dieser Status werden auf den neuen Namen aktualisiert.`}
        </p>
        <input
          autoFocus
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onConfirm()}
          placeholder="Name des zusammengeführten Status"
          className="mt-4 w-full rounded-lg border border-black/[0.14] px-3 py-2.5 text-[13.5px] focus:border-brand focus:outline-none"
        />
        {error ? <p className="mt-2 text-[13px] text-red-600">{error}</p> : null}
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
            onClick={onConfirm}
            className="rounded-lg bg-brand px-4.5 py-2.5 text-[13.5px] font-bold text-white hover:bg-brand-dark"
          >
            Zusammenführen
          </button>
        </div>
      </div>
    </div>
  )
}
