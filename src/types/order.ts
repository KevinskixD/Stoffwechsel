export interface Order {
  id: string
  employeeId: string
  employeeName: string
  articleId: string
  articleName: string
  articleNumber: string
  /** Optional note attached to this individual order. */
  comment: string
  /** Snapshot of Article.size at order time; '' if the article had none. */
  articleSize: string
  /** Snapshot of Article.pickupLocationName at order time; '' if the article had none. */
  pickupLocationName: string
  quantity: number
  statusId: string
  status: string
  /** ISO date string, YYYY-MM-DD, no time component */
  orderDate: string
  /** True when this order was created as the issue of a loan article. */
  isLoanIssue: boolean
  /** ISO date the loan item was issued; '' for regular orders. */
  issuedDate: string
  /** ISO date the loan item was returned; '' while it is still out. */
  returnedDate: string
  /** Only relevant to loan issues. False means the item stays permanently issued. */
  returnRequired: boolean
  /** ISO timestamp of the return notification; absent on orders that have not been notified. */
  loanReturnNotificationAt?: string
  /** FK to the order this one replaced via Umtausch; '' if not created through an exchange. */
  exchangedFromOrderId: string
  /** Denormalized label (articleDisplayLabel) of the replaced order's article. */
  exchangedFromArticleName: string
  /** FK to the replacement order created via Umtausch; '' if this order hasn't been exchanged. */
  exchangedToOrderId: string
  /** Denormalized label (articleDisplayLabel) of the replacement order's article. */
  exchangedToArticleName: string
  createdAt: Date
  updatedAt: Date
}

export type OrderInput = {
  employeeId: string
  employeeName: string
  articleId: string
  articleName: string
  articleNumber: string
  comment: string
  articleSize: string
  pickupLocationName: string
  quantity: number
  statusId: string
  status: string
  orderDate: string
  isLoanIssue: boolean
  issuedDate: string
  returnedDate: string
  returnRequired: boolean
  exchangedFromOrderId: string
  exchangedFromArticleName: string
  exchangedToOrderId: string
  exchangedToArticleName: string
}

export interface OrderFilters {
  employeeId?: string
  articleId?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  searchTerm?: string
}

const LOAN_RETURN_NOTE = /(?:^|\n)[^\n]* am (\d{2}\.\d{2}\.\d{4}), \d{2}:\d{2} über die Rückgabe der Leihgabe informiert\.(?=\n|$)/

/** Also recognizes notes created before the notification timestamp was stored separately. */
export function loanReturnNotificationDate(order: Pick<Order, 'loanReturnNotificationAt' | 'comment'>): string {
  if (order.loanReturnNotificationAt) {
    const date = new Date(order.loanReturnNotificationAt)
    if (!Number.isNaN(date.getTime())) {
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      return `${day}.${month}.${date.getFullYear()}`
    }
  }
  return order.comment?.match(LOAN_RETURN_NOTE)?.[1] ?? ''
}

export function hasLoanReturnNotification(order: Pick<Order, 'loanReturnNotificationAt' | 'comment'>): boolean {
  return Boolean(loanReturnNotificationDate(order))
}

/** Keeps the automatic reminder in the saved comment, but leaves it out of the list preview. */
export function orderCommentPreview(order: Pick<Order, 'isLoanIssue' | 'comment'>): string {
  return order.isLoanIssue ? (order.comment ?? '').replace(LOAN_RETURN_NOTE, '').trim() : order.comment ?? ''
}
