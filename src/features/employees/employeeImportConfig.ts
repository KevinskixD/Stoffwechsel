import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { buildCompositeKey } from '../../shared/import/compositeKey'
import type { ImportEntityConfig } from '../../shared/import/types'
import type { Employee } from '../../types/employee'

const UNIQUE_KEY_FIELDS = ['firstName', 'lastName', 'personnelNumber']

export const employeeImportConfig: ImportEntityConfig<Employee> = {
  entityLabel: 'Mitarbeiter',
  collectionName: 'employees',
  listPath: '/employees',
  fields: [
    { targetField: 'firstName', label: 'Vorname', required: true, type: 'string' },
    { targetField: 'lastName', label: 'Nachname', required: true, type: 'string' },
    { targetField: 'personnelNumber', label: 'Personalnummer', required: false, type: 'string' },
  ],
  uniqueKeyFields: UNIQUE_KEY_FIELDS,
  fetchExistingKeys: async () => {
    const snapshot = await getDocs(collection(db, 'employees'))
    return new Set(snapshot.docs.map((docSnap) => buildCompositeKey(docSnap.data(), UNIQUE_KEY_FIELDS)))
  },
  mapRowToDoc: (data) => ({
    firstName: data.firstName as string,
    lastName: data.lastName as string,
    personnelNumber: (data.personnelNumber as string | undefined) ?? '',
    active: true,
  }),
}
