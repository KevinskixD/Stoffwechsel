import { useEffect, useState } from 'react'
import { FormField, formInputClass } from '../../shared/components/FormField'
import { PageHeader } from '../../shared/components/PageHeader'
import { useToast } from '../../shared/components/ToastProvider'
import { renderNotificationText } from '../../shared/utils/notificationTemplate'
import { saveLoanNotificationSettings } from './api'
import { useNotificationSettings } from './hooks'

export function LoanNotificationSettingsPage() {
  const { data: settings, loading } = useNotificationSettings()
  const [greetingTemplate, setGreetingTemplate] = useState(settings.loanGreetingTemplate)
  const [lineTemplate, setLineTemplate] = useState(settings.loanLineTemplate)
  const [initialized, setInitialized] = useState(false)
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    if (loading || initialized) return
    setGreetingTemplate(settings.loanGreetingTemplate)
    setLineTemplate(settings.loanLineTemplate)
    setInitialized(true)
  }, [loading, initialized, settings])

  const preview = renderNotificationText(greetingTemplate, lineTemplate, 'Mustermann, Max', [
    { quantity: 1, articleName: 'Jacke Herren M', articleSize: 'M', pickupLocationName: 'Lager', issuedDate: '15.09.2026' },
  ])

  async function save() {
    setSaving(true)
    try {
      await saveLoanNotificationSettings({ loanGreetingTemplate: greetingTemplate, loanLineTemplate: lineTemplate })
      showToast('Gespeichert.', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Speichern fehlgeschlagen.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="p-6 text-gray-400">Lädt…</p>

  return (
    <div className="px-4 pt-[4.5rem] pb-10 lg:px-11 lg:pt-9 lg:pb-15">
      <PageHeader title="Leihgabe-Benachrichtigung" subtitle="Vorlage für die Bitte um Rückgabe bearbeiten" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <FormField label="Mitteilung (Platzhalter: {{NAME}}, {{VORNAME}}, {{NACHNAME}}, {{POSITIONEN}})">
            <textarea value={greetingTemplate} onChange={(event) => setGreetingTemplate(event.target.value)}
              rows={12} className={`${formInputClass} font-mono`} />
          </FormField>
          <FormField label="Zeilen-Vorlage pro Leihgabe (Platzhalter: {{MENGE}}, {{ARTIKEL}}, {{GROESSE}}, {{AUSGABEDATUM}})">
            <input value={lineTemplate} onChange={(event) => setLineTemplate(event.target.value)}
              className={`${formInputClass} font-mono`} />
          </FormField>
          <button type="button" disabled={saving} onClick={save}
            className="rounded-lg bg-brand px-4.5 py-2.5 text-[13.5px] font-bold text-white hover:bg-brand-dark disabled:opacity-50">
            {saving ? 'Speichert…' : 'Speichern'}
          </button>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-black/55">Vorschau (Beispieldaten)</label>
          <pre className="whitespace-pre-wrap rounded-lg border border-black/[0.14] bg-surface p-4 text-[13.5px] text-gray-900">
            {preview}
          </pre>
        </div>
      </div>
    </div>
  )
}
