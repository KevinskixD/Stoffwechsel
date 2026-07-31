import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../../firebase/config'
import { createConverter } from '../../firebase/converters'
import { extractSizeFromArticleName } from '../../shared/utils/sizeExtraction'
import type { Article, ArticleInput } from '../../types/article'

const articleConverter = createConverter<Article>()
const articlesCollection = collection(db, 'articles')

const DELETE_BATCH_SIZE = 500

export function articlesQuery(includeInactive: boolean) {
  const converted = articlesCollection.withConverter(articleConverter)
  return includeInactive
    ? query(converted, orderBy('articleName'))
    : query(converted, where('active', '==', true), orderBy('articleName'))
}

export async function getArticle(id: string): Promise<Article | null> {
  const snapshot = await getDoc(doc(db, 'articles', id).withConverter(articleConverter))
  return snapshot.exists() ? snapshot.data() : null
}

export async function createArticle(input: ArticleInput): Promise<void> {
  await addDoc(articlesCollection, {
    ...input,
    deductibleAmount: input.hasDeductible ? input.deductibleAmount : 0,
    inventoryQuantity: input.trackInventory ? input.inventoryQuantity : 0,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateArticle(id: string, input: ArticleInput): Promise<void> {
  await updateDoc(doc(db, 'articles', id), {
    ...input,
    deductibleAmount: input.hasDeductible ? input.deductibleAmount : 0,
    inventoryQuantity: input.trackInventory ? input.inventoryQuantity : 0,
    updatedAt: serverTimestamp(),
  })
}

export async function setArticleActive(id: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, 'articles', id), {
    active,
    updatedAt: serverTimestamp(),
  })
}

export async function updateArticleField(
  id: string,
  field: 'articleName' | 'articleNumber' | 'size',
  value: string,
): Promise<void> {
  await updateDoc(doc(db, 'articles', id), {
    [field]: value,
    updatedAt: serverTimestamp(),
  })
}

export async function updateArticleDeductibleAmount(id: string, deductibleAmount: number): Promise<void> {
  await updateDoc(doc(db, 'articles', id), {
    deductibleAmount,
    updatedAt: serverTimestamp(),
  })
}

export async function updateArticleInventoryQuantity(id: string, inventoryQuantity: number): Promise<void> {
  await updateDoc(doc(db, 'articles', id), {
    inventoryQuantity,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Adjusts an article's stock by a relative delta (positive = restock, negative = consume),
 * used by order create/edit/delete. No-op if the article doesn't track inventory. Uses
 * Firestore's atomic `increment()` for the write; the preceding read only gates whether
 * tracking is on for this article, so it doesn't need a transaction.
 */
export async function adjustArticleInventory(articleId: string, delta: number): Promise<void> {
  if (!articleId || delta === 0) return
  const article = await getArticle(articleId)
  if (!article || !article.trackInventory) return
  await updateDoc(doc(db, 'articles', articleId), {
    inventoryQuantity: increment(delta),
    updatedAt: serverTimestamp(),
  })
}

export async function deleteArticle(id: string): Promise<void> {
  await deleteDoc(doc(db, 'articles', id))
}

export async function deleteArticles(ids: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i += DELETE_BATCH_SIZE) {
    const chunk = ids.slice(i, i + DELETE_BATCH_SIZE)
    const batch = writeBatch(db)
    chunk.forEach((id) => batch.delete(doc(db, 'articles', id)))
    await batch.commit()
  }
}

export async function deleteAllArticles(): Promise<void> {
  const snapshot = await getDocs(articlesCollection)
  await deleteArticles(snapshot.docs.map((docSnap) => docSnap.id))
}

export async function assignPickupLocationToArticles(
  articleIds: string[],
  pickupLocationId: string,
  pickupLocationName: string,
): Promise<void> {
  for (let i = 0; i < articleIds.length; i += DELETE_BATCH_SIZE) {
    const chunk = articleIds.slice(i, i + DELETE_BATCH_SIZE)
    const batch = writeBatch(db)
    chunk.forEach((id) =>
      batch.update(doc(db, 'articles', id), { pickupLocationId, pickupLocationName, updatedAt: serverTimestamp() }),
    )
    await batch.commit()
  }
}

export async function assignDeductibleToArticles(
  articleIds: string[],
  hasDeductible: boolean,
  deductibleAmount: number,
): Promise<void> {
  for (let i = 0; i < articleIds.length; i += DELETE_BATCH_SIZE) {
    const chunk = articleIds.slice(i, i + DELETE_BATCH_SIZE)
    const batch = writeBatch(db)
    chunk.forEach((id) =>
      batch.update(doc(db, 'articles', id), {
        hasDeductible,
        deductibleAmount: hasDeductible ? deductibleAmount : 0,
        updatedAt: serverTimestamp(),
      }),
    )
    await batch.commit()
  }
}

/** One-time backfill: fills `size` from `articleName` for articles that don't have one yet. */
export async function backfillArticleSizes(): Promise<{ updated: number }> {
  const snapshot = await getDocs(articlesCollection)
  const toUpdate = snapshot.docs.filter((docSnap) => !(docSnap.data().size as string | undefined))
  let updated = 0
  for (let i = 0; i < toUpdate.length; i += DELETE_BATCH_SIZE) {
    const chunk = toUpdate.slice(i, i + DELETE_BATCH_SIZE)
    const batch = writeBatch(db)
    for (const docSnap of chunk) {
      const extracted = extractSizeFromArticleName(docSnap.data().articleName as string)
      if (extracted) {
        batch.update(docSnap.ref, { size: extracted, updatedAt: serverTimestamp() })
        updated++
      }
    }
    await batch.commit()
  }
  return { updated }
}
