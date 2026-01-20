/**
 * API Route: Get Available Slots
 * GET /api/v1/availability
 * 
 * Query Parameters:
 * - date: string (YYYY-MM-DD)
 * - serviceId: string (UUID)
 * - professionalId: string (UUID)
 * - shopId: string (UUID)
 * 
 * Returns: Array of available time slots in HH:mm format
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAvailableSlots } from '@/lib/availability'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Extract query parameters
    const date = searchParams.get('date')
    const serviceId = searchParams.get('serviceId')
    const professionalId = searchParams.get('professionalId')
    const shopId = searchParams.get('shopId')
    
    // Validate required parameters
    if (!date || !serviceId || !professionalId || !shopId) {
      return NextResponse.json(
        {
          error: 'Parámetros faltantes',
          required: ['date', 'serviceId', 'professionalId', 'shopId'],
        },
        { status: 400 }
      )
    }
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        {
          error: 'Formato de fecha inválido. Use YYYY-MM-DD',
        },
        { status: 400 }
      )
    }
    
    // Calculate available slots
    const slots = await getAvailableSlots({
      date,
      serviceId,
      professionalId,
      shopId,
    })
    
    return NextResponse.json({
      date,
      serviceId,
      professionalId,
      availableSlots: slots,
      count: slots.length,
    })
    
  } catch (error) {
    console.error('Error in availability API:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    
    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}
