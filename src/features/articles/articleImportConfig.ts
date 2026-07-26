import { collection, doc, getDocs, limit, orderBy, query, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { buildCompositeKey } from '../../shared/import/compositeKey'
import type { ImportEntityConfig } from '../../shared/import/types'
import { extractSizeFromArticleName } from '../../shared/utils/sizeExtraction'
import { normalizeForSearch } from '../../shared/utils/search'
import type { Article } from '../../types/article'

const UNIQUE_KEY_FIELDS = ['articleName', 'articleNumber']

/** Marks a row's pickupLocationId as referring to a location name not yet in Firestore — created in beforeCommit. */
const PENDING_LOCATION_PREFIX = '__pending_location__:'

interface ArticleImportPrefetch {
  pickupLocationsByName: Map<string, { id: string; name: string }>
}

export const articleImportConfig: ImportEntityConfig<Article, ArticleImportPrefetch> = {
  entityLabel: 'Artikel',
  collectionName: 'articles',
  listPath: '/articles',
  fields: [
    { targetField: 'articleName', label: 'Artikelbezeichnung', required: true, type: 'string' },
    { targetField: 'articleNumber', label: 'Artikelnummer', required: false, type: 'string' },
    { targetField: 'size', label: 'Größe', required: false, type: 'string' },
    { targetField: 'pickupLocationName', label: 'Abholort', required: false, type: 'string' },
  ],
  uniqueKeyFields: UNIQUE_KEY_FIELDS,
  fetchExistingKeys: async () => {
    const snapshot = await getDocs(collection(db, 'articles'))
    return new Set(snapshot.docs.map((docSnap) => buildCompositeKey(docSnap.data(), UNIQUE_KEY_FIELDS)))
  },
  prefetch: async () => {
    const snapshot = await getDocs(collection(db, 'pickupLocations'))
    const pickupLocationsByName = new Map<string, { id: string; name: string }>()
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data()
      pickupLocationsByName.set(normalizeForSearch(data.name), { id: docSnap.id, name: data.name })
    }
    return { pickupLocationsByName }
  },
  resolveRow: (data, prefetched) => {
    const resolved: Record<string, unknown> = {}

    const rawSize = data.size ? String(data.size).trim() : ''
    resolved.size = rawSize || extractSizeFromArticleName(String(data.articleName ?? ''))

    const pickupLocationName = data.pickupLocationName ? String(data.pickupLocationName).trim() : ''
    if (pickupLocationName) {
      const existing = prefetched.pickupLocationsByName.get(normalizeForSearch(pickupLocationName))
      if (existing) {
        resolved.pickupLocationId = existing.id
        resolved.pickupLocationName = existing.name
      } else {
        // Unknown location name from the file — created fresh in beforeCommit once all rows are known.
        resolved.pickupLocationId = `${PENDING_LOCATION_PREFIX}${pickupLocationName}`
        resolved.pickupLocationName = pickupLocationName
      }
    } else {
      resolved.pickupLocationId = ''
      resolved.pickupLocationName = ''
    }

    return { data: resolved, errors: [] }
  },
  beforeCommit: async (rows) => {
    const pendingNames = new Set<string>()
    for (const row of rows) {
      const pickupLocationId = row.data.pickupLocationId
      if (typeof pickupLocationId === 'string' && pickupLocationId.startsWith(PENDING_LOCATION_PREFIX)) {
        pendingNames.add(pickupLocationId.slice(PENDING_LOCATION_PREFIX.length))
      }
    }
    if (pendingNames.size === 0) return

    const pickupLocationsCollection = collection(db, 'pickupLocations')
    const lastSnap = await getDocs(query(pickupLocationsCollection, orderBy('sortOrder', 'desc'), limit(1)))
    let nextSortOrder = ((lastSnap.docs[0]?.data().sortOrder as number | undefined) ?? 0) + 10

    const nameToId = new Map<string, string>()
    const batch = writeBatch(db)
    for (const name of pendingNames) {
      const ref = doc(pickupLocationsCollection)
      batch.set(ref, {
        name,
        sortOrder: nextSortOrder,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      nameToId.set(name, ref.id)
      nextSortOrder += 10
    }
    await batch.commit()

    for (const row of rows) {
      const pickupLocationId = row.data.pickupLocationId
      if (typeof pickupLocationId === 'string' && pickupLocationId.startsWith(PENDING_LOCATION_PREFIX)) {
        row.data.pickupLocationId = nameToId.get(pickupLocationId.slice(PENDING_LOCATION_PREFIX.length))
      }
    }
  },
  mapRowToDoc: (data) => ({
    articleName: data.articleName as string,
    articleNumber: (data.articleNumber as string | undefined) ?? '',
    hasDeductible: false,
    deductibleAmount: 0,
    size: (data.size as string | undefined) ?? '',
    pickupLocationId: (data.pickupLocationId as string | undefined) ?? '',
    pickupLocationName: (data.pickupLocationName as string | undefined) ?? '',
    active: true,
  }),
}
