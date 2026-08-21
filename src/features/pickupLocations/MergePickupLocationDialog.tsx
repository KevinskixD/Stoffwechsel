interface MergePickupLocationDialogProps {
  open: boolean
  names: string[]
  name: string
  onNameChange: (name: string) => void
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}

export function MergePickupLocationDialog({
  open,
  names,
  name,
  onNameChange,
  error,
  onConfirm,
  onCancel,
}: MergePickupLocationDialogProps) {
  if (!open || names.length < 2) return null
  const namesList = names.map((n) => `"${n}"`).join(', ')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.45)]" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-2xl bg-surface p-7 shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[17px] font-extrabold text-gray-900">Abholorte zusammenführen</h2>
        <p className="mt-1 text-[13px] text-black/55">
          {`${namesList} werden zu einem Abholort zusammengeführt. Artikel mit einem dieser Abholorte werden auf den neuen Namen aktualisiert.`}
        </p>
        <input
          autoFocus
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onConfirm()}
          placeholder="Name des zusammengeführten Abholorts"
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
