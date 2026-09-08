import { collection, doc, getDocs, limit, orderBy, query, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { normalizeForSearch } from '../../shared/utils/search'
import type { ImportEntityConfig } from '../../shared/import/types'
import { employeeDisplayName } from '../../types/employee'
import type { Order } from '../../types/order'

/** Marks a row's statusId as referring to a status name not yet in Firestore — created in beforeCommit. */
const PENDING_STATUS_PREFIX = '__pending_status__:'

interface OrderImportPrefetch {
  employeesByPersonnelNumber: Map<string, { id: string; name: string }>
  employeesByName: Map<string, { id: string; name: string }>
  articlesByNumber: Map<string, { id: string; name: string; number: string; size: string; pickupLocationName: string }>
  articlesByName: Map<string, { id: string; name: string; number: string; size: string; pickupLocationName: string }>
  statusesByName: Map<string, { id: string; name: string }>
  defaultStatus: { id: string; name: string } | null
}

export const orderImportConfig: ImportEntityConfig<Order, OrderImportPrefetch> = {
  entityLabel: 'Bestellungen',
  collectionName: 'orders',
  listPath: '/orders',
  fields: [
    { targetField: 'personnelNumber', label: 'Personalnummer', required: false, type: 'string' },
    { targetField: 'employeeName', label: 'Mitarbeitername', required: false, type: 'string' },
    { targetField: 'articleNumber', label: 'Artikelnummer', required: false, type: 'string' },
    { targetField: 'articleName', label: 'Artikelbezeichnung', required: false, type: 'string' },
    { targetField: 'quantity', label: 'Menge', required: true, type: 'number' },
    { targetField: 'orderDate', label: 'Bestelldatum', required: true, type: 'date' },
    { targetField: 'statusName', label: 'Status', required: false, type: 'string' },
  ],
  prefetch: async () => {
    const [employeesSnap, articlesSnap, statusesSnap] = await Promise.all([
      getDocs(collection(db, 'employees')),
      getDocs(collection(db, 'articles')),
      getDocs(collection(db, 'orderStatuses')),
    ])

    const employeesByPersonnelNumber = new Map<string, { id: string; name: string }>()
    const employeesByName = new Map<string, { id: string; name: string }>()
    for (const docSnap of employeesSnap.docs) {
      const data = docSnap.data()
      const entry = {
        id: docSnap.id,
        name: employeeDisplayName({ firstName: data.firstName, lastName: data.lastName }),
      }
      if (data.personnelNumber) employeesByPersonnelNumber.set(String(data.personnelNumber), entry)
      employeesByName.set(normalizeForSearch(`${data.firstName} ${data.lastName}`), entry)
      employeesByName.set(normalizeForSearch(`${data.lastName} ${data.firstName}`), entry)
      employeesByName.set(normalizeForSearch(`${data.lastName}, ${data.firstName}`), entry)
    }

    const articlesByNumber = new Map<
      string,
      { id: string; name: string; number: string; size: string; pickupLocationName: string }
    >()
    const articlesByName = new Map<
      string,
      { id: string; name: string; number: string; size: string; pickupLocationName: string }
    >()
    for (const docSnap of articlesSnap.docs) {
      const data = docSnap.data()
      const entry = {
        id: docSnap.id,
        name: data.articleName,
        number: data.articleNumber ?? '',
        size: data.size ?? '',
        pickupLocationName: data.pickupLocationName ?? '',
      }
      if (data.articleNumber) articlesByNumber.set(String(data.articleNumber), entry)
      articlesByName.set(normalizeForSearch(data.articleName), entry)
    }

    const statusesByName = new Map<string, { id: string; name: string }>()
    let defaultStatus: { id: string; name: string } | null = null
    let minSortOrder = Infinity
    for (const docSnap of statusesSnap.docs) {
      const data = docSnap.data()
      if (!data.active) continue
      statusesByName.set(String(data.name), { id: docSnap.id, name: data.name })
      if (data.sortOrder < minSortOrder) {
        minSortOrder = data.sortOrder
        defaultStatus = { id: docSnap.id, name: data.name }
      }
    }

    return { employeesByPersonnelNumber, employeesByName, articlesByNumber, articlesByName, statusesByName, defaultStatus }
  },
  resolveRow: (data, prefetched) => {
    const errors: string[] = []
    const resolved: Record<string, unknown> = {}

    const personnelNumber = data.personnelNumber ? String(data.personnelNumber) : ''
    const employeeName = data.employeeName ? String(data.employeeName) : ''
    const employee =
      (personnelNumber && prefetched.employeesByPersonnelNumber.get(personnelNumber)) ||
      (employeeName && prefetched.employeesByName.get(normalizeForSearch(employeeName)))
    if (!employee) {
      errors.push('Kein Mitarbeiter gefunden (weder Personalnummer noch Mitarbeitername zugeordnet/gefunden).')
    } else {
      resolved.employeeId = employee.id
      resolved.employeeName = employee.name
    }

    const articleNumber = data.articleNumber ? String(data.articleNumber) : ''
    const articleName = data.articleName ? String(data.articleName) : ''
    const article =
      (articleNumber && prefetched.articlesByNumber.get(articleNumber)) ||
      (articleName && prefetched.articlesByName.get(normalizeForSearch(articleName)))
    if (!article) {
      errors.push('Kein Artikel gefunden (weder Artikelnummer noch Artikelbezeichnung zugeordnet/gefunden).')
    } else {
      resolved.articleId = article.id
      resolved.articleName = article.name
      resolved.articleNumber = article.number
      resolved.articleSize = article.size
      resolved.pickupLocationName = article.pickupLocationName
    }

    const statusName = data.statusName ? String(data.statusName) : ''
    if (statusName) {
      const status = prefetched.statusesByName.get(statusName)
      if (status) {
        resolved.statusId = status.id
        resolved.status = status.name
      } else {
        // Unknown status name from the file — created fresh in beforeCommit once all rows are known.
        resolved.statusId = `${PENDING_STATUS_PREFIX}${statusName}`
        resolved.status = statusName
      }
    } else if (prefetched.defaultStatus) {
      resolved.statusId = prefetched.defaultStatus.id
      resolved.status = prefetched.defaultStatus.name
    } else {
      errors.push('Keine Statusspalte angegeben und kein Standardstatus verfügbar.')
    }

    return { data: resolved, errors }
  },
  beforeCommit: async (rows) => {
    const pendingNames = new Set<string>()
    for (const row of rows) {
      const statusId = row.data.statusId
      if (typeof statusId === 'string' && statusId.startsWith(PENDING_STATUS_PREFIX)) {
        pendingNames.add(statusId.slice(PENDING_STATUS_PREFIX.length))
      }
    }
    if (pendingNames.size === 0) return

    const statusesCollection = collection(db, 'orderStatuses')
    const lastSnap = await getDocs(query(statusesCollection, orderBy('sortOrder', 'desc'), limit(1)))
    let nextSortOrder = ((lastSnap.docs[0]?.data().sortOrder as number | undefined) ?? 0) + 10

    const nameToId = new Map<string, string>()
    const batch = writeBatch(db)
    for (const name of pendingNames) {
      const ref = doc(statusesCollection)
      batch.set(ref, {
        name,
        sortOrder: nextSortOrder,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      nameToId.set(name, ref.id)
      nextSortOrder += 10
    }
    await batch.commit()

    for (const row of rows) {
      const statusId = row.data.statusId
      if (typeof statusId === 'string' && statusId.startsWith(PENDING_STATUS_PREFIX)) {
        row.data.statusId = nameToId.get(statusId.slice(PENDING_STATUS_PREFIX.length))
      }
    }
  },
  // Note: this bypasses orders/api.ts entirely (CommitStep writes docs directly), so imported
  // orders do NOT adjust article inventory — accepted, since import is for bulk/historical data
  // entry where stock reconciliation doesn't apply the same way as a manually placed order.
  mapRowToDoc: (data) => ({
    employeeId: data.employeeId as string,
    employeeName: data.employeeName as string,
    articleId: data.articleId as string,
    articleName: data.articleName as string,
    articleNumber: data.articleNumber as string,
    comment: '',
    articleSize: (data.articleSize as string | undefined) ?? '',
    pickupLocationName: (data.pickupLocationName as string | undefined) ?? '',
    quantity: data.quantity as number,
    statusId: data.statusId as string,
    status: data.status as string,
    orderDate: data.orderDate as string,
    exchangedFromOrderId: '',
    exchangedFromArticleName: '',
    exchangedToOrderId: '',
    exchangedToArticleName: '',
  }),
}
