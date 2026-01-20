/**
 * Root Page - Redirect to dashboard or login
 */

import { getUser } from '@/lib/auth/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const user = await getUser()
  
  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
