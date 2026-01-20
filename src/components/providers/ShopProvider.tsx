/**
 * Shop Context Provider
 * Manages shop_id and shop_slug across the dashboard
 */

'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ShopContextType {
  shopId: string | null
  shopSlug: string
  shopData: ShopData | null
  isLoading: boolean
  refetchShop: () => Promise<void>
}

interface ShopData {
  id: string
  name: string
  slug: string
  timezone: string
  min_lead_time_minutes: number
  theme: any
  api_key_n8n: string
  webhook_url: string | null
  webhook_enabled: boolean
  webhook_secret: string | null
}

const ShopContext = createContext<ShopContextType | undefined>(undefined)

export function ShopProvider({
  children,
  shopSlug,
}: {
  children: React.ReactNode
  shopSlug: string
}) {
  const [shopId, setShopId] = useState<string | null>(null)
  const [shopData, setShopData] = useState<ShopData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchShop = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('shops')
        .select('id, name, slug, timezone, min_lead_time_minutes, theme')
        .eq('slug', shopSlug)
        .single()

      if (error) {
        console.error('Error fetching shop:', error)
        return
      }

      if (data) {
        setShopId(data.id)
        setShopData(data as ShopData)
      }
    } catch (error) {
      console.error('Error in fetchShop:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchShop()
  }, [shopSlug])

  const refetchShop = async () => {
    await fetchShop()
  }

  return (
    <ShopContext.Provider
      value={{
        shopId,
        shopSlug,
        shopData,
        isLoading,
        refetchShop,
      }}
    >
      {children}
    </ShopContext.Provider>
  )
}

export function useShop() {
  const context = useContext(ShopContext)
  if (context === undefined) {
    throw new Error('useShop must be used within a ShopProvider')
  }
  return context
}
