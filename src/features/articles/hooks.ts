import { useFirestoreQuery } from '../../shared/hooks/useFirestoreQuery'
import type { Article } from '../../types/article'
import { articlesQuery } from './api'

export function useArticles(includeInactive: boolean) {
  return useFirestoreQuery<Article>(() => articlesQuery(includeInactive), [includeInactive])
}
