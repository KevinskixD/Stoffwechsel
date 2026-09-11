export interface OrderStatus {
  id: string
  name: string
  /** Stable role for a built-in workflow status; custom statuses deliberately have no role. */
  semanticKey?: OrderStatusSemanticKey | null
  sortOrder: number
  active: boolean
  /** Hex background color (e.g. "#FCA5A5"), freely configurable; '' falls back to a legacy default. */
  color: string
  createdAt: Date
  updatedAt: Date
}

export const ORDER_STATUS_SEMANTIC_KEYS = [
  'to_order',
  'ordered',
  'delivered',
  'notified',
  'picked_up',
  'exchange',
  'completed',
] as const

export type OrderStatusSemanticKey = (typeof ORDER_STATUS_SEMANTIC_KEYS)[number]

export const ORDER_STATUS_SEMANTIC_KEY_LABELS: Record<OrderStatusSemanticKey, string> = {
  to_order: 'Startstatus / zu bestellen',
  ordered: 'Bestellung ausgelöst',
  delivered: 'Geliefert',
  notified: 'Person informiert',
  picked_up: 'Abgeholt',
  exchange: 'Umtausch',
  completed: 'Abgeschlossen',
}

export const DEFAULT_ORDER_STATUSES: ReadonlyArray<{ semanticKey: OrderStatusSemanticKey; name: string }> = [
  { semanticKey: 'to_order', name: 'Zu Bestellen' },
  { semanticKey: 'ordered', name: 'Bestellt' },
  { semanticKey: 'delivered', name: 'Geliefert' },
  { semanticKey: 'notified', name: 'Informiert' },
  { semanticKey: 'picked_up', name: 'Abgeholt' },
  { semanticKey: 'exchange', name: 'Umtausch' },
  { semanticKey: 'completed', name: 'Abgeschlossen' },
]

/** Supports existing status records from before semantic keys were stored. */
export function getOrderStatusSemanticKey(
  status: Pick<OrderStatus, 'name' | 'semanticKey'>,
): OrderStatusSemanticKey | undefined {
  if (status.semanticKey !== undefined) return status.semanticKey ?? undefined
  return DEFAULT_ORDER_STATUSES.find((entry) => entry.name === status.name)?.semanticKey
}

export function hasOrderStatusSemanticKey(
  status: Pick<OrderStatus, 'name' | 'semanticKey'> | undefined,
  key: OrderStatusSemanticKey,
): boolean {
  return status !== undefined && getOrderStatusSemanticKey(status) === key
}
