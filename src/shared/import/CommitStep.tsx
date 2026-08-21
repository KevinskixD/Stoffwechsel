import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { useEffect, useRef, useState } from 'react'
import { db } from '../../firebase/config'
import type { ImportEntityConfig, ImportRowState } from './types'

interface CommitStepProps<T, P> {
  config: ImportEntityConfig<T, P>
  rows: ImportRowState[]
  onDone: () => void
}

const BATCH_SIZE = 500

export function CommitStep<T, P>({ config, rows, onDone }: CommitStepProps<T, P>) {
  const [status, setStatus] = useState<'running' | 'done'>('running')
  const [successCount, setSuccessCount] = useState(0)
  const failedRows = rows.filter((r) => r.errors.length > 0)
  const validRows = rows.filter((r) => r.errors.length === 0)
  const hasCommitted = useRef(false)

  useEffect(() => {
    if (hasCommitted.current) return
    hasCommitted.current = true

    async function run() {
      if (config.beforeCommit) await config.beforeCommit(validRows)

      const collectionRef = collection(db, config.collectionName)
      for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
        const chunk = validRows.slice(i, i + BATCH_SIZE)
        const batch = writeBatch(db)
        for (const row of chunk) {
          batch.set(doc(collectionRef), {
            ...config.mapRowToDoc(row.data),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        }
        await batch.commit()
        setSuccessCount((count) => count + chunk.length)
      }
      setStatus('done')
    }

    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <h2 className="mb-2 text-sm font-extrabold text-gray-900">Import</h2>
      {status === 'running' ? (
        <p className="text-[13.5px] text-gray-500">
          Importiere… ({successCount} / {validRows.length})
        </p>
      ) : (
        <div>
          <p className="text-[13.5px] font-semibold" style={{ color: 'var(--color-badge-green-fg)' }}>
            {successCount} Einträge erfolgreich importiert.
          </p>
          {failedRows.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[13.5px] text-red-600">{failedRows.length} Zeilen wurden übersprungen:</p>
              <ul className="max-h-64 overflow-auto rounded-lg border border-black/[0.08] bg-surface text-xs">
                {failedRows.map((r) => (
                  <li key={r.rowIndex} className="border-b border-black/[0.06] px-3 py-1.5 last:border-0">
                    Zeile {r.rowIndex + 2}: {r.errors.join(' ')}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            type="button"
            onClick={onDone}
            className="mt-4 rounded-lg bg-brand px-4.5 py-2.5 text-[13.5px] font-bold text-white hover:bg-brand-dark"
          >
            Fertig
          </button>
        </div>
      )}
    </div>
  )
}
