import type { ImportEntityConfig, ImportRowState } from './types'

interface PreviewStepProps<T, P> {
  config: ImportEntityConfig<T, P>
  rows: ImportRowState[]
  onBack: () => void
  onConfirm: () => void
}

const PREVIEW_COUNT = 20

export function PreviewStep<T, P>({ config, rows, onBack, onConfirm }: PreviewStepProps<T, P>) {
  const validCount = rows.filter((r) => r.errors.length === 0).length
  const invalidCount = rows.length - validCount
  const preview = rows.slice(0, PREVIEW_COUNT)

  return (
    <div>
      <h2 className="mb-2 text-sm font-extrabold text-gray-900">Vorschau</h2>
      <p className="mb-3 text-[13.5px] text-gray-600">
        {rows.length} Zeilen gefunden — {validCount} gültig, {invalidCount} mit Fehlern. Es werden die ersten{' '}
        {Math.min(PREVIEW_COUNT, rows.length)} Zeilen angezeigt.
      </p>

      <div className="overflow-x-auto rounded-xl border border-black/[0.08] bg-surface">
        <table className="min-w-full text-sm">
          <thead className="border-b border-black/[0.08] bg-page">
            <tr>
              {config.fields.map((f) => (
                <th
                  key={f.targetField}
                  className="px-3.5 py-2.5 text-left text-[11.5px] font-bold tracking-wide text-black/45 uppercase"
                >
                  {f.label}
                </th>
              ))}
              <th className="px-3.5 py-2.5 text-left text-[11.5px] font-bold tracking-wide text-black/45 uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {preview.map((row) => (
              <tr
                key={row.rowIndex}
                className={`border-b border-black/[0.06] last:border-0 ${row.errors.length > 0 ? 'bg-badge-red-bg/40' : ''}`}
              >
                {config.fields.map((f) => (
                  <td key={f.targetField} className="px-3.5 py-2.5 text-[13px] text-gray-900">
                    {String(row.data[f.targetField] ?? '')}
                  </td>
                ))}
                <td className="px-3.5 py-2.5 text-xs">
                  {row.errors.length > 0 ? (
                    <span style={{ color: 'var(--color-badge-red-fg)' }}>{row.errors.join(' ')}</span>
                  ) : (
                    <span style={{ color: 'var(--color-badge-green-fg)' }}>OK</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex gap-2.5">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-black/[0.12] px-4.5 py-2.5 text-[13.5px] font-bold text-gray-900"
        >
          Zurück
        </button>
        <button
          type="button"
          disabled={validCount === 0}
          onClick={onConfirm}
          className="rounded-lg bg-brand px-4.5 py-2.5 text-[13.5px] font-bold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {validCount} Zeilen importieren
        </button>
      </div>
    </div>
  )
}
