export interface OrderStatus {
  id: string
  name: string
  sortOrder: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export const DEFAULT_ORDER_STATUS_NAMES = [
  'Zu Bestellen',
  'Bestellt',
  'Geliefert',
  'Informiert',
  'Abgeholt',
  'Umtausch',
  'Abgeschlossen',
] as const
