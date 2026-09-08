import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  documentId,
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
import { articleDisplayLabel } from '../../types/article'
import type { Order, OrderInput } from '../../types/order'
import type { OrderHistoryChange } from '../../types/orderHistory'
import { formatDateDe, todayISO } from '../../shared/utils/date'
import { logOrderHistory } from '../orderHistory/api'
import { adjustArticleInventory } from '../articles/api'

const orderConverter = createConverter<Order>()
const ordersCollection = collection(db, 'orders')

/**
 * Statuses have no reserved id/flag (they're freely renameable/mergeable — see orderStatuses/api.ts),
 * so "the order was actually placed" is identified by this literal name, same convention already used
 * by DashboardPage/BestellFormularSettingsPage's default-suggest logic.
 */
const ORDERED_STATUS_NAME = 'Bestellt'

/** Firestore 'in' queries accept at most 30 values per query. */
const IN_QUERY_CHUNK_SIZE = 30

function buildCreatedChanges(input: OrderInput): OrderHistoryChange[] {
  const changes: OrderHistoryChange[] = [
    { field: 'quantity', label: 'Menge', from: '', to: String(input.quantity) },
    { field: 'status', label: 'Status', from: '', to: input.status },
    { field: 'orderDate', label: 'Datum', from: '', to: formatDateDe(input.orderDate) },
  ]
  if (input.comment) changes.push({ field: 'comment', label: 'Kommentar', from: '', to: input.comment })
  return changes
}

/** Diffs a full-form edit against the previous document — only changed fields are logged. */
function buildOrderChanges(before: Order, after: OrderInput): OrderHistoryChange[] {
  const changes: OrderHistoryChange[] = []
  if (before.employeeId !== after.employeeId) {
    changes.push({ field: 'employeeName', label: 'Mitarbeiter', from: before.employeeName, to: after.employeeName })
  }
  if (before.articleId !== after.articleId) {
    changes.push({
      field: 'articleName',
      label: 'Artikel',
      from: articleDisplayLabel(before),
      to: articleDisplayLabel(after),
    })
  }
  if (before.quantity !== after.quantity) {
    changes.push({ field: 'quantity', label: 'Menge', from: String(before.quantity), to: String(after.quantity) })
  }
  if (before.statusId !== after.statusId) {
    changes.push({ field: 'status', label: 'Status', from: before.status, to: after.status })
  }
  if (before.orderDate !== after.orderDate) {
    changes.push({
      field: 'orderDate',
      label: 'Datum',
      from: formatDateDe(before.orderDate),
      to: formatDateDe(after.orderDate),
    })
  }
  if ((before.comment ?? '') !== after.comment) {
    changes.push({ field: 'comment', label: 'Kommentar', from: before.comment ?? '', to: after.comment })
  }
  return changes
}

type OrderSnapshotFields = Pick<
  Order,
  'status' | 'employeeName' | 'articleName' | 'articleId' | 'quantity' | 'orderDate' | 'comment'
>

/** Fetches the current status/employeeName/articleName/articleId/quantity/orderDate for each id — used to diff bulk status writes and restore inventory on bulk delete. */
async function fetchOrderSnapshotsByIds(ids: string[]): Promise<Map<string, OrderSnapshotFields>> {
  const result = new Map<string, OrderSnapshotFields>()
  for (let i = 0; i < ids.length; i += IN_QUERY_CHUNK_SIZE) {
    const chunk = ids.slice(i, i + IN_QUERY_CHUNK_SIZE)
    if (chunk.length === 0) continue
    const snapshot = await getDocs(query(ordersCollection.withConverter(orderConverter), where(documentId(), 'in', chunk)))
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data()
      result.set(docSnap.id, {
        status: data.status,
        employeeName: data.employeeName,
        articleName: data.articleName,
        articleId: data.articleId,
        quantity: data.quantity,
        orderDate: data.orderDate,
        comment: data.comment ?? '',
      })
    })
  }
  return result
}

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

export interface ExchangeOrderInput {
  oldOrderId: string
  newArticleId: string
  newArticleName: string
  newArticleNumber: string
  newArticleSize: string
  newPickupLocationName: string
  newStatusId: string
  newStatus: string
  /** The resolved "Umtausch" OrderStatus to set on the old order. */
  exchangeStatusId: string
  exchangeStatusName: string
}

