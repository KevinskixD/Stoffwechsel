import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../../firebase/config'
import { createConverter } from '../../firebase/converters'
import type { StarterKitCategory } from '../../types/starterKit'

const starterKitCategoryConverter = createConverter<StarterKitCategory>()
const starterKitCategoriesCollection = collection(db, 'starterKitCategories')

export function starterKitCategoriesQuery() {
  return query(starterKitCategoriesCollection.withConverter(starterKitCategoryConverter), orderBy('sortOrder'))
}

export async function createStarterKitCategory(label: string): Promise<void> {
  const snapshot = await getDocs(query(starterKitCategoriesCollection, orderBy('sortOrder', 'desc')))
  const maxSortOrder = (snapshot.docs[0]?.data().sortOrder as number | undefined) ?? 0
  await addDoc(starterKitCategoriesCollection, {
    label,
    articleIds: [],
    sortOrder: maxSortOrder + 10,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function renameStarterKitCategory(id: string, label: string): Promise<void> {
  await updateDoc(doc(db, 'starterKitCategories', id), { label, updatedAt: serverTimestamp() })
}

export async function deleteStarterKitCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, 'starterKitCategories', id))
}

/** Full renumber: rewrites sortOrder 10,20,30… for all categories in the given order. */
export async function reorderStarterKitCategories(orderedIds: string[]): Promise<void> {
  const batch = writeBatch(db)
  orderedIds.forEach((id, index) => {
    batch.update(doc(db, 'starterKitCategories', id), {
      sortOrder: (index + 1) * 10,
      updatedAt: serverTimestamp(),
    })
  })
  await batch.commit()
}

export async function addArticleToCategory(categoryId: string, articleId: string): Promise<void> {
  await updateDoc(doc(db, 'starterKitCategories', categoryId), {
    articleIds: arrayUnion(articleId),
    updatedAt: serverTimestamp(),
  })
}

export async function removeArticleFromCategory(categoryId: string, articleId: string): Promise<void> {
  await updateDoc(doc(db, 'starterKitCategories', categoryId), {
    articleIds: arrayRemove(articleId),
    updatedAt: serverTimestamp(),
  })
}
