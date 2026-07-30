import { addDoc, collection, limit, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { createConverter } from '../../firebase/converters'
import type { OrderHistoryAction, OrderHistoryChange, OrderHistoryEntry } from '../../types/orderHistory'

const orderHistoryConverter = createConverter<OrderHistoryEntry>()
const orderHistoryCollection = collection(db, 'orderHistory')

/** Mirrors orders' FETCH_LIMIT — same confirmed data volume assumption, client-side filtering. */
const FETCH_LIMIT = 2000

export function orderHistoryQuery() {
  return query(orderHistoryCollection.withConverter(orderHistoryConverter), orderBy('createdAt', 'desc'), limit(FETCH_LIMIT))
}

export interface LogOrderHistoryInput {
  orderId: string
  employeeName: string
  articleName: string
  action: OrderHistoryAction
  changes: OrderHistoryChange[]
}

export async function logOrderHistory(entry: LogOrderHistoryInput): Promise<void> {
  await addDoc(orderHistoryCollection, {
    ...entry,
    createdAt: serverTimestamp(),
  })
}
