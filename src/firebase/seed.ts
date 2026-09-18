import { collection, doc, getDocs, query, runTransaction, serverTimestamp, where, writeBatch } from 'firebase/firestore'
import { DEFAULT_ORDER_STATUSES } from '../types/orderStatus'
import { db } from './config'

const seedMarkerRef = () => doc(db, 'appMeta', 'seed')

/**
 * Idempotent AND race-safe: a plain "check if orderStatuses is empty, then batch-write" is not
 * atomic, so two overlapping calls (e.g. two browser tabs, or a dev full-reload racing an
 * in-flight write — this app has no HMR boundaries, so most dev edits trigger one) can each see
 * "empty" and each write all 8 defaults, duplicating them. A transaction on a dedicated marker
 * doc closes that race: only one caller's transaction ever commits the seed + marker together.
 */
export async function ensureSeedData(): Promise<void> {
  const statusesCollection = collection(db, 'orderStatuses')
  const namedIssuedStatus = await getDocs(query(statusesCollection, where('name', '==', 'Ausgegeben')))
  // Reuse a manually created "Ausgegeben" status if one already exists; new installations use a stable ID.
  const issuedStatusRef = namedIssuedStatus.docs[0]?.ref ?? doc(statusesCollection, 'issued')
  let issuedStatus: { id: string; name: string } | null = null
  await runTransaction(db, async (tx) => {
    const marker = await tx.get(seedMarkerRef())
    if (!marker.exists()) {
      DEFAULT_ORDER_STATUSES.forEach(({ name, semanticKey }, index) => {
        const ref = semanticKey === 'issued' ? issuedStatusRef : doc(statusesCollection)
        tx.set(ref, {
          name,
          semanticKey,
          sortOrder: (index + 1) * 10,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        if (semanticKey === 'issued') issuedStatus = { id: ref.id, name }
      })
      tx.set(seedMarkerRef(), { seededAt: serverTimestamp() })
      return
    }

    const existing = await tx.get(issuedStatusRef)
    if (existing.exists()) {
      const data = existing.data()
      issuedStatus = { id: existing.id, name: data.name as string }
      if (data.semanticKey !== 'issued' || data.active !== true) {
        tx.update(issuedStatusRef, { semanticKey: 'issued', active: true, updatedAt: serverTimestamp() })
      }
      return
    }

    issuedStatus = { id: issuedStatusRef.id, name: 'Ausgegeben' }
    tx.set(issuedStatusRef, {
      name: 'Ausgegeben',
      semanticKey: 'issued',
      sortOrder: 80,
      active: true,
      color: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  })

  // Existing loan issues predate the dedicated status. Keep them out of the purchasing workflow.
  if (!issuedStatus) return
  const loanOrders = await getDocs(query(collection(db, 'orders'), where('isLoanIssue', '==', true)))
  const outdated = loanOrders.docs.filter((snap) => {
    const data = snap.data()
    return data.statusId !== issuedStatus!.id || data.status !== issuedStatus!.name
  })
  for (let i = 0; i < outdated.length; i += 500) {
    const batch = writeBatch(db)
    outdated.slice(i, i + 500).forEach((snap) => {
      batch.update(snap.ref, { statusId: issuedStatus!.id, status: issuedStatus!.name, updatedAt: serverTimestamp() })
    })
    await batch.commit()
  }
}