/**
 * Marks a picked-up order as exchanged (status → "Umtausch", restocks its article) and creates
 * a new, linked order for the replacement article (same employee/quantity, consumes its stock).
 * Not wrapped in a transaction — same "sequential awaits" style as updateOrder's article-change
 * inventory reconciliation.
 */
export async function exchangeOrder(input: ExchangeOrderInput): Promise<string> {
  const before = await getOrder(input.oldOrderId)
  if (!before) throw new Error('Bestellung nicht gefunden.')

  const newOrderInput: OrderInput = {
    employeeId: before.employeeId,
    employeeName: before.employeeName,
    articleId: input.newArticleId,
    articleName: input.newArticleName,
    articleNumber: input.newArticleNumber,
    comment: '',
    articleSize: input.newArticleSize,
    pickupLocationName: input.newPickupLocationName,
    quantity: before.quantity,
    statusId: input.newStatusId,
    status: input.newStatus,
    orderDate: todayISO(),
    exchangedFromOrderId: before.id,
    exchangedFromArticleName: articleDisplayLabel(before),
    exchangedToOrderId: '',
    exchangedToArticleName: '',
  }
  const newDocRef = await addDoc(ordersCollection, {
    ...newOrderInput,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await adjustArticleInventory(newOrderInput.articleId, -newOrderInput.quantity)

  const newArticleLabel = articleDisplayLabel(newOrderInput)
  await updateDoc(doc(db, 'orders', input.oldOrderId), {
    statusId: input.exchangeStatusId,
    status: input.exchangeStatusName,
    exchangedToOrderId: newDocRef.id,
    exchangedToArticleName: newArticleLabel,
    updatedAt: serverTimestamp(),
  })
  await adjustArticleInventory(before.articleId, before.quantity)

  await logOrderHistory({
    orderId: input.oldOrderId,
    employeeName: before.employeeName,
    articleName: before.articleName,
    action: 'exchanged',
    changes: [
      { field: 'status', label: 'Status', from: before.status, to: input.exchangeStatusName },
      { field: 'exchangedToArticleName', label: 'Umgetauscht zu', from: '', to: newArticleLabel },
    ],
  })
  await logOrderHistory({
    orderId: newDocRef.id,
    employeeName: before.employeeName,
    articleName: newOrderInput.articleName,
    action: 'exchanged',
    changes: [
      { field: 'quantity', label: 'Menge', from: '', to: String(newOrderInput.quantity) },
      { field: 'status', label: 'Status', from: '', to: newOrderInput.status },
      { field: 'exchangedFromArticleName', label: 'Umgetauscht von', from: '', to: articleDisplayLabel(before) },
    ],
  })

  return newDocRef.id
}

export async function createOrder(input: OrderInput): Promise<void> {
  const docRef = await addDoc(ordersCollection, {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await logOrderHistory({
    orderId: docRef.id,
    employeeName: input.employeeName,
    articleName: input.articleName,
    action: 'created',
    changes: buildCreatedChanges(input),
  })
  await adjustArticleInventory(input.articleId, -input.quantity)
}

export async function updateOrder(id: string, input: OrderInput): Promise<void> {
  const before = await getOrder(id)
  await updateDoc(doc(db, 'orders', id), {
    ...input,
    updatedAt: serverTimestamp(),
  })
  if (!before) return
  if (before.articleId !== input.articleId) {
    await adjustArticleInventory(before.articleId, before.quantity)
    await adjustArticleInventory(input.articleId, -input.quantity)
  } else if (before.quantity !== input.quantity) {
    await adjustArticleInventory(input.articleId, before.quantity - input.quantity)
  }
  const changes = buildOrderChanges(before, input)
  if (changes.length === 0) return
  // A full-form edit that only touched the status is still a status transition — badge it as such.
  const action = changes.length === 1 && changes[0].field === 'status' ? 'status_changed' : 'updated'
  await logOrderHistory({ orderId: id, employeeName: input.employeeName, articleName: input.articleName, action, changes })
}

export async function updateOrderStatus(id: string, statusId: string, status: string): Promise<void> {
  const before = await getOrder(id)
  const becomesOrdered = status === ORDERED_STATUS_NAME && before?.status !== status
  const orderDate = becomesOrdered ? todayISO() : undefined
  await updateDoc(doc(db, 'orders', id), {
    statusId,
    status,
    ...(orderDate ? { orderDate } : {}),
    updatedAt: serverTimestamp(),
  })
  if (!before || before.status === status) return
  const changes: OrderHistoryChange[] = [{ field: 'status', label: 'Status', from: before.status, to: status }]
  if (orderDate) {
    changes.push({ field: 'orderDate', label: 'Datum', from: formatDateDe(before.orderDate), to: formatDateDe(orderDate) })
  }
  await logOrderHistory({
    orderId: id,
    employeeName: before.employeeName,
    articleName: before.articleName,
    action: 'status_changed',
    changes,
  })
}

export async function updateOrderQuantity(id: string, quantity: number): Promise<void> {
  const before = await getOrder(id)
  await updateDoc(doc(db, 'orders', id), {
    quantity,
    updatedAt: serverTimestamp(),
  })
  if (!before || before.quantity === quantity) return
  await adjustArticleInventory(before.articleId, before.quantity - quantity)
  await logOrderHistory({
    orderId: id,
    employeeName: before.employeeName,
    articleName: before.articleName,
    action: 'updated',
    changes: [{ field: 'quantity', label: 'Menge', from: String(before.quantity), to: String(quantity) }],
  })
}

export async function updateOrderDate(id: string, orderDate: string): Promise<void> {
  const before = await getOrder(id)
  await updateDoc(doc(db, 'orders', id), {
    orderDate,
    updatedAt: serverTimestamp(),
  })
  if (!before || before.orderDate === orderDate) return
  await logOrderHistory({
    orderId: id,
    employeeName: before.employeeName,
    articleName: before.articleName,
    action: 'updated',
    changes: [{ field: 'orderDate', label: 'Datum', from: formatDateDe(before.orderDate), to: formatDateDe(orderDate) }],
  })
}

/** Updates an order note without touching its status or any of its denormalized article data. */
export async function updateOrderComment(id: string, comment: string): Promise<void> {
  const before = await getOrder(id)
  await updateDoc(doc(db, 'orders', id), {
    comment,
    updatedAt: serverTimestamp(),
  })
  if (!before || (before.comment ?? '') === comment) return
  await logOrderHistory({
    orderId: id,
    employeeName: before.employeeName,
    articleName: before.articleName,
    action: 'updated',
    changes: [{ field: 'comment', label: 'Kommentar', from: before.comment ?? '', to: comment }],
  })
}

export async function deleteOrder(id: string): Promise<void> {
  const order = await getOrder(id)
  await deleteDoc(doc(db, 'orders', id))
  if (order) await adjustArticleInventory(order.articleId, order.quantity)
}

export async function deleteOrders(ids: string[]): Promise<void> {
  const before = await fetchOrderSnapshotsByIds(ids)
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const chunk = ids.slice(i, i + BATCH_SIZE)
    const batch = writeBatch(db)
    chunk.forEach((id) => batch.delete(doc(db, 'orders', id)))
    await batch.commit()
  }
  const restockByArticle = new Map<string, number>()
  before.forEach(({ articleId, quantity }) => {
    restockByArticle.set(articleId, (restockByArticle.get(articleId) ?? 0) + quantity)
  })
  await Promise.all(
    Array.from(restockByArticle.entries()).map(([articleId, quantity]) => adjustArticleInventory(articleId, quantity)),
  )
}

export async function deleteAllOrders(): Promise<void> {
  const snapshot = await getDocs(ordersCollection)
  await deleteOrders(snapshot.docs.map((docSnap) => docSnap.id))
}

export async function updateOrdersStatus(ids: string[], statusId: string, status: string): Promise<void> {
  const before = await fetchOrderSnapshotsByIds(ids)
  const becomesOrdered = status === ORDERED_STATUS_NAME
  const orderDate = becomesOrdered ? todayISO() : undefined
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const chunk = ids.slice(i, i + BATCH_SIZE)
    const batch = writeBatch(db)
    chunk.forEach((id) =>
      batch.update(doc(db, 'orders', id), { statusId, status, ...(orderDate ? { orderDate } : {}), updatedAt: serverTimestamp() }),
    )
    await batch.commit()
  }
  await Promise.all(
    ids.map((id) => {
      const snap = before.get(id)
      if (!snap || snap.status === status) return Promise.resolve()
      const changes: OrderHistoryChange[] = [{ field: 'status', label: 'Status', from: snap.status, to: status }]
      if (orderDate) {
        changes.push({ field: 'orderDate', label: 'Datum', from: formatDateDe(snap.orderDate), to: formatDateDe(orderDate) })
      }
      return logOrderHistory({
        orderId: id,
        employeeName: snap.employeeName,
        articleName: snap.articleName,
        action: 'status_changed',
        changes,
      })
    }),
  )
}

/**
 * Completes the pickup-notification action: changes the target status and appends the dated
 * notification note to every affected order without discarding an existing comment.
 */
export async function markOrdersAsNotified(
  ids: string[],
  statusId: string,
  status: string,
  notificationNote: string,
): Promise<void> {
  const before = await fetchOrderSnapshotsByIds(ids)
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const chunk = ids.slice(i, i + BATCH_SIZE)
    const batch = writeBatch(db)
    chunk.forEach((id) => {
      const previousComment = before.get(id)?.comment ?? ''
      const comment = previousComment ? `${notificationNote}\n${previousComment}` : notificationNote
      batch.update(doc(db, 'orders', id), { statusId, status, comment, updatedAt: serverTimestamp() })
    })
    await batch.commit()
  }

  await Promise.all(
    ids.map((id) => {
      const snap = before.get(id)
      if (!snap) return Promise.resolve()
      const changes: OrderHistoryChange[] = []
      if (snap.status !== status) {
        changes.push({ field: 'status', label: 'Status', from: snap.status, to: status })
      }
      changes.push({
        field: 'comment',
        label: 'Kommentar',
        from: snap.comment,
        to: snap.comment ? `${notificationNote}\n${snap.comment}` : notificationNote,
      })
      return logOrderHistory({
        orderId: id,
        employeeName: snap.employeeName,
        articleName: snap.articleName,
        action: snap.status === status ? 'updated' : 'status_changed',
        changes,
      })
    }),
  )
}

/**
 * Overwrites the denormalized `employeeName` on each given order — for re-syncing orders whose
 * snapshot went stale (e.g. an employee's first/last name was corrected after the order was placed).
 */
export async function updateOrderEmployeeNames(updates: { id: string; employeeName: string }[]): Promise<void> {
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const chunk = updates.slice(i, i + BATCH_SIZE)
    const batch = writeBatch(db)
    chunk.forEach(({ id, employeeName }) => batch.update(doc(db, 'orders', id), { employeeName, updatedAt: serverTimestamp() }))
    await batch.commit()
  }
}

