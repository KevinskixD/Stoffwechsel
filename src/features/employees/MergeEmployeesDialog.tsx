import { employeeDisplayName, type Employee } from '../../types/employee'

interface MergeEmployeesDialogProps {
  employees: Employee[]
  targetId: string
  busy: boolean
  error: string | null
  onTargetChange: (id: string) => void
  onConfirm: () => void
  onCancel: () => void
}

export function MergeEmployeesDialog({
  employees,
  targetId,
  busy,
  error,
  onTargetChange,
  onConfirm,
  onCancel,
}: MergeEmployeesDialogProps) {
  if (employees.length === 0) return null
  const target = employees.find((employee) => employee.id === targetId) ?? employees[0]
  const duplicateCount = employees.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.45)] p-4" onClick={busy ? undefined : onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="merge-employees-title"
        className="w-full max-w-lg rounded-2xl bg-surface p-7 shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="merge-employees-title" className="text-[17px] font-extrabold text-gray-900">
          Mitarbeiter zusammenführen
        </h2>
        <p className="mt-1 text-[13px] leading-5 text-black/55">
          Wähle den Datensatz, der erhalten bleibt. Die Bestellungen und Leihgaben der anderen Datensätze werden dorthin
          übertragen; anschließend werden die Duplikate gelöscht.
        </p>

        <fieldset className="mt-5 space-y-2" disabled={busy}>
          <legend className="mb-2 text-[13px] font-bold text-gray-900">Diesen Mitarbeiter behalten</legend>
          {employees.map((employee) => {
            const checked = employee.id === target.id
            return (
              <label
                key={employee.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-[13.5px] transition-colors ${
                  checked ? 'border-brand bg-brand/5' : 'border-black/[0.10] hover:bg-black/[0.03]'
                }`}
              >
                <input
                  type="radio"
                  name="merge-target"
                  value={employee.id}
                  checked={checked}
                  onChange={() => onTargetChange(employee.id)}
                  className="h-4 w-4 accent-brand"
                />
                <span className="min-w-0 flex-1 font-semibold text-gray-900">{employeeDisplayName(employee)}</span>
                {employee.personnelNumber ? <span className="text-xs text-black/45">#{employee.personnelNumber}</span> : null}
              </label>
            )
          })}
        </fieldset>

        <p className="mt-4 rounded-lg border border-amber-300/70 bg-amber-50 px-3.5 py-2.5 text-[12.5px] leading-5 text-amber-900 dark:bg-amber-100/10 dark:text-amber-100">
          {duplicateCount} Duplikat{duplicateCount === 1 ? '' : 'e'} wird{duplicateCount === 1 ? '' : ' werden'} gelöscht. Die
          bestehende Historie bleibt als Verlaufseintrag erhalten.
        </p>
        {error ? <p className="mt-3 text-[13px] text-red-600">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg border border-black/[0.12] px-4.5 py-2.5 text-[13.5px] font-bold text-gray-900 disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="rounded-lg bg-brand px-4.5 py-2.5 text-[13.5px] font-bold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {busy ? 'Führt zusammen…' : 'Zusammenführen'}
          </button>
        </div>
      </div>
    </div>
  )
}
