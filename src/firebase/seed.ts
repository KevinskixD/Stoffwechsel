import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { DEFAULT_ORDER_STATUS_NAMES } from '../types/orderStatus'
import { db } from './config'

const seedMarkerRef = () => doc(db, 'appMeta', 'seed')

/**
 * Idempotent AND race-safe: a plain "check if orderStatuses is empty, then batch-write" is not
 * atomic, so two overlapping calls (e.g. two browser tabs, or a dev full-reload racing an
 * in-flight write — this app has no HMR boundaries, so most dev edits trigger one) can each see
 * "empty" and each write all 7 defaults, duplicating them. A transaction on a dedicated marker
 * doc closes that race: only one caller's transaction ever commits the seed + marker together.
 */
export async function ensureSeedData(): Promise<void> {
  const statusesCollection = collection(db, 'orderStatuses')
  await runTransaction(db, async (tx) => {
    const marker = await tx.get(seedMarkerRef())
    if (marker.exists()) return
    DEFAULT_ORDER_STATUS_NAMES.forEach((name, index) => {
      tx.set(doc(statusesCollection), {
        name,
        sortOrder: (index + 1) * 10,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    })
    tx.set(seedMarkerRef(), { seededAt: serverTimestamp() })
  })
}
