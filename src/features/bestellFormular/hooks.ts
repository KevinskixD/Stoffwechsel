import { useEffect, useState } from 'react'
import type { BestellFormularSettings } from '../../types/bestellFormularSettings'
import { defaultBestellFormularSettings, subscribeBestellFormularSettings } from './api'

export function useBestellFormularSettings(): { data: BestellFormularSettings; loading: boolean } {
  const [data, setData] = useState<BestellFormularSettings>(defaultBestellFormularSettings())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = subscribeBestellFormularSettings((settings) => {
      setData(settings)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return { data, loading }
}
