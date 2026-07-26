import { useEffect, useState } from 'react'
import type { NotificationSettings } from '../../types/notificationSettings'
import { defaultNotificationSettings, subscribeNotificationSettings } from './api'

export function useNotificationSettings(): { data: NotificationSettings; loading: boolean } {
  const [data, setData] = useState<NotificationSettings>(defaultNotificationSettings())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = subscribeNotificationSettings((settings) => {
      setData(settings)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return { data, loading }
}
