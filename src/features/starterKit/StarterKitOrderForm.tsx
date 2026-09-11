import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Autocomplete, type AutocompleteOption } from '../../shared/components/Autocomplete'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog'
import { FormField, formInputClass } from '../../shared/components/FormField'
import { todayISO } from '../../shared/utils/date'
import { articleDisplayLabel } from '../../types/article'
import { employeeDisplayName } from '../../types/employee'
import { hasOrderStatusSemanticKey } from '../../types/orderStatus'
import type { OrderInput } from '../../types/order'
import { useArticles } from '../articles/hooks'
import { useEmployees } from '../employees/hooks'
import { useOrderStatuses } from '../orderStatuses/hooks'
import { createOrder } from '../orders/api'
import { useStarterKitCategories } from './hooks'

interface PendingLine {
  articleId: string
  articleName: string
  articleNumber: string
  articleSize: string
  pickupLocationName: string
  projected: number | null
}

export function StarterKitOrderForm() {
  const navigate = useNavigate()
  const { data: employees } = useEmployees(false)
  const { data: articles } = useArticles(true)
  const { data: statuses } = useOrderStatuses(false)
  const { data: categories, loading: categoriesLoading } = useStarterKitCategories()

  const [employeeId, setEmployeeId] = useState('')
  const [employeeName, setEmployeeName] = useState('')
  const [orderDate, setOrderDate] = useState(todayISO())
  const [statusId, setStatusId] = useState('')
  const [status, setStatus] = useState('')
  const [included, setIncluded] = useState<Record<string, boolean>>({})
  const [selectedArticleId, setSelectedArticleId] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [pendingLines, setPendingLines] = useState<PendingLine[] | null>(null)

  useEffect(() => {
    if (statusId || statuses.length === 0) return
    const defaultStatus = statuses.find((s) => hasOrderStatusSemanticKey(s, 'to_order')) ?? statuses[0]
    setStatusId(defaultStatus.id)
    setStatus(defaultStatus.name)
  }, [statusId, statuses])

  // Seed defaults for newly-seen categories without clobbering choices already made in this form.
  useEffect(() => {
    setIncluded((prev) => {
      const next = { ...prev }
      let changed = false
      for (const category of categories) {
        if (!(category.id in next)) {
          next[category.id] = category.articleIds.length > 0
          changed = true
        }
      }
      return changed ? next : prev
    })
    setSelectedArticleId((prev) => {
      const next = { ...prev }
      let changed = false
      for (const category of categories) {
        if (category.id in next) continue
        const firstValid = category.articleIds.find((id) => articles.some((a) => a.id === id))
        if (firstValid) {
          next[category.id] = firstValid
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [categories, articles])

  const employeeOptions: AutocompleteOption<null>[] = employees.map((e) => ({
    value: e.id,
    label: employeeDisplayName(e),
    data: null,
  }))

  function buildLines(): PendingLine[] {
    return categories
      .filter((c) => included[c.id])
      .map((c) => {
        const article = articles.find((a) => a.id === selectedArticleId[c.id])
        if (!article) return null
        return {
          articleId: article.id,
          articleName: article.articleName,
          articleNumber: article.articleNumber,
          articleSize: article.size,
          pickupLocationName: article.pickupLocationName,
          projected: article.trackInventory ? article.inventoryQuantity - 1 : null,
        }
      })
      .filter((line): line is PendingLine => line !== null)
  }

  async function submitLines(lines: PendingLine[]) {
    setSaving(true)
    try {
      for (const line of lines) {
        const payload: OrderInput = {
          employeeId,
          employeeName,
          articleId: line.articleId,
          articleName: line.articleName,
          articleNumber: line.articleNumber,
          comment: '',
          articleSize: line.articleSize,
          pickupLocationName: line.pickupLocationName,
          quantity: 1,
          statusId,
          status,
          orderDate,
          exchangedFromOrderId: '',
          exchangedFromArticleName: '',
          exchangedToOrderId: '',
          exchangedToArticleName: '',
        }
        await createOrder(payload)
      }
      navigate('/orders')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!employeeId || !statusId || !orderDate) {
      setError('Bitte Mitarbeiter, Status und Datum angeben.')
      return
    }
    const lines = buildLines()
    if (lines.length === 0) {
      setError('Bitte mindestens eine Kategorie auswählen.')
      return
    }

    const hasNegative = lines.some((l) => l.projected !== null && l.projected < 0)
    if (hasNegative) {
      setPendingLines(lines)
      return
    }

    await submitLines(lines)
  }

  if (categoriesLoading) return <p className="p-6 text-gray-400">Lädt…</p>

  return (
    <div className="px-4 pt-[4.5rem] pb-10 lg:px-11 lg:pt-9 lg:pb-15">
      <div className="mx-auto w-full max-w-[560px] rounded-2xl bg-surface p-7 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <h1 className="mb-1 text-[17px] font-extrabold text-gray-900">Basisausrüstung bestellen</h1>
        <p className="mb-5 text-[13px] text-black/45">Bestellungen · Basisausrüstung für einen Mitarbeiter anlegen</p>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <FormField label="Mitarbeiter">
            <Autocomplete
              options={employeeOptions}
              value={employeeId || null}
              onChange={(value, option) => {
                setEmployeeId(value)
                setEmployeeName(option?.label ?? '')
              }}
              placeholder="Mitarbeiter auswählen…"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Status">
              <select
                value={statusId}
                onChange={(e) => {
                  const selected = statuses.find((s) => s.id === e.target.value)
                  setStatusId(e.target.value)
                  setStatus(selected?.name ?? '')
                }}
                className={formInputClass}
              >
                {!statusId && (
                  <option value="" disabled>
                    Status auswählen…
                  </option>
                )}
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Bestelldatum">
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className={formInputClass}
              />
            </FormField>
          </div>

          <div className="rounded-xl border border-black/[0.08]">
            {categories.length === 0 ? (
              <p className="p-4 text-[13px] text-black/45">
                Keine Kategorien definiert. Siehe Einstellungen → Basisausrüstung.
              </p>
            ) : (
              <ul className="divide-y divide-black/[0.06]">
                {categories.map((category) => {
                  const validArticles = category.articleIds
                    .map((id) => articles.find((a) => a.id === id))
                    .filter((a): a is NonNullable<typeof a> => Boolean(a))

                  if (validArticles.length === 0) {
                    return (
                      <li key={category.id} className="flex items-center gap-3 px-4 py-2.5 opacity-50">
                        <input type="checkbox" disabled className="size-4 rounded border-black/20" />
                        <span className="flex-1 text-[13.5px] font-semibold text-gray-900">{category.label}</span>
                        <span className="text-[12.5px] text-black/45">Keine Artikel zugeordnet</span>
                      </li>
                    )
                  }

                  const isIncluded = included[category.id] ?? true

                  return (
                    <li key={category.id} className="flex items-center gap-3 px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={isIncluded}
                        onChange={(e) => setIncluded((prev) => ({ ...prev, [category.id]: e.target.checked }))}
                        className="size-4 rounded border-black/20 accent-brand"
                      />
                      <span className="flex-1 text-[13.5px] font-semibold text-gray-900">{category.label}</span>
                      <select
                        value={selectedArticleId[category.id] ?? validArticles[0].id}
                        onChange={(e) => setSelectedArticleId((prev) => ({ ...prev, [category.id]: e.target.value }))}
                        disabled={!isIncluded}
                        className="rounded-lg border border-black/[0.14] px-3 py-1.5 text-[13.5px] disabled:opacity-50"
                      >
                        {validArticles.map((article) => (
                          <option key={article.id} value={article.id}>
                            {(article.size || articleDisplayLabel(article)) + (article.active ? '' : ' (inaktiv)')}
                          </option>
                        ))}
                      </select>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {error ? <p className="text-[13px] text-red-600">{error}</p> : null}

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => navigate('/orders')}
              className="rounded-lg border border-black/[0.12] px-4.5 py-2.5 text-[13.5px] font-bold text-gray-900"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand px-4.5 py-2.5 text-[13.5px] font-bold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              Bestellen
            </button>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={pendingLines !== null}
        title="Bestand würde negativ werden"
        message={
          pendingLines
            ? `Folgende Artikel würden negativ werden: ${pendingLines
                .filter((l) => l.projected !== null && l.projected < 0)
                .map((l) => `${l.articleName} → ${l.projected}`)
                .join(', ')}. Trotzdem bestellen?`
            : ''
        }
        confirmLabel="Trotzdem bestellen"
        onConfirm={() => {
          const lines = pendingLines
          setPendingLines(null)
          if (lines) void submitLines(lines)
        }}
        onCancel={() => setPendingLines(null)}
      />
    </div>
  )
}
