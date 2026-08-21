import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ActiveBadge } from '../../shared/components/ActiveBadge'
import { ActiveToggleFilter } from '../../shared/components/ActiveToggleFilter'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog'
import { DataTable, type DataTableColumn } from '../../shared/components/DataTable'
import { EditableCell } from '../../shared/components/EditableCell'
import { PageHeader, PrimaryLinkButton } from '../../shared/components/PageHeader'
import { SearchInput } from '../../shared/components/SearchInput'
import { useRowSelection } from '../../shared/hooks/useRowSelection'
import { matchesAllTokens } from '../../shared/utils/search'
import type { Employee } from '../../types/employee'
import {
  deleteAllEmployees,
  deleteEmployee,
  deleteEmployees,
  setEmployeeActive,
  swapEmployeeNames,
  updateEmployeeField,
} from './api'
import { useEmployees } from './hooks'

type PendingDelete = { kind: 'single'; employee: Employee } | { kind: 'bulk'; ids: string[] } | { kind: 'all' }

export function EmployeeListPage() {
  const [showInactive, setShowInactive] = useState(false)
  const [search, setSearch] = useState('')
  const [pendingDeactivate, setPendingDeactivate] = useState<Employee | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [pendingSwap, setPendingSwap] = useState<Employee[] | null>(null)
  const { data: employees, loading } = useEmployees(showInactive)

  const filtered = employees.filter((e) => matchesAllTokens(search, e.firstName, e.lastName, e.personnelNumber))
  const selection = useRowSelection(filtered)

  const columns: DataTableColumn<Employee>[] = [
    selection.column,
    {
      key: 'name',
      header: 'Name',
      render: (e) => (
        <span className="inline-flex items-center gap-1">
          <EditableCell
            value={e.lastName}
            onCommit={(v) => {
              if (v) void updateEmployeeField(e.id, 'lastName', v)
            }}
          />
          <span>,</span>
          <EditableCell
            value={e.firstName}
            onCommit={(v) => {
              if (v) void updateEmployeeField(e.id, 'firstName', v)
            }}
          />
        </span>
      ),
    },
    {
      key: 'personnelNumber',
      header: 'Personalnummer',
      render: (e) => (
        <EditableCell value={e.personnelNumber} onCommit={(v) => void updateEmployeeField(e.id, 'personnelNumber', v)} />
      ),
    },
    { key: 'status', header: 'Status', render: (e) => <ActiveBadge active={e.active} /> },
    {
      key: 'actions',
      header: '',
      render: (e) => (
        <div className="flex gap-4 text-[13px] font-semibold">
          <Link to={`/employees/${e.id}/edit`} className="text-brand hover:underline">
            Bearbeiten
          </Link>
          {e.active ? (
            <button type="button" onClick={() => setPendingDeactivate(e)} className="text-black/45 hover:underline">
              Deaktivieren
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEmployeeActive(e.id, true)}
              className="text-black/45 hover:underline"
            >
              Reaktivieren
            </button>
          )}
          <button
            type="button"
            onClick={() => setPendingDelete({ kind: 'single', employee: e })}
            className="text-red-600 hover:underline"
          >
            Löschen
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="px-4 pt-[4.5rem] pb-10 lg:px-11 lg:pt-9 lg:pb-15">
      <PageHeader
        title="Mitarbeiter"
        subtitle="Stammdaten für die Auswahl im Bestellformular"
        action={
          <>
            <Link
              to="/employees/import"
              className="rounded-lg border border-black/[0.12] px-4 py-2.5 text-[13.5px] font-bold text-gray-900"
            >
              Excel-Import
            </Link>
            <button
              type="button"
              onClick={() => setPendingDelete({ kind: 'all' })}
              className="rounded-lg border border-red-300 px-4 py-2.5 text-[13.5px] font-bold text-red-600"
            >
              Alle löschen
            </button>
            <PrimaryLinkButton to="/employees/new">+ Neuer Mitarbeiter</PrimaryLinkButton>
          </>
        }
      />

      <div className="mb-4.5 flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Name oder Personalnummer…" />
        <ActiveToggleFilter showInactive={showInactive} onChange={setShowInactive} />
        {selection.selectedCount > 0 && (
          <>
            <button
              type="button"
              onClick={() => setPendingSwap(filtered.filter((e) => selection.selectedIds.has(e.id)))}
              className="rounded-lg border border-black/[0.12] px-3.5 py-1.5 text-[13px] font-bold text-gray-900"
            >
              Vor-/Nachname tauschen
            </button>
            <button
              type="button"
              onClick={() => setPendingDelete({ kind: 'bulk', ids: Array.from(selection.selectedIds) })}
              className="rounded-lg border border-red-300 px-3.5 py-1.5 text-[13px] font-bold text-red-600"
            >
              {selection.selectedCount} ausgewählt löschen
            </button>
          </>
        )}
        <span className="ml-auto text-xs font-semibold text-black/45">{filtered.length} Einträge</span>
      </div>

      {loading ? (
        <p className="text-gray-400">Lädt…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(e) => e.id}
          onRowClick={(e, ev) => selection.toggleRowClick(e.id, ev.shiftKey)}
          isRowSelected={(e) => selection.selectedIds.has(e.id)}
        />
      )}

      <ConfirmDialog
        open={pendingDeactivate !== null}
        title="Mitarbeiter deaktivieren"
        message={
          pendingDeactivate
            ? `"${pendingDeactivate.lastName}, ${pendingDeactivate.firstName}" wird aus der Auswahl im Bestellformular entfernt. Bestehende Bestellungen bleiben erhalten.`
            : ''
        }
        confirmLabel="Deaktivieren"
        onConfirm={() => {
          if (pendingDeactivate) void setEmployeeActive(pendingDeactivate.id, false)
          setPendingDeactivate(null)
        }}
        onCancel={() => setPendingDeactivate(null)}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title={
          pendingDelete?.kind === 'all'
            ? 'Alle Mitarbeiter löschen'
            : pendingDelete?.kind === 'bulk'
              ? 'Ausgewählte Mitarbeiter löschen'
              : 'Mitarbeiter löschen'
        }
        message={
          pendingDelete?.kind === 'all'
            ? 'Wirklich ALLE Mitarbeiter (aktiv und inaktiv) unwiderruflich löschen? Bestellungen behalten die gespeicherten Mitarbeiterdaten, verweisen aber auf keinen bestehenden Mitarbeiter mehr.'
            : pendingDelete?.kind === 'bulk'
              ? `${pendingDelete.ids.length} ausgewählte Mitarbeiter unwiderruflich löschen? Bestellungen behalten die gespeicherten Mitarbeiterdaten.`
              : pendingDelete?.kind === 'single'
                ? `"${pendingDelete.employee.lastName}, ${pendingDelete.employee.firstName}" unwiderruflich löschen? Bestehende Bestellungen behalten die gespeicherten Mitarbeiterdaten, verweisen aber auf keinen bestehenden Mitarbeiter mehr.`
                : ''
        }
        confirmLabel="Löschen"
        onConfirm={async () => {
          if (!pendingDelete) return
          if (pendingDelete.kind === 'single') await deleteEmployee(pendingDelete.employee.id)
          else if (pendingDelete.kind === 'bulk') {
            await deleteEmployees(pendingDelete.ids)
            selection.clear()
          } else if (pendingDelete.kind === 'all') {
            await deleteAllEmployees()
            selection.clear()
          }
          setPendingDelete(null)
        }}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        open={pendingSwap !== null}
        title="Vor-/Nachname tauschen"
        message={
          pendingSwap
            ? `Bei ${pendingSwap.length} ausgewählten Mitarbeiter(n) Vor- und Nachname vertauschen?`
            : ''
        }
        confirmLabel="Tauschen"
        onConfirm={async () => {
          if (!pendingSwap) return
          await swapEmployeeNames(pendingSwap)
          selection.clear()
          setPendingSwap(null)
        }}
        onCancel={() => setPendingSwap(null)}
      />
    </div>
  )
}
