import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import {
  DEFAULT_GREETING_TEMPLATE,
  DEFAULT_LINE_TEMPLATE,
  NOTIFICATION_SETTINGS_DOC_ID,
  type NotificationSettings,
} from '../../types/notificationSettings'

const settingsRef = () => doc(db, 'notificationSettings', NOTIFICATION_SETTINGS_DOC_ID)

export function defaultNotificationSettings(): NotificationSettings {
  return {
    id: NOTIFICATION_SETTINGS_DOC_ID,
    greetingTemplate: DEFAULT_GREETING_TEMPLATE,
    lineTemplate: DEFAULT_LINE_TEMPLATE,
    triggerStatusId: '',
    targetStatusId: '',
    updatedAt: new Date(),
  }
}

function fromSnapshot(data: Record<string, unknown> | undefined): NotificationSettings {
  if (!data) return defaultNotificationSettings()
  return {
    id: NOTIFICATION_SETTINGS_DOC_ID,
    greetingTemplate: (data.greetingTemplate as string | undefined) ?? DEFAULT_GREETING_TEMPLATE,
    lineTemplate: (data.lineTemplate as string | undefined) ?? DEFAULT_LINE_TEMPLATE,
    triggerStatusId: (data.triggerStatusId as string | undefined) ?? '',
    targetStatusId: (data.targetStatusId as string | undefined) ?? '',
    updatedAt: new Date(),
  }
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const snap = await getDoc(settingsRef())
  return fromSnapshot(snap.exists() ? snap.data() : undefined)
}

export function subscribeNotificationSettings(onChange: (settings: NotificationSettings) => void): () => void {
  return onSnapshot(settingsRef(), (snap) => onChange(fromSnapshot(snap.exists() ? snap.data() : undefined)))
}

export async function saveNotificationSettings(
  patch: Pick<NotificationSettings, 'greetingTemplate' | 'lineTemplate' | 'triggerStatusId' | 'targetStatusId'>,
): Promise<void> {
  await setDoc(settingsRef(), { ...patch, updatedAt: serverTimestamp() }, { merge: true })
}
