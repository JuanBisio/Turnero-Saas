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
  const { data: memberships } = await supabase
    .from('shop_users')
    .select('shop:shops(slug)')
    .eq('user_id', user.id)
    .limit(1)

  // 3. Make Decision
  if (memberships && memberships.length > 0) {
    // User has a shop -> Redirect to first shop dashboard
    // @ts-ignore
    const slug = memberships[0].shop?.slug
    if (slug) {
      redirect(`/dashboard/${slug}`)
    }
  }

  // No shops found -> Onboarding
  redirect('/onboarding')
}
