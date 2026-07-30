import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { ORDER_LIST_SETTINGS_DOC_ID, type OrderListSettings } from '../../types/orderListSettings'

const settingsRef = () => doc(db, 'orderListSettings', ORDER_LIST_SETTINGS_DOC_ID)

export function defaultOrderListSettings(): OrderListSettings {
  return {
    id: ORDER_LIST_SETTINGS_DOC_ID,
    showExcelImport: true,
    showEmployeeNameSync: true,
    showPickupLocationSync: true,
    showArticleDataSync: true,
    showGenerateBestellFile: true,
    updatedAt: new Date(),
  }
}

function fromSnapshot(data: Record<string, unknown> | undefined): OrderListSettings {
  const defaults = defaultOrderListSettings()
  if (!data) return defaults
  return {
    id: ORDER_LIST_SETTINGS_DOC_ID,
    showExcelImport: (data.showExcelImport as boolean | undefined) ?? defaults.showExcelImport,
    showEmployeeNameSync: (data.showEmployeeNameSync as boolean | undefined) ?? defaults.showEmployeeNameSync,
    showPickupLocationSync: (data.showPickupLocationSync as boolean | undefined) ?? defaults.showPickupLocationSync,
    showArticleDataSync: (data.showArticleDataSync as boolean | undefined) ?? defaults.showArticleDataSync,
    showGenerateBestellFile: (data.showGenerateBestellFile as boolean | undefined) ?? defaults.showGenerateBestellFile,
    updatedAt: new Date(),
  }
}

export async function getOrderListSettings(): Promise<OrderListSettings> {
  const snap = await getDoc(settingsRef())
  return fromSnapshot(snap.exists() ? snap.data() : undefined)
}

export function subscribeOrderListSettings(onChange: (settings: OrderListSettings) => void): () => void {
  return onSnapshot(settingsRef(), (snap) => onChange(fromSnapshot(snap.exists() ? snap.data() : undefined)))
}

export async function saveOrderListSettings(
  patch: Pick<
    OrderListSettings,
    'showExcelImport' | 'showEmployeeNameSync' | 'showPickupLocationSync' | 'showArticleDataSync' | 'showGenerateBestellFile'
  >,
): Promise<void> {
  await setDoc(settingsRef(), { ...patch, updatedAt: serverTimestamp() }, { merge: true })
}
