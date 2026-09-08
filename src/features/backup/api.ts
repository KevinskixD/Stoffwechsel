import { collection, doc, getDoc, getDocs, setDoc, Timestamp, writeBatch } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { downloadBlob } from '../../shared/utils/file'
import type { Article } from '../../types/article'
import { BACKUP_SCHEMA_VERSION, type BackupData } from '../../types/backup'
import { BESTELL_FORMULAR_SETTINGS_DOC_ID, type BestellFormularSettings } from '../../types/bestellFormularSettings'
import type { Employee } from '../../types/employee'
import { NOTIFICATION_SETTINGS_DOC_ID, type NotificationSettings } from '../../types/notificationSettings'
import type { Order } from '../../types/order'
import type { OrderHistoryEntry } from '../../types/orderHistory'
import { ORDER_LIST_SETTINGS_DOC_ID, type OrderListSettings } from '../../types/orderListSettings'
import type { OrderStatus } from '../../types/orderStatus'
import type { PickupLocation } from '../../types/pickupLocation'
import type { StarterKitCategory } from '../../types/starterKit'

const BATCH_SIZE = 500

const COLLECTION_KEYS = [
  'employees',
  'articles',
  'orderStatuses',
  'orders',
  'orderHistory',
  'pickupLocations',
  'starterKitCategories',
] as const

function normalizeCollections(collections: unknown): BackupData['collections'] {
  if (typeof collections !== 'object' || collections === null) {
    throw new Error('Datei ist kein gültiges Backup dieser Anwendung.')
  }

  const source = collections as Record<string, unknown>
  if (COLLECTION_KEYS.some((key) => !Array.isArray(source[key]))) {
    throw new Error('Datei ist kein gültiges Backup dieser Anwendung.')
  }

  return {
    employees: source.employees as BackupData['collections']['employees'],
    articles: source.articles as BackupData['collections']['articles'],
    orderStatuses: source.orderStatuses as BackupData['collections']['orderStatuses'],
    orders: source.orders as BackupData['collections']['orders'],
    orderHistory: source.orderHistory as BackupData['collections']['orderHistory'],
    pickupLocations: source.pickupLocations as BackupData['collections']['pickupLocations'],
    starterKitCategories: source.starterKitCategories as BackupData['collections']['starterKitCategories'],
  }
}

/**
 * Only createdAt/updatedAt are ever Firestore Timestamps across these types - converting just
 * those two (rather than reusing createConverter<T>()) avoids createConverter's side effect of
 * inventing an `updatedAt: new Date()` for docs that never had one (orderHistory),
 * which would pollute every export with a fake, ever-changing field.
 */
function docToRecord<T>(id: string, data: Record<string, unknown>): T {
  const record: Record<string, unknown> = { id, ...data }
  if (record.createdAt instanceof Timestamp) record.createdAt = record.createdAt.toDate()
  if (record.updatedAt instanceof Timestamp) record.updatedAt = record.updatedAt.toDate()
  return record as T
}

async function fetchCollection<T>(collectionName: string): Promise<T[]> {
  const snapshot = await getDocs(collection(db, collectionName))
  return snapshot.docs.map((docSnap) => docToRecord<T>(docSnap.id, docSnap.data()))
}

async function fetchSingleton<T>(collectionName: string, docId: string): Promise<T | null> {
  const snap = await getDoc(doc(db, collectionName, docId))
  return snap.exists() ? docToRecord<T>(docId, snap.data()) : null
}

export async function exportBackupData(): Promise<BackupData> {
  const [employees, articles, orderStatuses, orders, orderHistory, pickupLocations, starterKitCategories] =
    await Promise.all([
      fetchCollection<Employee>('employees'),
      fetchCollection<Article>('articles'),
      fetchCollection<OrderStatus>('orderStatuses'),
      fetchCollection<Order>('orders'),
      fetchCollection<OrderHistoryEntry>('orderHistory'),
      fetchCollection<PickupLocation>('pickupLocations'),
      fetchCollection<StarterKitCategory>('starterKitCategories'),
    ])
  const [notificationSettings, bestellFormularSettings, orderListSettings] = await Promise.all([
    fetchSingleton<NotificationSettings>('notificationSettings', NOTIFICATION_SETTINGS_DOC_ID),
    fetchSingleton<BestellFormularSettings>('bestellFormularSettings', BESTELL_FORMULAR_SETTINGS_DOC_ID),
    fetchSingleton<OrderListSettings>('orderListSettings', ORDER_LIST_SETTINGS_DOC_ID),
  ])

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    collections: {
      employees,
      articles,
      orderStatuses,
      orders,
      orderHistory,
      pickupLocations,
      starterKitCategories,
    },
    singletons: { notificationSettings, bestellFormularSettings, orderListSettings },
  }
}

