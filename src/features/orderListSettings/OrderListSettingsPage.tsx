import { useEffect, useState } from 'react'
import { PageHeader } from '../../shared/components/PageHeader'
import { useToast } from '../../shared/components/ToastProvider'
import type { OrderListSettings } from '../../types/orderListSettings'
import { saveOrderListSettings } from './api'
import { useOrderListSettings } from './hooks'

const BUTTONS: { key: keyof Omit<OrderListSettings, 'id' | 'updatedAt'>; label: string }[] = [
  { key: 'showExcelImport', label: 'Excel-Import' },
  { key: 'showEmployeeNameSync', label: 'Mitarbeiternamen abgleichen' },
  { key: 'showPickupLocationSync', label: 'Abholorte abgleichen' },
  { key: 'showArticleDataSync', label: 'Artikeldaten abgleichen' },
  { key: 'showGenerateBestellFile', label: 'Bestelldatei generieren' },
]

export function OrderListSettingsPage() {
  const { data: settings, loading } = useOrderListSettings()
  const [form, setForm] = useState(settings)
  const [initialized, setInitialized] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    if (loading || initialized) return
    setForm(settings)
    setInitialized(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  async function handleSave() {
    await saveOrderListSettings({
      showExcelImport: form.showExcelImport,
      showEmployeeNameSync: form.showEmployeeNameSync,
      showPickupLocationSync: form.showPickupLocationSync,
      showArticleDataSync: form.showArticleDataSync,
      showGenerateBestellFile: form.showGenerateBestellFile,
    })
    showToast('Gespeichert.', 'success')
  }

  if (loading) return <p className="p-6 text-gray-400">Lädt…</p>

  return (
    <div className="px-11 pt-9 pb-15">
      <PageHeader
        title="Aktionsbuttons"
        subtitle="Welche Buttons in der Bestellungen-Toolbar angezeigt werden sollen"
      />

      <div className="max-w-[420px] space-y-3">
        {BUTTONS.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-3 rounded-lg border border-black/[0.12] bg-surface px-4 py-3">
            <input
              type="checkbox"
              checked={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
              className="h-4 w-4 accent-brand"
            />
            <span className="text-[13.5px] font-semibold text-gray-900">{label}</span>
          </label>
        ))}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            className="rounded-lg bg-brand px-4.5 py-2.5 text-[13.5px] font-bold text-white hover:bg-brand-dark"
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  )
}
