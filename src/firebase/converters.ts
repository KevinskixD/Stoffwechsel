import type { FirestoreDataConverter, QueryDocumentSnapshot, Timestamp } from 'firebase/firestore'

/**
 * Generic converter for documents shaped as `{ id, createdAt, updatedAt, ...fields }`.
 * `toFirestore` strips `id` (Firestore stores it as the doc ID, not a field) and passes
 * everything else through as-is, so callers can pass `serverTimestamp()` FieldValues for
 * createdAt/updatedAt on write. `fromFirestore` converts those Timestamps back to `Date`.
 */
export function createConverter<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore(data) {
      const { id: _id, ...rest } = data as Record<string, unknown>
      return rest
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): T {
      const data = snapshot.data()
      return {
        id: snapshot.id,
        ...data,
        createdAt: (data.createdAt as Timestamp | undefined)?.toDate?.() ?? new Date(),
        updatedAt: (data.updatedAt as Timestamp | undefined)?.toDate?.() ?? new Date(),
      } as unknown as T
    },
  }
}
