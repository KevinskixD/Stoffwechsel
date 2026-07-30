import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../../firebase/config'
import { createConverter } from '../../firebase/converters'
import type { Employee, EmployeeInput } from '../../types/employee'

const employeeConverter = createConverter<Employee>()
const employeesCollection = collection(db, 'employees')

const BATCH_SIZE = 500

export function employeesQuery(includeInactive: boolean) {
  const converted = employeesCollection.withConverter(employeeConverter)
  return includeInactive
    ? query(converted, orderBy('lastName'))
    : query(converted, where('active', '==', true), orderBy('lastName'))
}

export async function getEmployee(id: string): Promise<Employee | null> {
  const snapshot = await getDoc(doc(db, 'employees', id).withConverter(employeeConverter))
  return snapshot.exists() ? snapshot.data() : null
}

export async function createEmployee(input: EmployeeInput): Promise<void> {
  await addDoc(employeesCollection, {
    ...input,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateEmployee(id: string, input: EmployeeInput): Promise<void> {
  await updateDoc(doc(db, 'employees', id), {
    ...input,
    updatedAt: serverTimestamp(),
  })
}

export async function setEmployeeActive(id: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, 'employees', id), {
    active,
    updatedAt: serverTimestamp(),
  })
}

export async function updateEmployeeField(
  id: string,
  field: 'firstName' | 'lastName' | 'personnelNumber',
  value: string,
): Promise<void> {
  await updateDoc(doc(db, 'employees', id), {
    [field]: value,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteEmployee(id: string): Promise<void> {
  await deleteDoc(doc(db, 'employees', id))
}

export async function deleteEmployees(ids: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const chunk = ids.slice(i, i + BATCH_SIZE)
    const batch = writeBatch(db)
    chunk.forEach((id) => batch.delete(doc(db, 'employees', id)))
    await batch.commit()
  }
}

export async function deleteAllEmployees(): Promise<void> {
  const snapshot = await getDocs(employeesCollection)
  await deleteEmployees(snapshot.docs.map((docSnap) => docSnap.id))
}

/** Swaps firstName/lastName for each given employee — for fixing an import whose column mapping was reversed. */
export async function swapEmployeeNames(employees: Pick<Employee, 'id' | 'firstName' | 'lastName'>[]): Promise<void> {
  for (let i = 0; i < employees.length; i += BATCH_SIZE) {
    const chunk = employees.slice(i, i + BATCH_SIZE)
    const batch = writeBatch(db)
    chunk.forEach((e) =>
      batch.update(doc(db, 'employees', e.id), {
        firstName: e.lastName,
        lastName: e.firstName,
        updatedAt: serverTimestamp(),
      }),
    )
    await batch.commit()
  }
}
