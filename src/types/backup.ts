import type { Article } from './article'
import type { BestellFormularSettings } from './bestellFormularSettings'
import type { Employee } from './employee'
import type { NotificationSettings } from './notificationSettings'
import type { Order } from './order'
import type { OrderHistoryEntry } from './orderHistory'
import type { OrderListSettings } from './orderListSettings'
import type { OrderStatus } from './orderStatus'
import type { PickupLocation } from './pickupLocation'
import type { StarterKitCategory } from './starterKit'

export const BACKUP_SCHEMA_VERSION = 2

/**
 * A full point-in-time snapshot of every Firestore collection/document this app owns
 * (everything under firestore.rules except the internal `appMeta` seed marker). Restoring
 * one of these replaces a collection's contents entirely (delete-then-write), so the shape
 * must round-trip exactly what was exported - see src/features/backup/api.ts.
 */
export interface BackupData {
  schemaVersion: number
  /** ISO 8601 timestamp of when this backup was generated. */
  exportedAt: string
  collections: {
    employees: Employee[]
    articles: Article[]
    orderStatuses: OrderStatus[]
    orders: Order[]
    orderHistory: OrderHistoryEntry[]
    pickupLocations: PickupLocation[]
    starterKitCategories: StarterKitCategory[]
  }
  singletons: {
    notificationSettings: NotificationSettings | null
    bestellFormularSettings: BestellFormularSettings | null
    orderListSettings: OrderListSettings | null
  }
}

export interface BackupSummary {
  employees: number
  articles: number
  orderStatuses: number
  orders: number
  orderHistory: number
  pickupLocations: number
  starterKitCategories: number
}

export function summarizeBackup(data: BackupData): BackupSummary {
  return {
    employees: data.collections.employees.length,
    articles: data.collections.articles.length,
    orderStatuses: data.collections.orderStatuses.length,
    orders: data.collections.orders.length,
    orderHistory: data.collections.orderHistory.length,
    pickupLocations: data.collections.pickupLocations.length,
    starterKitCategories: data.collections.starterKitCategories.length,
  }
}
