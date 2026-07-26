import { useFirestoreQuery } from '../../shared/hooks/useFirestoreQuery'
import type { OrderStatus } from '../../types/orderStatus'
import { orderStatusesQuery } from './api'

export function useOrderStatuses(includeInactive: boolean) {
  return useFirestoreQuery<OrderStatus>(() => orderStatusesQuery(includeInactive), [includeInactive])
}
