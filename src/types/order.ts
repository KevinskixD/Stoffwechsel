export interface Order {
  id: string
  employeeId: string
  employeeName: string
  articleId: string
  articleName: string
  articleNumber: string
  /** Snapshot of Article.size at order time; '' if the article had none. */
  articleSize: string
  /** Snapshot of Article.pickupLocationName at order time; '' if the article had none. */
  pickupLocationName: string
  quantity: number
  statusId: string
  status: string
  /** ISO date string, YYYY-MM-DD, no time component */
  orderDate: string
  createdAt: Date
  updatedAt: Date
}

export type OrderInput = {
  employeeId: string
  employeeName: string
  articleId: string
  articleName: string
  articleNumber: string
  articleSize: string
  pickupLocationName: string
  quantity: number
  statusId: string
  status: string
  orderDate: string
}

export interface OrderFilters {
  employeeId?: string
  articleId?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  searchTerm?: string
}
