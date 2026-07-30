import { useEffect, useState } from 'react'
import type { OrderListSettings } from '../../types/orderListSettings'
import { defaultOrderListSettings, subscribeOrderListSettings } from './api'

export function useOrderListSettings(): { data: OrderListSettings; loading: boolean } {
  const [data, setData] = useState<OrderListSettings>(defaultOrderListSettings())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = subscribeOrderListSettings((settings) => {
      setData(settings)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return { data, loading }
}