/**
 * Overwrites the denormalized `articleName`/`articleNumber` on each given order — for re-syncing
 * orders whose snapshot went stale (e.g. an article's number was corrected after the order was placed).
 */
export async function updateOrderArticleNames(
  updates: { id: string; articleName: string; articleNumber: string }[],
): Promise<void> {
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const chunk = updates.slice(i, i + BATCH_SIZE)
    const batch = writeBatch(db)
    chunk.forEach(({ id, articleName, articleNumber }) =>
      batch.update(doc(db, 'orders', id), { articleName, articleNumber, updatedAt: serverTimestamp() }),
    )
    await batch.commit()
  }
}

/**
 * Overwrites the denormalized `pickupLocationName` on each given order — for re-syncing orders
 * whose snapshot went stale (e.g. a pickup location was renamed/merged after the order was placed).
 */
export async function updateOrderPickupLocationNames(updates: { id: string; pickupLocationName: string }[]): Promise<void> {
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const chunk = updates.slice(i, i + BATCH_SIZE)
    const batch = writeBatch(db)
    chunk.forEach(({ id, pickupLocationName }) =>
      batch.update(doc(db, 'orders', id), { pickupLocationName, updatedAt: serverTimestamp() }),
    )
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
  const affected = snapshot.docs.map((docSnap) => {
    const data = docSnap.data()
    return {
      id: docSnap.id,
      status: data.status as string,
      employeeName: data.employeeName as string,
      articleName: data.articleName as string,
    }
  })
  const ids = affected.map((o) => o.id)
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
  await Promise.all(
    affected
      .filter((o) => o.status !== toStatusName)
      .map((o) =>
        logOrderHistory({
          orderId: o.id,
          employeeName: o.employeeName,
          articleName: o.articleName,
          action: 'status_changed',
          changes: [{ field: 'status', label: 'Status', from: o.status, to: toStatusName }],
        }),
      ),
  )
}
