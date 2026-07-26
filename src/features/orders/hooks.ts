import { useFirestoreQuery } from '../../shared/hooks/useFirestoreQuery'
import type { Order } from '../../types/order'
import { ordersQuery, type OrderServerFilters } from './api'

export function useOrders(filters: OrderServerFilters) {
  return useFirestoreQuery<Order>(
    () => ordersQuery(filters),
    [filters.employeeId, filters.articleId, filters.status, filters.dateFrom, filters.dateTo],
  )
}