export function downloadBackupFile(data: BackupData): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  downloadBlob(blob, `uniformverwaltung-backup-${data.exportedAt.slice(0, 10)}.json`)
}

export async function parseBackupFile(file: File): Promise<BackupData> {
  let parsed: unknown
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    throw new Error('Datei ist kein gültiges JSON.')
  }
  const candidate = parsed as (Partial<BackupData> & { schemaVersion?: unknown; collections?: unknown }) | null
  if (
    typeof candidate !== 'object' ||
    candidate === null ||
    (candidate.schemaVersion !== 1 && candidate.schemaVersion !== BACKUP_SCHEMA_VERSION) ||
    typeof candidate.exportedAt !== 'string' ||
    typeof candidate.singletons !== 'object' ||
    candidate.singletons === null
  ) {
    throw new Error('Datei ist kein gültiges Backup dieser Anwendung.')
  }
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: candidate.exportedAt,
    collections: normalizeCollections(candidate.collections),
    singletons: candidate.singletons as BackupData['singletons'],
  }
}

async function deleteAllDocsInCollection(collectionName: string): Promise<void> {
  const snapshot = await getDocs(collection(db, collectionName))
  const ids = snapshot.docs.map((docSnap) => docSnap.id)
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = writeBatch(db)
    ids.slice(i, i + BATCH_SIZE).forEach((id) => batch.delete(doc(db, collectionName, id)))
    await batch.commit()
  }
}

/** Reverses JSON round-tripping (Date -> ISO string) for createdAt/updatedAt, and drops `id` (stored as the doc ID). */
function prepareForWrite<T extends { id: string }>(record: T): Record<string, unknown> {
  const { id: _id, ...rest } = record as unknown as Record<string, unknown>
  if (typeof rest.createdAt === 'string') rest.createdAt = new Date(rest.createdAt)
  if (typeof rest.updatedAt === 'string') rest.updatedAt = new Date(rest.updatedAt)
  return rest
}

async function restoreCollection<T extends { id: string }>(collectionName: string, records: T[]): Promise<void> {
  await deleteAllDocsInCollection(collectionName)
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = writeBatch(db)
    records.slice(i, i + BATCH_SIZE).forEach((record) => {
      batch.set(doc(db, collectionName, record.id), prepareForWrite(record))
    })
    await batch.commit()
  }
}

async function restoreSingleton<T extends { id: string }>(
  collectionName: string,
  docId: string,
  record: T | null,
): Promise<void> {
  if (!record) return
  await setDoc(doc(db, collectionName, docId), prepareForWrite(record))
}

export const BACKUP_RESTORE_STEP_LABELS = [
  'Mitarbeiter',
  'Artikel',
  'Bestellstatus',
  'Bestellungen',
  'Bestellverlauf',
  'Abholorte',
  'Basisausrüstung-Kategorien',
  'Benachrichtigungseinstellungen',
  'Bestellformular-Einstellungen',
  'Aktionsbutton-Einstellungen',
] as const

/**
 * Full delete-then-write restore per collection/singleton, so the result matches the backup
 * exactly (docs present in Firestore but absent from the backup are removed, not just merged).
 * Runs sequentially, not in parallel, to bound how many batched writes are in flight at once.
 */
export async function restoreBackupData(data: BackupData, onProgress?: (label: string) => void): Promise<void> {
  const steps: (() => Promise<void>)[] = [
    () => restoreCollection('employees', data.collections.employees),
    () => restoreCollection('articles', data.collections.articles),
    () => restoreCollection('orderStatuses', data.collections.orderStatuses),
    () => restoreCollection('orders', data.collections.orders),
    () => restoreCollection('orderHistory', data.collections.orderHistory),
    () => restoreCollection('pickupLocations', data.collections.pickupLocations),
    () => restoreCollection('starterKitCategories', data.collections.starterKitCategories),
    () => restoreSingleton('notificationSettings', NOTIFICATION_SETTINGS_DOC_ID, data.singletons.notificationSettings),
    () =>
      restoreSingleton('bestellFormularSettings', BESTELL_FORMULAR_SETTINGS_DOC_ID, data.singletons.bestellFormularSettings),
    () => restoreSingleton('orderListSettings', ORDER_LIST_SETTINGS_DOC_ID, data.singletons.orderListSettings),
  ]
  for (let i = 0; i < steps.length; i++) {
    onProgress?.(BACKUP_RESTORE_STEP_LABELS[i])
    await steps[i]()
  }
}
