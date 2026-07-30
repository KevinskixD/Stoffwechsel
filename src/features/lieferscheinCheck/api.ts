import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { createConverter } from '../../firebase/converters'
import type { LieferscheinCheckInput, LieferscheinCheckRecord } from '../../types/lieferscheinCheck'

const lieferscheinCheckConverter = createConverter<LieferscheinCheckRecord>()
const lieferscheinChecksCollection = collection(db, 'lieferscheinChecks')

export async function createLieferscheinCheckRecord(input: LieferscheinCheckInput): Promise<void> {
  await addDoc(lieferscheinChecksCollection, {
    ...input,
    createdAt: serverTimestamp(),
  })
}

export async function findLieferscheinCheckByNumber(
  lieferscheinNumber: string,
): Promise<LieferscheinCheckRecord | null> {
  const snapshot = await getDocs(
    query(
      lieferscheinChecksCollection.withConverter(lieferscheinCheckConverter),
      where('lieferscheinNumber', '==', lieferscheinNumber),
    ),
  )
  return snapshot.docs[0]?.data() ?? null
}
