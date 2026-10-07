import { useEffect, useState } from 'react'
import type { Api, Shop } from './client'

/** The server's word on the price and whether orders are open. Null until it answers (or with no server). */
export function useShop(api: Api | null): Shop | null {
  const [shop, setShop] = useState<Shop | null>(null)
  useEffect(() => {
    if (!api) return
    let stale = false
    api.shop().then(s => { if (!stale) setShop(s) }, () => {
      // Unknown for now: the built-in price shows, and the server still checks at checkout.
    })
    return () => { stale = true }
  }, [api])
  return shop
}
