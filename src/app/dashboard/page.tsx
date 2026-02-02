/**
 * Root Dashboard Page
 * Redirects to the user's first shop or onboarding
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardRootPage() {
  const supabase = await createClient()

  // 1. Check Auth
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // 2. Fetch User's Shops
  // We join shop_users table to find shops linked to this user
  // 2. Fetch User's Shops
  // We split this into two steps to be safe against complex joins/RLS
  const { data: updatedMemberships } = await supabase
    .from('shop_users')
    .select('shop_id')
    .eq('user_id', user.id)
    .limit(1)

  // 3. Make Decision
  if (updatedMemberships && updatedMemberships.length > 0) {
    const shopId = updatedMemberships[0].shop_id
    
    // Fetch shop details specifically
    const { data: shop } = await supabase
        .from('shops')
        .select('slug')
        .eq('id', shopId)
        .single()
    
    if (shop?.slug) {
      redirect(`/dashboard/${shop.slug}`)
    }
  }

  // No shops found -> Onboarding
  redirect('/onboarding')
}
