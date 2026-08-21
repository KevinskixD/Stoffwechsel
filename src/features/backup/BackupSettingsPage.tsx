import { useRef, useState } from 'react'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog'
import { PageHeader } from '../../shared/components/PageHeader'
import type { BackupData, BackupSummary } from '../../types/backup'
import { summarizeBackup } from '../../types/backup'
import { downloadBackupFile, exportBackupData, parseBackupFile, restoreBackupData } from './api'

const SUMMARY_LABELS: { key: keyof BackupSummary; label: string }[] = [
  { key: 'employees', label: 'Mitarbeiter' },
  { key: 'articles', label: 'Artikel' },
  { key: 'orderStatuses', label: 'Bestellstatus' },
  { key: 'orders', label: 'Bestellungen' },
  { key: 'orderHistory', label: 'Verlaufseinträge' },
  { key: 'pickupLocations', label: 'Abholorte' },
  { key: 'lieferscheinChecks', label: 'Lieferschein-Prüfungen' },
  { key: 'starterKitCategories', label: 'Basisausrüstung-Kategorien' },
]

function SummaryList({ summary }: { summary: BackupSummary }) {
  return (
    <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[13px] text-black/65">
      {SUMMARY_LABELS.map(({ key, label }) => (
        <li key={key} className="flex justify-between gap-3">
          <span>{label}</span>
          <span className="font-semibold text-gray-900">{summary[key]}</span>
        </li>
      ))}
    </ul>
  )
}

export function BackupSettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportedSummary, setExportedSummary] = useState<BackupSummary | null>(null)

  const [parseError, setParseError] = useState<string | null>(null)
  const [pendingRestore, setPendingRestore] = useState<BackupData | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [restoreStep, setRestoreStep] = useState<string | null>(null)
  const [restoreDone, setRestoreDone] = useState(false)

  async function handleExport() {
    setExporting(true)
    setExportError(null)
    setExportedSummary(null)
    try {
      const data = await exportBackupData()
      downloadBackupFile(data)
      setExportedSummary(summarizeBackup(data))
    } catch {
      setExportError('Export fehlgeschlagen. Bitte erneut versuchen.')
    } finally {
      setExporting(false)
    }
  }

  async function handleFileChosen(file: File) {
    setParseError(null)
    setRestoreDone(false)
    try {
      const data = await parseBackupFile(file)
      setPendingRestore(data)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Datei konnte nicht gelesen werden.')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleConfirmRestore() {
    if (!pendingRestore) return
    setRestoring(true)
    try {
      await restoreBackupData(pendingRestore, setRestoreStep)
      setRestoreDone(true)
      setPendingRestore(null)
    } catch {
      setParseError('Wiederherstellung fehlgeschlagen — Daten können teilweise überschrieben worden sein. Bitte Backup erneut einspielen.')
      setPendingRestore(null)
    } finally {
      setRestoring(false)
      setRestoreStep(null)
    }
  }

  return (
    <div className="px-11 pt-9 pb-15">
      <PageHeader
        title="Datensicherung"
        subtitle="Alle Daten manuell als eine Datei exportieren oder aus einer solchen Datei wiederherstellen"
      />

      <div className="max-w-[560px] space-y-6">
        <section className="rounded-xl border border-black/[0.08] bg-white p-5">
          <h2 className="text-[15px] font-extrabold text-gray-900">Backup exportieren</h2>
          <p className="mt-1 text-[13px] text-black/55">
            Lädt eine einzelne Datei mit sämtlichen Mitarbeitern, Artikeln, Bestellungen, Einstellungen und Verlaufsdaten
            herunter.
          </p>
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={exporting}
            className="mt-3.5 rounded-lg bg-brand px-4.5 py-2.5 text-[13.5px] font-bold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {exporting ? 'Exportiere…' : 'Backup exportieren'}
          </button>
          {exportError ? <p className="mt-2.5 text-[13px] text-red-600">{exportError}</p> : null}
          {exportedSummary ? (
            <div className="mt-3.5 border-t border-black/[0.06] pt-3.5">
              <p className="text-[13px] font-semibold text-brand">Backup heruntergeladen.</p>
              <SummaryList summary={exportedSummary} />
            </div>
          ) : null}
        </section>

        <section className="rounded-xl border border-black/[0.08] bg-white p-5">
          <h2 className="text-[15px] font-extrabold text-gray-900">Backup wiederherstellen</h2>
          <p className="mt-1 text-[13px] text-black/55">
            Ersetzt <span className="font-semibold text-red-600">alle</span> aktuellen Daten vollständig durch den Inhalt
            der ausgewählten Backup-Datei. Nur verwenden, um nach einem Datenverlust auf einen früheren Stand
            zurückzukehren.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleFileChosen(file)
            }}
            className="mt-3.5 block text-[13px] text-black/65 file:mr-3.5 file:rounded-lg file:border-0 file:bg-brand/10 file:px-4 file:py-2 file:text-[13px] file:font-bold file:text-brand hover:file:bg-brand/15"
          />
          {parseError ? <p className="mt-2.5 text-[13px] text-red-600">{parseError}</p> : null}
          {restoreDone ? (
            <p className="mt-2.5 text-[13px] font-semibold text-brand">
              Wiederherstellung abgeschlossen. Ein Neuladen der Seite wird empfohlen.
            </p>
          ) : null}
        </section>
      </div>

      <ConfirmDialog
        open={pendingRestore !== null}
        title="Backup wiederherstellen?"
        message={
          pendingRestore
            ? `Backup vom ${new Date(pendingRestore.exportedAt).toLocaleString('de-AT')} einspielen. Alle aktuellen Daten werden dabei unwiderruflich überschrieben.`
            : ''
        }
        confirmLabel={restoring ? 'Wird wiederhergestellt…' : 'Überschreiben & wiederherstellen'}
        onConfirm={() => {
          if (!restoring) void handleConfirmRestore()
        }}
        onCancel={() => {
          if (!restoring) setPendingRestore(null)
        }}
      >
        {pendingRestore ? <SummaryList summary={summarizeBackup(pendingRestore)} /> : null}
        {restoring ? <p className="mt-3 text-[13px] font-semibold text-brand">{restoreStep}…</p> : null}
      </ConfirmDialog>
    </div>
  )
}
