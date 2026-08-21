import { useEffect, useState } from 'react'
import { FormField, formInputClass } from '../../shared/components/FormField'
import { PageHeader } from '../../shared/components/PageHeader'
import { useToast } from '../../shared/components/ToastProvider'
import { renderNotificationText } from '../../shared/utils/notificationTemplate'
import { useOrderStatuses } from '../orderStatuses/hooks'
import { saveNotificationSettings } from './api'
import { useNotificationSettings } from './hooks'

const PREVIEW_LINES = [
  { quantity: 2, articleName: 'T-Shirt Herren M', articleSize: 'M', pickupLocationName: 'Lager A' },
  { quantity: 1, articleName: 'Pullover Damen L', articleSize: 'L', pickupLocationName: 'Büro' },
]

export function NotificationSettingsPage() {
  const { data: settings, loading } = useNotificationSettings()
  const { data: statuses } = useOrderStatuses(true)

  const [greetingTemplate, setGreetingTemplate] = useState(settings.greetingTemplate)
  const [lineTemplate, setLineTemplate] = useState(settings.lineTemplate)
  const [triggerStatusId, setTriggerStatusId] = useState(settings.triggerStatusId)
  const [targetStatusId, setTargetStatusId] = useState(settings.targetStatusId)
  const [initialized, setInitialized] = useState(false)
  const { showToast } = useToast()

  // Once settings load, seed local editable state — and if trigger/target were never configured,
  // suggest statuses literally named "Abholbereit"/"Informiert" as a one-time convenience default
  // (not written until Save; status names stay fully user-editable data everywhere else).
  useEffect(() => {
    if (loading || initialized) return
    setGreetingTemplate(settings.greetingTemplate)
    setLineTemplate(settings.lineTemplate)
    setTriggerStatusId(settings.triggerStatusId || statuses.find((s) => s.name === 'Abholbereit')?.id || '')
    setTargetStatusId(settings.targetStatusId || statuses.find((s) => s.name === 'Informiert')?.id || '')
    setInitialized(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, statuses])

  const previewText = renderNotificationText(greetingTemplate, lineTemplate, 'Mustermann, Max', PREVIEW_LINES)

  async function handleSave() {
    await saveNotificationSettings({ greetingTemplate, lineTemplate, triggerStatusId, targetStatusId })
    showToast('Gespeichert.', 'success')
  }

  if (loading) return <p className="p-6 text-gray-400">Lädt…</p>

  return (
    <div className="px-4 pt-[4.5rem] pb-10 lg:px-11 lg:pt-9 lg:pb-15">
      <PageHeader
        title="Einstellungen"
        subtitle="Benachrichtigungstext und Status für die Abholbereit-Notifizierung konfigurieren"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <FormField label="Auslösender Status (Bestellungen gelten als abholbereit)">
            <select
              value={triggerStatusId}
              onChange={(e) => setTriggerStatusId(e.target.value)}
              className={formInputClass}
            >
              <option value="">Kein Status ausgewählt</option>
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {!s.active ? ' (inaktiv)' : ''}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Zielstatus nach Bestätigung">
            <select
              value={targetStatusId}
              onChange={(e) => setTargetStatusId(e.target.value)}
              className={formInputClass}
            >
              <option value="">Kein Status ausgewählt</option>
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {!s.active ? ' (inaktiv)' : ''}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Begrüßungstext (Platzhalter: {{NAME}}, {{VORNAME}}, {{NACHNAME}}, {{POSITIONEN}})">
            <textarea
              value={greetingTemplate}
              onChange={(e) => setGreetingTemplate(e.target.value)}
              rows={9}
              className={`${formInputClass} font-mono`}
            />
          </FormField>

          <FormField label="Zeilen-Vorlage pro Position (Platzhalter: {{MENGE}}, {{ARTIKEL}}, {{GROESSE}}, {{ABHOLORT}})">
            <input
              type="text"
              value={lineTemplate}
              onChange={(e) => setLineTemplate(e.target.value)}
              className={`${formInputClass} font-mono`}
            />
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

        <div>
          <label className="mb-1.5 block text-xs font-bold text-black/55">Vorschau (Beispieldaten)</label>
          <pre className="whitespace-pre-wrap rounded-lg border border-black/[0.14] bg-surface p-4 text-[13.5px] text-gray-900">
            {previewText}
          </pre>
        </div>
      </div>
    </div>
  )
}
