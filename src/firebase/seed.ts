import { collection, doc, getDocs, limit, query, serverTimestamp, writeBatch } from 'firebase/firestore'
import { DEFAULT_ORDER_STATUS_NAMES } from '../types/orderStatus'
import { db } from './config'

/** Idempotent: only writes the default order statuses if the collection is empty. */
export async function ensureSeedData(): Promise<void> {
  const statusesCollection = collection(db, 'orderStatuses')
  const snapshot = await getDocs(query(statusesCollection, limit(1)))
  if (!snapshot.empty) return

  const batch = writeBatch(db)
  DEFAULT_ORDER_STATUS_NAMES.forEach((name, index) => {
    batch.set(doc(statusesCollection), {
      name,
      sortOrder: (index + 1) * 10,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  })
  await batch.commit()
}
