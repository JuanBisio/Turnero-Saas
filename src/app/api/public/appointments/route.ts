/**
 * API Route: Create Public Appointment (from widget)
 * POST /api/public/appointments
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!


export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      shop_id,
      professional_id,
      service_id,
      start_time,
      end_time,
      customer_name,
      customer_phone,
      customer_email,
      cancellation_token,
    } = body

    // Validate required fields
    if (!shop_id || !professional_id || !service_id || !start_time || !end_time || !customer_name || !customer_phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Use ANON key to enforce RLS policies (instead of Service Role)
    const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    // Defense in Depth: Validate that the service actually belongs to the shop
    // This prevents IDOR where a user books a service from shop A into shop B's calendar
    const { data: serviceData, error: serviceCheckError } = await supabase
      .from('services')
      .select('shop_id')
      .eq('id', service_id)
      .single()

    if (serviceCheckError || !serviceData) {
       return NextResponse.json({ error: 'Invalid service' }, { status: 400 })
    }

    if (serviceData.shop_id !== shop_id) {
       return NextResponse.json({ error: 'Service does not match shop' }, { status: 400 })
    }

    // Generate fallback email if missing (since it's removed from UI)
    const emailToSave = customer_email || `${customer_phone.replace(/\D/g, '')}@no-email.placeholder`

    // Insert appointment
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        shop_id,
        professional_id,
        service_id,
        start_time,
        end_time,
        customer_name,
        customer_phone,
        customer_email: emailToSave,
        status: 'pendiente',
        cancellation_token,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating appointment:', error)
      return NextResponse.json(
        { error: 'Appointment creation failed. Check permissions.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Error in public appointments API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
