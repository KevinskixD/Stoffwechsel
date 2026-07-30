import { useFirestoreQuery } from '../../shared/hooks/useFirestoreQuery'
import type { OrderHistoryEntry } from '../../types/orderHistory'
import { orderHistoryQuery } from './api'

export function useOrderHistory() {
  return useFirestoreQuery<OrderHistoryEntry>(() => orderHistoryQuery(), [])
}
