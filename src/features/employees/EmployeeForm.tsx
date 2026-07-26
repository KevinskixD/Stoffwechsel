import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FormCard, FormField, formInputClass } from '../../shared/components/FormField'
import type { EmployeeInput } from '../../types/employee'
import { createEmployee, getEmployee, updateEmployee } from './api'

const emptyForm: EmployeeInput = { firstName: '', lastName: '', personnelNumber: '' }

export function EmployeeForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [form, setForm] = useState<EmployeeInput>(emptyForm)
  const [loading, setLoading] = useState(isEdit)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    getEmployee(id).then((employee) => {
      if (employee) setForm(employee)
      setLoading(false)
    })
  }, [id])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('Bitte Vor- und Nachname angeben.')
      return
    }

    setSaving(true)
    try {
      const payload: EmployeeInput = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        personnelNumber: form.personnelNumber.trim(),
      }
      if (isEdit && id) {
        await updateEmployee(id, payload)
      } else {
        await createEmployee(payload)
      }
      navigate('/employees')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="p-6 text-gray-400">Lädt…</p>

  return (
    <FormCard
      title={isEdit ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'}
      subtitle="Mitarbeiter · Stammdaten"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <FormField label="Vorname">
          <input
            type="text"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            className={formInputClass}
          />
        </FormField>
        <FormField label="Nachname">
          <input
            type="text"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            className={formInputClass}
          />
        </FormField>
        <FormField label="Personalnummer (optional)">
          <input
            type="text"
            value={form.personnelNumber}
            onChange={(e) => setForm({ ...form, personnelNumber: e.target.value })}
            placeholder="noch keine Nummer"
            className={formInputClass}
          />
        </FormField>

        {error ? <p className="text-[13px] text-red-600">{error}</p> : null}

        <div className="flex justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => navigate('/employees')}
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
