import { useFirestoreQuery } from '../../shared/hooks/useFirestoreQuery'
import type { Employee } from '../../types/employee'
import { employeesQuery } from './api'

export function useEmployees(includeInactive: boolean) {
  return useFirestoreQuery<Employee>(() => employeesQuery(includeInactive), [includeInactive])
}
