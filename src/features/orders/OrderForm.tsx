import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useArticles } from '../articles/hooks'
import { useEmployees } from '../employees/hooks'
import { useOrderStatuses } from '../orderStatuses/hooks'
import { Autocomplete, type AutocompleteOption } from '../../shared/components/Autocomplete'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog'
import { FormCard, FormField, formInputClass } from '../../shared/components/FormField'
import { todayISO } from '../../shared/utils/date'
import { articleDisplayLabel } from '../../types/article'
import { employeeDisplayName } from '../../types/employee'
import type { OrderInput } from '../../types/order'
import { createOrder, getOrder, updateOrder } from './api'

interface FormState {
  employeeId: string
  employeeName: string
  articleId: string
  articleName: string
  articleNumber: string
  articleSize: string
  pickupLocationName: string
  quantity: string
  statusId: string
  status: string
  orderDate: string
}

const emptyForm: FormState = {
  employeeId: '',
  employeeName: '',
  articleId: '',
  articleName: '',
  articleNumber: '',
  articleSize: '',
  pickupLocationName: '',
  quantity: '1',
  statusId: '',
  status: '',
  orderDate: todayISO(),
}

export function OrderForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const { data: employees } = useEmployees(false)
  const { data: articles } = useArticles(false)
  const { data: statuses } = useOrderStatuses(false)

  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(isEdit)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [original, setOriginal] = useState<{ articleId: string; quantity: number } | null>(null)
  const [pendingConfirm, setPendingConfirm] = useState<{
    payload: OrderInput
    articleName: string
    projected: number
  } | null>(null)

  useEffect(() => {
    if (!id) return
    getOrder(id).then((order) => {
      if (order) {
        setForm({
          employeeId: order.employeeId,
          employeeName: order.employeeName,
          articleId: order.articleId,
          articleName: order.articleName,
          articleNumber: order.articleNumber,
          articleSize: order.articleSize ?? '',
          pickupLocationName: order.pickupLocationName ?? '',
          quantity: String(order.quantity),
          statusId: order.statusId,
          status: order.status,
          orderDate: order.orderDate,
        })
        setOriginal({ articleId: order.articleId, quantity: order.quantity })
      }
      setLoading(false)
    })
  }, [id])

  // Active master data for selection, plus the record currently assigned to this order even
  // if it has since been deactivated — editing an order must not force a new pick just
  // because an unrelated employee/article/status was deactivated afterwards.
  const employeeOptions: AutocompleteOption<null>[] = employees.map((e) => ({
    value: e.id,
    label: employeeDisplayName(e),
    data: null,
  }))
  if (form.employeeId && !employeeOptions.some((o) => o.value === form.employeeId)) {
    employeeOptions.unshift({ value: form.employeeId, label: `${form.employeeName} (inaktiv)`, data: null })
  }

  const articleOptions: AutocompleteOption<null>[] = articles.map((a) => ({
    value: a.id,
    label: articleDisplayLabel(a),
    data: null,
  }))
  if (form.articleId && !articleOptions.some((o) => o.value === form.articleId)) {
    articleOptions.unshift({ value: form.articleId, label: `${form.articleName} (inaktiv)`, data: null })
  }

  const statusOptions = [...statuses]
  if (form.statusId && !statusOptions.some((s) => s.id === form.statusId)) {
    statusOptions.unshift({
      id: form.statusId,
      name: `${form.status} (inaktiv)`,
      sortOrder: -1,
      active: false,
      color: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  const selectedArticle = articles.find((a) => a.id === form.articleId)

  /** Stock the selected article would have after this order is saved, or null if it isn't tracked. */
  function projectedStock(quantity: number): number | null {
    if (!selectedArticle || !selectedArticle.trackInventory) return null
    const sameArticleAsOriginal = isEdit && original && original.articleId === selectedArticle.id
    return sameArticleAsOriginal
      ? selectedArticle.inventoryQuantity - (quantity - original!.quantity)
      : selectedArticle.inventoryQuantity - quantity
  }

  async function doSave(payload: OrderInput) {
    setSaving(true)
    try {
      if (isEdit && id) {
        await updateOrder(id, payload)
      } else {
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

    const quantity = Number(form.quantity)
    if (!form.employeeId || !form.articleId || !form.statusId || !form.orderDate) {
      setError('Bitte alle Felder ausfüllen.')
      return
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setError('Menge muss eine positive ganze Zahl sein.')
      return
    }

    const payload: OrderInput = {
      employeeId: form.employeeId,
      employeeName: form.employeeName,
      articleId: form.articleId,
      articleName: form.articleName,
      articleNumber: form.articleNumber,
      articleSize: form.articleSize,
      pickupLocationName: form.pickupLocationName,
      quantity,
      statusId: form.statusId,
      status: form.status,
      orderDate: form.orderDate,
    }

    const projected = projectedStock(quantity)
    if (projected !== null && projected < 0) {
      setPendingConfirm({ payload, articleName: form.articleName, projected })
      return
    }

    await doSave(payload)
  }

  if (loading) return <p className="p-6 text-gray-400">Lädt…</p>

  return (
    <FormCard title={isEdit ? 'Bestellung bearbeiten' : 'Neue Bestellung'} subtitle="Bestellungen · Neuer Eintrag">
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <FormField label="Mitarbeiter">
          <Autocomplete
            options={employeeOptions}
            value={form.employeeId || null}
            onChange={(value, option) =>
              setForm({ ...form, employeeId: value, employeeName: option?.label.replace(' (inaktiv)', '') ?? '' })
            }
            placeholder="Mitarbeiter auswählen…"
          />
        </FormField>

        <FormField label="Artikel">
          <Autocomplete
            options={articleOptions}
            value={form.articleId || null}
            onChange={(value) => {
              const selected = articles.find((a) => a.id === value)
              setForm({
                ...form,
                articleId: value,
                articleName: selected?.articleName ?? form.articleName,
                articleNumber: selected?.articleNumber ?? form.articleNumber,
                articleSize: selected?.size ?? '',
                pickupLocationName: selected?.pickupLocationName ?? '',
              })
            }}
            placeholder="Artikel auswählen…"
          />
          {selectedArticle?.trackInventory ? (
            (() => {
              const quantity = Number(form.quantity)
              const projected = Number.isInteger(quantity) && quantity > 0 ? projectedStock(quantity) : null
              return (
                <p className="mt-1 text-[12.5px] text-black/45">
                  Lagerbestand: {selectedArticle.inventoryQuantity}
                  {projected !== null ? (
                    <>
                      {' · nach dieser Bestellung: '}
                      <span className={projected < 0 ? 'font-bold text-red-600' : undefined}>{projected}</span>
                    </>
                  ) : null}
                </p>
              )
            })()
          ) : null}
        </FormField>

        <FormField label="Menge">
          <input
            type="number"
            min={1}
            step={1}
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            className={formInputClass}
          />
        </FormField>

        <FormField label="Status">
          <select
            value={form.statusId}
            onChange={(e) => {
              const selected = statusOptions.find((s) => s.id === e.target.value)
              setForm({ ...form, statusId: e.target.value, status: selected?.name.replace(' (inaktiv)', '') ?? '' })
            }}
            className={formInputClass}
          >
            <option value="" disabled>
              Status auswählen…
            </option>
            {statusOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Bestelldatum">
          <input
            type="date"
            value={form.orderDate}
            onChange={(e) => setForm({ ...form, orderDate: e.target.value })}
            className={formInputClass}
          />
        </FormField>

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
            Speichern
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={pendingConfirm !== null}
        title="Bestand würde negativ werden"
        message={
          pendingConfirm
            ? `Der Lagerbestand von "${pendingConfirm.articleName}" würde auf ${pendingConfirm.projected} sinken. Trotzdem speichern?`
            : ''
        }
        confirmLabel="Trotzdem speichern"
        onConfirm={() => {
          if (pendingConfirm) void doSave(pendingConfirm.payload)
          setPendingConfirm(null)
        }}
        onCancel={() => setPendingConfirm(null)}
      />
    </FormCard>
  )
}
