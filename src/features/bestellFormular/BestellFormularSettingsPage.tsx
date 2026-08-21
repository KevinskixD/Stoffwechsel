import ExcelJS from 'exceljs'
import { useEffect, useState } from 'react'
import { FormField, formInputClass } from '../../shared/components/FormField'
import { PageHeader } from '../../shared/components/PageHeader'
import { useToast } from '../../shared/components/ToastProvider'
import { fileToBase64 } from '../../shared/utils/file'
import { emptyTableMapping, type TableMapping } from '../../types/bestellFormularSettings'
import { useOrderStatuses } from '../orderStatuses/hooks'
import { saveBestellFormularSettings } from './api'
import { useBestellFormularSettings } from './hooks'
import { detectMapping } from './templateMapping'

const numberInputClass = `${formInputClass} w-20`
const columnInputClass = `${formInputClass} w-16 uppercase`

function TableMappingFields({
  label,
  mapping,
  onChange,
  showArtikelNr,
}: {
  label: string
  mapping: TableMapping
  onChange: (next: TableMapping) => void
  showArtikelNr: boolean
}) {
  function set<K extends keyof TableMapping>(key: K, value: TableMapping[K]) {
    onChange({ ...mapping, [key]: value })
  }

  return (
    <div className="rounded-lg border border-black/[0.12] p-4">
      <p className="mb-3 text-[13px] font-bold text-gray-900">{label}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <FormField label="Startzeile">
          <input
            type="number"
            value={mapping.startRow}
            onChange={(e) => set('startRow', Number(e.target.value))}
            className={numberInputClass}
          />
        </FormField>
        <FormField label="Endzeile">
          <input
            type="number"
            value={mapping.endRow}
            onChange={(e) => set('endRow', Number(e.target.value))}
            className={numberInputClass}
          />
        </FormField>
        {showArtikelNr ? (
          <FormField label="Artikel-Nr. Spalte">
            <input
              type="text"
              value={mapping.artikelNrColumn}
              onChange={(e) => set('artikelNrColumn', e.target.value.toUpperCase())}
              className={columnInputClass}
            />
          </FormField>
        ) : (
          <FormField label="Bezeichnung Spalte">
            <input
              type="text"
              value={mapping.bezeichnungColumn}
              onChange={(e) => set('bezeichnungColumn', e.target.value.toUpperCase())}
              className={columnInputClass}
            />
          </FormField>
        )}
        <FormField label="Menge Spalte">
          <input
            type="text"
            value={mapping.mengeColumn}
            onChange={(e) => set('mengeColumn', e.target.value.toUpperCase())}
            className={columnInputClass}
          />
        </FormField>
        <FormField label="Name Spalte">
          <input
            type="text"
            value={mapping.nameColumn}
            onChange={(e) => set('nameColumn', e.target.value.toUpperCase())}
            className={columnInputClass}
          />
        </FormField>
        <FormField label="B/O/S Spalte">
          <input
            type="text"
            value={mapping.bosColumn}
            onChange={(e) => set('bosColumn', e.target.value.toUpperCase())}
            className={columnInputClass}
          />
        </FormField>
      </div>
    </div>
  )
}

