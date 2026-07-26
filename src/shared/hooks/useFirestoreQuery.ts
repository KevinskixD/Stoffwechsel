import { useEffect, useState } from 'react'
import { onSnapshot, type Query } from 'firebase/firestore'

interface FirestoreQueryState<T> {
  data: T[]
  loading: boolean
  error: Error | null
}

/**
 * Subscribes to a Firestore query built by `queryFactory`. The factory is re-run whenever
 * `deps` changes (same contract as `useEffect`'s deps array) rather than on every render,
 * since a freshly-built Query object has a new identity each render and would otherwise
 * tear down and resubscribe on every parent re-render.
 */
export function useFirestoreQuery<T>(
  queryFactory: () => Query<T> | null,
  deps: unknown[],
): FirestoreQueryState<T> {
  const [state, setState] = useState<FirestoreQueryState<T>>({ data: [], loading: true, error: null })

  useEffect(() => {
    const query = queryFactory()
    if (!query) {
      setState({ data: [], loading: false, error: null })
      return
    }
    setState((prev) => ({ ...prev, loading: true }))
    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        setState({ data: snapshot.docs.map((doc) => doc.data()), loading: false, error: null })
      },
      (error) => {
        setState({ data: [], loading: false, error })
      },
    )
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}
