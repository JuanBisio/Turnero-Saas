/**
 * API Route: Sign Out
 * POST /api/auth/signout
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  // Dynamic redirect to /login on the same domain
  // Use status 303 to force the browser to use GET for the next request
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 })
}
