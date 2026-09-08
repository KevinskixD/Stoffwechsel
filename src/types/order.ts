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
