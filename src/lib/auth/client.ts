/**
 * Auth Helpers - Client Side
 * For use in Client Components
 */

'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return {
    user,
    loading,
    signOut: async () => {
      await supabase.auth.signOut()
      router.push('/login')
    },
  }
}

export async function signIn(email: string, password: string) {
  const supabase = createClient()
  return await supabase.auth.signInWithPassword({ email, password })
}

export async function signUp(email: string, password: string) {
  const supabase = createClient()
  return await supabase.auth.signUp({ email, password })
}

export async function signOut() {
  const supabase = createClient()
  return await supabase.auth.signOut()
}
