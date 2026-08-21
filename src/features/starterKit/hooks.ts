import { useFirestoreQuery } from '../../shared/hooks/useFirestoreQuery'
import type { StarterKitCategory } from '../../types/starterKit'
import { starterKitCategoriesQuery } from './api'

export function useStarterKitCategories() {
  return useFirestoreQuery<StarterKitCategory>(() => starterKitCategoriesQuery(), [])
}
