/**
 * Auth Helpers - Server Side
 * For use in Server Components and Route Handlers
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

/**
 * Get current user authenticated against the Supabase Auth server.
 * Uses getUser() (not getSession()) to avoid trusting unverified cookie data.
 */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user ?? null
}

/**
 * Require authentication (throws redirect if not authenticated)
 */
export async function requireAuth(): Promise<User> {
  const user = await getUser()
  if (!user) {
    redirect('/login')
  }
  return user
}

/**
 * Get shops that the current user belongs to
 */
export async function getUserShops() {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data: shopUsers, error } = await supabase
    .from('shop_users')
    .select(`
      shop_id,
      role,
      shop:shops(id, name, slug, timezone)
    `)
    .eq('user_id', user.id)

  if (error || !shopUsers) {
    console.error('Error fetching user shops:', error)
    return []
  }

  return shopUsers.map((su: any) => ({
    id: su.shop.id,
    name: su.shop.name,
    slug: su.shop.slug,
    timezone: su.shop.timezone,
    userRole: su.role,
  }))
}

/**
 * Check if user has access to a shop
 */
export async function hasShopAccess(shopId: string): Promise<boolean> {
  const user = await getUser()
  if (!user) return false

  const supabase = await createClient()

  const { data } = await supabase
    .from('shop_users')
    .select('id')
    .eq('shop_id', shopId)
    .eq('user_id', user.id)
    .single()

  return !!data
}

/**
 * Require shop access (throws redirect if user doesn't have access)
 */
export async function requireShopAccess(shopId: string) {
  const hasAccess = await hasShopAccess(shopId)
  if (!hasAccess) {
    redirect('/dashboard')
  }
}
