export type OrderHistoryAction = 'created' | 'updated' | 'status_changed'

export interface OrderHistoryChange {
  field: string
  label: string
  /** Empty string for 'created' entries — there is no previous value to show. */
  from: string
  to: string
}

export interface OrderHistoryEntry {
  id: string
  orderId: string
  /** Denormalized snapshot at log time, same convention as Order.employeeName/articleName. */
  employeeName: string
  articleName: string
  action: OrderHistoryAction
  changes: OrderHistoryChange[]
  createdAt: Date
}
