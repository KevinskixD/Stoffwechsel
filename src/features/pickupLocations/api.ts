import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../../firebase/config'
import { createConverter } from '../../firebase/converters'
import type { PickupLocation } from '../../types/pickupLocation'

const pickupLocationConverter = createConverter<PickupLocation>()
const pickupLocationsCollection = collection(db, 'pickupLocations')

export function pickupLocationsQuery(includeInactive: boolean) {
  const converted = pickupLocationsCollection.withConverter(pickupLocationConverter)
  return includeInactive
    ? query(converted, orderBy('sortOrder'))
    : query(converted, where('active', '==', true), orderBy('sortOrder'))
}

export async function isPickupLocationNameTaken(name: string, excludeId?: string): Promise<boolean> {
  const snapshot = await getDocs(query(pickupLocationsCollection, where('name', '==', name)))
  return snapshot.docs.some((docSnap) => docSnap.id !== excludeId)
}

export async function createPickupLocation(name: string): Promise<void> {
  const snapshot = await getDocs(query(pickupLocationsCollection, orderBy('sortOrder', 'desc')))
  const maxSortOrder = (snapshot.docs[0]?.data().sortOrder as number | undefined) ?? 0
  await addDoc(pickupLocationsCollection, {
    name,
    sortOrder: maxSortOrder + 10,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function renamePickupLocation(id: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'pickupLocations', id), { name, updatedAt: serverTimestamp() })
}

export async function setPickupLocationActive(id: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, 'pickupLocations', id), { active, updatedAt: serverTimestamp() })
}

/** Blocks deletion if any article still references this location — there is no reassignment flow. */
export async function deletePickupLocation(id: string): Promise<void> {
  const inUse = await getDocs(query(collection(db, 'articles'), where('pickupLocationId', '==', id)))
  if (!inUse.empty) {
    throw new Error(`Abholort wird noch von ${inUse.size} Artikel(n) verwendet und kann nicht gelöscht werden.`)
  }
  await deleteDoc(doc(db, 'pickupLocations', id))
}

/** Full renumber: rewrites sortOrder 10,20,30… for all locations in the given order. */
export async function reorderPickupLocations(orderedIds: string[]): Promise<void> {
  const batch = writeBatch(db)
  orderedIds.forEach((id, index) => {
    batch.update(doc(db, 'pickupLocations', id), {
      sortOrder: (index + 1) * 10,
      updatedAt: serverTimestamp(),
    })
  })
  await batch.commit()
}
