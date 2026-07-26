import { useFirestoreQuery } from '../../shared/hooks/useFirestoreQuery'
import type { PickupLocation } from '../../types/pickupLocation'
import { pickupLocationsQuery } from './api'

export function usePickupLocations(includeInactive: boolean) {
  return useFirestoreQuery<PickupLocation>(() => pickupLocationsQuery(includeInactive), [includeInactive])
}
