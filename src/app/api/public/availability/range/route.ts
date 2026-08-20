/**
 * API Route: Get Availability Status for a Date Range (Public)
 * For painting the widget's date picker (available / no-schedule / blocked / full)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { Database } from '@/lib/supabase/database.types'
import { getAvailabilityStatusForRange, AVAILABILITY_CONFIG } from '@/lib/availability'

// Create a public Supabase client (bypasses RLS for public widget)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  // Create public client outside try block
  const supabase = createClient<Database>(supabaseUrl, supabaseKey)

  try {
    const { searchParams } = new URL(request.url)

    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const serviceId = searchParams.get('serviceId')
    const professionalId = searchParams.get('professionalId')
    const shopId = searchParams.get('shopId')

    if (!startDate || !endDate || !serviceId || !professionalId || !shopId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const rangeDays = differenceInCalendarDays(parseISO(endDate), parseISO(startDate))
    if (rangeDays < 0 || rangeDays > AVAILABILITY_CONFIG.MAX_BOOKING_DAYS) {
      return NextResponse.json(
        { error: 'Invalid date range' },
        { status: 400 }
      )
    }

    const days = await getAvailabilityStatusForRange({
      startDate,
      endDate,
      serviceId,
      professionalId,
      shopId,
      supabaseClient: supabase,
    })

    return NextResponse.json({ days })
  } catch (error) {
    console.error('Error in public availability range API:', error)

    return NextResponse.json(
      { error: 'Error fetching availability range' },
      { status: 500 }
    )
  }
}
