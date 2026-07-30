export interface OrderStatus {
  id: string
  name: string
  sortOrder: number
  active: boolean
  /** Hex background color (e.g. "#FCA5A5"), freely configurable; '' falls back to a legacy default. */
  color: string
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
