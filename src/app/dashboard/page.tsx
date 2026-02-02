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
  const { data: updatedMemberships, error: memberError } = await supabase
    .from('shop_users')
    .select('shop_id')
    .eq('user_id', user.id)
    .limit(1)

  console.log('[Dashboard] User:', user.id)
  console.log('[Dashboard] Membership check:', { updatedMemberships, memberError })

  // 3. Make Decision
  if (updatedMemberships && updatedMemberships.length > 0) {
    const shopId = updatedMemberships[0].shop_id
    
    // Fetch shop details specifically
    const { data: shop, error: shopError } = await supabase
        .from('shops')
        .select('slug')
        .eq('id', shopId)
        .single()

    console.log('[Dashboard] Shop check:', { shop, shopError })
    
    if (shop?.slug) {
      redirect(`/dashboard/${shop.slug}`)
    }
  } else {
    console.log('[Dashboard] No memberships found, redirecting to onboarding')
  }

  // No shops found -> Onboarding
  redirect('/onboarding')
}
