import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type QueryConstraint,
} from 'firebase/firestore'
import { db } from '../../firebase/config'
import { createConverter } from '../../firebase/converters'
import type { Order, OrderInput } from '../../types/order'

const orderConverter = createConverter<Order>()
const ordersCollection = collection(db, 'orders')

/** Firestore batch writes are capped at 500 ops; chunk any bulk write to this size. */
const BATCH_SIZE = 500

/**
 * At the confirmed data volume (low thousands of orders at most), fetching all orders
 * matching the server-side filters and doing text search + pagination client-side is
 * simpler and more robust than cursor pagination, while keeping live onSnapshot updates.
 */
const FETCH_LIMIT = 2000

export interface OrderServerFilters {
  employeeId?: string
  articleId?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}

export function ordersQuery(filters: OrderServerFilters) {
  const constraints: QueryConstraint[] = []
  if (filters.employeeId) constraints.push(where('employeeId', '==', filters.employeeId))
  if (filters.articleId) constraints.push(where('articleId', '==', filters.articleId))
  if (filters.status) constraints.push(where('status', '==', filters.status))
  if (filters.dateFrom) constraints.push(where('orderDate', '>=', filters.dateFrom))
  if (filters.dateTo) constraints.push(where('orderDate', '<=', filters.dateTo))
  constraints.push(orderBy('orderDate', 'desc'))
  constraints.push(limit(FETCH_LIMIT))
  return query(ordersCollection.withConverter(orderConverter), ...constraints)
}

export async function getOrder(id: string): Promise<Order | null> {
  const snapshot = await getDoc(doc(db, 'orders', id).withConverter(orderConverter))
  return snapshot.exists() ? snapshot.data() : null
}

export async function createOrder(input: OrderInput): Promise<void> {
  await addDoc(ordersCollection, {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateOrder(id: string, input: OrderInput): Promise<void> {
  await updateDoc(doc(db, 'orders', id), {
    ...input,
    updatedAt: serverTimestamp(),
  })
}

export async function updateOrderStatus(id: string, statusId: string, status: string): Promise<void> {
  await updateDoc(doc(db, 'orders', id), {
    statusId,
    status,
    updatedAt: serverTimestamp(),
  })
}

export async function updateOrderQuantity(id: string, quantity: number): Promise<void> {
  await updateDoc(doc(db, 'orders', id), {
    quantity,
    updatedAt: serverTimestamp(),
  })
}

export async function updateOrderDate(id: string, orderDate: string): Promise<void> {
  await updateDoc(doc(db, 'orders', id), {
    orderDate,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteOrder(id: string): Promise<void> {
  await deleteDoc(doc(db, 'orders', id))
}

export async function deleteOrders(ids: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const chunk = ids.slice(i, i + BATCH_SIZE)
    const batch = writeBatch(db)
    chunk.forEach((id) => batch.delete(doc(db, 'orders', id)))
    await batch.commit()
  }
}

export async function deleteAllOrders(): Promise<void> {
  const snapshot = await getDocs(ordersCollection)
  await deleteOrders(snapshot.docs.map((docSnap) => docSnap.id))
}

export async function updateOrdersStatus(ids: string[], statusId: string, status: string): Promise<void> {
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const chunk = ids.slice(i, i + BATCH_SIZE)
    const batch = writeBatch(db)
    chunk.forEach((id) => batch.update(doc(db, 'orders', id), { statusId, status, updatedAt: serverTimestamp() }))
    await batch.commit()
  }
}

/** Repoints every order referencing one of `fromStatusIds` (e.g. statuses being merged) to `toStatusId`/`toStatusName`. */
export async function reassignOrdersStatus(
  fromStatusIds: string[],
  toStatusId: string,
  toStatusName: string,
): Promise<void> {
  const snapshot = await getDocs(query(ordersCollection, where('statusId', 'in', fromStatusIds)))
  const ids = snapshot.docs.map((docSnap) => docSnap.id)
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const chunk = ids.slice(i, i + BATCH_SIZE)
    const batch = writeBatch(db)
    chunk.forEach((id) =>
      batch.update(doc(db, 'orders', id), {
        statusId: toStatusId,
        status: toStatusName,
        updatedAt: serverTimestamp(),
      }),
    )
    await batch.commit()
  }
}
