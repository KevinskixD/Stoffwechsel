import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FormCard, FormField, formInputClass } from '../../shared/components/FormField'
import { extractSizeFromArticleName } from '../../shared/utils/sizeExtraction'
import type { ArticleInput } from '../../types/article'
import { usePickupLocations } from '../pickupLocations/hooks'
import { createArticle, getArticle, updateArticle } from './api'

const emptyForm: ArticleInput = {
  articleName: '',
  articleNumber: '',
  hasDeductible: false,
  deductibleAmount: 0,
  size: '',
  pickupLocationId: '',
  pickupLocationName: '',
}

export function ArticleForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const { data: pickupLocations } = usePickupLocations(false)

  const [form, setForm] = useState<ArticleInput>(emptyForm)
  const [loading, setLoading] = useState(isEdit)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    getArticle(id).then((article) => {
      if (article) {
        setForm({
          articleName: article.articleName,
          articleNumber: article.articleNumber,
          hasDeductible: article.hasDeductible,
          deductibleAmount: article.deductibleAmount,
          size: article.size || extractSizeFromArticleName(article.articleName),
          pickupLocationId: article.pickupLocationId ?? '',
          pickupLocationName: article.pickupLocationName ?? '',
        })
      }
      setLoading(false)
    })
  }, [id])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!form.articleName.trim()) {
      setError('Bitte eine Artikelbezeichnung angeben.')
      return
    }
    if (form.hasDeductible && !(form.deductibleAmount > 0)) {
      setError('Bitte einen Selbstbehalt-Betrag grösser als 0 angeben.')
      return
    }

    setSaving(true)
    try {
      const payload: ArticleInput = {
        articleName: form.articleName.trim(),
        articleNumber: form.articleNumber.trim(),
        hasDeductible: form.hasDeductible,
        deductibleAmount: form.hasDeductible ? form.deductibleAmount : 0,
        size: form.size.trim(),
        pickupLocationId: form.pickupLocationId,
        pickupLocationName: form.pickupLocationName,
      }
      if (isEdit && id) {
        await updateArticle(id, payload)
      } else {
        await createArticle(payload)
      }
      navigate('/articles')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="p-6 text-gray-400">Lädt…</p>

  return (
    <FormCard title={isEdit ? 'Artikel bearbeiten' : 'Neuer Artikel'} subtitle="Artikel · Stammdaten">
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <FormField label="Artikelbezeichnung">
          <input
            type="text"
            value={form.articleName}
            onChange={(e) => setForm({ ...form, articleName: e.target.value })}
            onBlur={() => {
              if (!form.size) setForm((f) => ({ ...f, size: extractSizeFromArticleName(f.articleName) }))
            }}
            className={formInputClass}
          />
        </FormField>
        <FormField label="Artikelnummer (optional)">
          <input
            type="text"
            value={form.articleNumber}
            onChange={(e) => setForm({ ...form, articleNumber: e.target.value })}
            placeholder="noch keine Nummer"
            className={formInputClass}
          />
        </FormField>

        <FormField label="Größe">
          <input
            type="text"
            value={form.size}
            onChange={(e) => setForm({ ...form, size: e.target.value })}
            placeholder="wird aus dem Namen erkannt"
            className={formInputClass}
          />
        </FormField>

        <FormField label="Abholort">
          <select
            value={form.pickupLocationId}
            onChange={(e) => {
              const selected = pickupLocations.find((l) => l.id === e.target.value)
              setForm({ ...form, pickupLocationId: e.target.value, pickupLocationName: selected?.name ?? '' })
            }}
            className={formInputClass}
          >
            <option value="">Kein Abholort</option>
            {form.pickupLocationId && !pickupLocations.some((l) => l.id === form.pickupLocationId) && (
              <option value={form.pickupLocationId}>{form.pickupLocationName} (inaktiv)</option>
            )}
            {pickupLocations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Selbstbehalt">
          <label className="flex items-center gap-2 text-[13.5px] text-gray-900">
            <input
              type="checkbox"
              checked={form.hasDeductible}
              onChange={(e) => setForm({ ...form, hasDeductible: e.target.checked })}
              className="h-4 w-4 rounded border-black/[0.25] accent-brand"
            />
            Selbstbehalt zu entrichten
          </label>
        </FormField>

        {form.hasDeductible ? (
          <FormField label="Selbstbehalt-Betrag (€)">
            <input
              type="number"
              min="0"
              step="0.05"
              value={form.deductibleAmount}
              onChange={(e) => setForm({ ...form, deductibleAmount: e.target.valueAsNumber || 0 })}
              className={formInputClass}
            />
          </FormField>
        ) : null}

        {error ? <p className="text-[13px] text-red-600">{error}</p> : null}

        <div className="flex justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => navigate('/articles')}
            className="rounded-lg border border-black/[0.12] px-4.5 py-2.5 text-[13.5px] font-bold text-gray-900"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand px-4.5 py-2.5 text-[13.5px] font-bold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            Speichern
          </button>
        </div>
      </form>
    </FormCard>
  )
}