export function BestellFormularSettingsPage() {
  const { data: settings, loading } = useBestellFormularSettings()
  const { data: statuses } = useOrderStatuses(true)

  const [templateBase64, setTemplateBase64] = useState('')
  const [templateFileName, setTemplateFileName] = useState('')
  const [sheetName, setSheetName] = useState('')
  const [datumCell, setDatumCell] = useState('')
  const [ortsstelleCell, setOrtsstelleCell] = useState('')
  const [ortsstelle, setOrtsstelle] = useState('')
  const [upperTable, setUpperTable] = useState<TableMapping>(emptyTableMapping())
  const [lowerTable, setLowerTable] = useState<TableMapping>(emptyTableMapping())
  const [triggerStatusId, setTriggerStatusId] = useState('')
  const [targetStatusId, setTargetStatusId] = useState('')
  const [initialized, setInitialized] = useState(false)
  const [detectError, setDetectError] = useState('')
  const { showToast } = useToast()

  useEffect(() => {
    if (loading || initialized) return
    setTemplateBase64(settings.templateBase64)
    setTemplateFileName(settings.templateFileName)
    setSheetName(settings.sheetName)
    setDatumCell(settings.datumCell)
    setOrtsstelleCell(settings.ortsstelleCell)
    setOrtsstelle(settings.ortsstelle)
    setUpperTable(settings.upperTable)
    setLowerTable(settings.lowerTable)
    setTriggerStatusId(settings.triggerStatusId || statuses.find((s) => s.name === 'Zu Bestellen')?.id || '')
    setTargetStatusId(settings.targetStatusId || statuses.find((s) => s.name === 'Bestellt')?.id || '')
    setInitialized(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, statuses])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setDetectError('')
    try {
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(await file.arrayBuffer())
      const worksheet = workbook.worksheets[0]
      if (!worksheet) throw new Error('Keine Tabellenblätter in der Datei gefunden.')
      const detected = detectMapping(worksheet)
      setSheetName(detected.sheetName)
      setDatumCell(detected.datumCell)
      setOrtsstelleCell(detected.ortsstelleCell)
      setUpperTable(detected.upperTable)
      setLowerTable(detected.lowerTable)
    } catch (err) {
      setDetectError(err instanceof Error ? err.message : 'Vorlage konnte nicht gelesen werden.')
    }
    setTemplateBase64(await fileToBase64(file))
    setTemplateFileName(file.name)
  }

  async function handleSave() {
    await saveBestellFormularSettings({
      templateBase64,
      templateFileName,
      sheetName,
      datumCell,
      ortsstelleCell,
      ortsstelle,
      upperTable,
      lowerTable,
      triggerStatusId,
      targetStatusId,
    })
    showToast('Gespeichert.', 'success')
  }

  if (loading) return <p className="p-6 text-gray-400">Lädt…</p>

  return (
    <div className="px-4 pt-[4.5rem] pb-10 lg:px-11 lg:pt-9 lg:pb-15">
      <PageHeader
        title="Bestellformular"
        subtitle="Excel-Vorlage für die Bestelldatei-Generierung hochladen und Zellenzuordnung prüfen"
      />

      <div className="max-w-2xl space-y-5">
        <FormField label="Vorlage (.xlsx)">
          <input
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            className="block text-[13px] text-black/65 file:mr-3.5 file:rounded-lg file:border-0 file:bg-brand/10 file:px-4 file:py-2 file:text-[13px] file:font-bold file:text-brand hover:file:bg-brand/15"
          />
          {templateFileName ? (
            <p className="mt-1.5 text-[13px] text-black/45">Aktuell gespeichert: {templateFileName}</p>
          ) : (
            <p className="mt-1.5 text-[13px] text-black/45">Noch keine Vorlage hochgeladen.</p>
          )}
          {detectError ? <p className="mt-1.5 text-[13px] font-semibold text-red-600">{detectError}</p> : null}
        </FormField>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <FormField label="Tabellenblatt">
            <input type="text" value={sheetName} onChange={(e) => setSheetName(e.target.value)} className={formInputClass} />
          </FormField>
          <FormField label="Datum-Zelle">
            <input
              type="text"
              value={datumCell}
              onChange={(e) => setDatumCell(e.target.value.toUpperCase())}
              className={formInputClass}
            />
          </FormField>
          <FormField label="Ortsstelle-Zelle">
            <input
              type="text"
              value={ortsstelleCell}
              onChange={(e) => setOrtsstelleCell(e.target.value.toUpperCase())}
              className={formInputClass}
            />
          </FormField>
        </div>

        <FormField label="Ortsstelle">
          <input type="text" value={ortsstelle} onChange={(e) => setOrtsstelle(e.target.value)} className={formInputClass} />
        </FormField>

        <TableMappingFields label="Tabelle mit Artikel-Nr." mapping={upperTable} onChange={setUpperTable} showArtikelNr />
        <TableMappingFields label="Freitext-Tabelle (ohne Artikel-Nr.)" mapping={lowerTable} onChange={setLowerTable} showArtikelNr={false} />

        <FormField label="Auslösender Status (Bestellungen gelten als zu bestellen)">
          <select value={triggerStatusId} onChange={(e) => setTriggerStatusId(e.target.value)} className={formInputClass}>
            <option value="">Kein Status ausgewählt</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {!s.active ? ' (inaktiv)' : ''}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Zielstatus nach Generierung">
          <select value={targetStatusId} onChange={(e) => setTargetStatusId(e.target.value)} className={formInputClass}>
            <option value="">Kein Status ausgewählt</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {!s.active ? ' (inaktiv)' : ''}
              </option>
            ))}
          </select>
        </FormField>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-brand px-4.5 py-2.5 text-[13.5px] font-bold text-white hover:bg-brand-dark"
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  )
}
