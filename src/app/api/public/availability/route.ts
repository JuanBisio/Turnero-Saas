/**
 * API Route: Get Available Slots (Public)
 * For use in the public widget
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { getAvailableSlots } from '@/lib/availability'

// Create a public Supabase client (bypasses RLS for public widget)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  // Create public client outside try block
  const supabase = createClient<Database>(supabaseUrl, supabaseKey)

  try {
    const { searchParams } = new URL(request.url)
    
    const date = searchParams.get('date')
    const serviceId = searchParams.get('serviceId')
    const professionalId = searchParams.get('professionalId')
    const shopId = searchParams.get('shopId')
    
    if (!date || !serviceId || !professionalId || !shopId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }
    
    const slots = await getAvailableSlots({
      date,
      serviceId,
      professionalId,
      shopId,
      supabaseClient: supabase,
    })

    return NextResponse.json({
      date,
      availableSlots: slots,
      count: slots.length,
    })
  } catch (error) {
    console.error('Error in public availability API:', error)
    
    return NextResponse.json(
      { error: 'Error fetching available slots' },
      { status: 500 }
    )
  }
}
