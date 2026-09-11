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
import { reassignOrdersStatus } from '../orders/api'
import { getOrderStatusSemanticKey, type OrderStatus, type OrderStatusSemanticKey } from '../../types/orderStatus'

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
    color: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function renameOrderStatus(id: string, name: string): Promise<void> {
  const snapshot = await getDoc(doc(db, 'orderStatuses', id).withConverter(orderStatusConverter))
  const current = snapshot.exists() ? snapshot.data() : undefined
  const semanticKey = current ? getOrderStatusSemanticKey(current) : undefined
  await reassignOrdersStatus([id], id, name)
  await updateDoc(doc(db, 'orderStatuses', id), { name, ...(semanticKey ? { semanticKey } : {}), updatedAt: serverTimestamp() })
}

export async function updateOrderStatusColor(id: string, color: string): Promise<void> {
  await updateDoc(doc(db, 'orderStatuses', id), { color, updatedAt: serverTimestamp() })
}

/** Assigns the stable workflow role needed when a legacy default status was renamed before semantic keys existed. */
export async function updateOrderStatusSemanticKey(id: string, semanticKey: OrderStatusSemanticKey | undefined): Promise<void> {
  await updateDoc(doc(db, 'orderStatuses', id), {
    // null is an explicit opt-out; an absent field preserves the legacy name-based fallback.
    semanticKey: semanticKey ?? null,
    updatedAt: serverTimestamp(),
  })
}

export async function setOrderStatusActive(id: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, 'orderStatuses', id), { active, updatedAt: serverTimestamp() })
}

export async function deleteOrderStatus(id: string): Promise<void> {
  await deleteDoc(doc(db, 'orderStatuses', id))
}

/**
 * Merges every status in `mergeIds` into `keepId` under `newName`: repoints every order
 * referencing any of them to `keepId`/`newName`, renames the surviving status doc, and deletes
 * the others.
 */
export async function mergeOrderStatuses(keepId: string, mergeIds: string[], newName: string): Promise<void> {
  const keepSnapshot = await getDoc(doc(db, 'orderStatuses', keepId).withConverter(orderStatusConverter))
  const keep = keepSnapshot.exists() ? keepSnapshot.data() : undefined
  const semanticKey = keep ? getOrderStatusSemanticKey(keep) : undefined
  await reassignOrdersStatus([keepId, ...mergeIds], keepId, newName)
  await updateDoc(doc(db, 'orderStatuses', keepId), {
    name: newName,
    ...(semanticKey ? { semanticKey } : {}),
    updatedAt: serverTimestamp(),
  })
  const batch = writeBatch(db)
  mergeIds.forEach((id) => batch.delete(doc(db, 'orderStatuses', id)))
  await batch.commit()
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
