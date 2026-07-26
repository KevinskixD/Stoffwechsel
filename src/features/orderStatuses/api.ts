import {
  addDoc,
  collection,
  deleteDoc,
  doc,
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
import { reassignOrdersStatus } from '../orders/api'
import type { OrderStatus } from '../../types/orderStatus'

const orderStatusConverter = createConverter<OrderStatus>()
const orderStatusesCollection = collection(db, 'orderStatuses')

export function orderStatusesQuery(includeInactive: boolean) {
  const converted = orderStatusesCollection.withConverter(orderStatusConverter)
  return includeInactive
    ? query(converted, orderBy('sortOrder'))
    : query(converted, where('active', '==', true), orderBy('sortOrder'))
}

export async function isStatusNameTaken(name: string, excludeId?: string | string[]): Promise<boolean> {
  const snapshot = await getDocs(query(orderStatusesCollection, where('name', '==', name)))
  const excluded = new Set(Array.isArray(excludeId) ? excludeId : excludeId ? [excludeId] : [])
  return snapshot.docs.some((docSnap) => !excluded.has(docSnap.id))
}

export async function createOrderStatus(name: string): Promise<void> {
  const snapshot = await getDocs(query(orderStatusesCollection, orderBy('sortOrder', 'desc')))
  const maxSortOrder = (snapshot.docs[0]?.data().sortOrder as number | undefined) ?? 0
  await addDoc(orderStatusesCollection, {
    name,
    sortOrder: maxSortOrder + 10,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function renameOrderStatus(id: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'orderStatuses', id), { name, updatedAt: serverTimestamp() })
}

export async function setOrderStatusActive(id: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, 'orderStatuses', id), { active, updatedAt: serverTimestamp() })
}

export async function deleteOrderStatus(id: string): Promise<void> {
  await deleteDoc(doc(db, 'orderStatuses', id))
}

/**
 * Merges `mergeId` into `keepId` under `newName`: repoints every order referencing either
 * status to `keepId`/`newName`, renames the surviving status doc, and deletes the other one.
 */
export async function mergeOrderStatuses(keepId: string, mergeId: string, newName: string): Promise<void> {
  await reassignOrdersStatus([keepId, mergeId], keepId, newName)
  await updateDoc(doc(db, 'orderStatuses', keepId), { name: newName, updatedAt: serverTimestamp() })
  await deleteOrderStatus(mergeId)
}

/** Full renumber: rewrites sortOrder 10,20,30… for all statuses in the given order. */
export async function reorderOrderStatuses(orderedIds: string[]): Promise<void> {
  const batch = writeBatch(db)
  orderedIds.forEach((id, index) => {
    batch.update(doc(db, 'orderStatuses', id), {
      sortOrder: (index + 1) * 10,
      updatedAt: serverTimestamp(),
    })
  })
  await batch.commit()
}
