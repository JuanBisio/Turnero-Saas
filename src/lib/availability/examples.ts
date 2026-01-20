/**
 * Example Usage of Availability Engine
 * This file demonstrates how to use the getAvailableSlots function
 */

import { getAvailableSlots, type AvailabilityParams } from './index'

/**
 * Example 1: Basic usage
 * Get available slots for a specific date, service, and professional
 */
export async function example1() {
  const params: AvailabilityParams = {
    date: '2026-01-22',              // Wednesday
    serviceId: 'service-uuid-here',   // e.g., "Corte de cabello"
    professionalId: 'prof-uuid-here', // e.g., "Juan"
    shopId: 'shop-uuid-here',         // Shop ID for RLS
  }

  try {
    const slots = await getAvailableSlots(params)
    console.log('Available slots:', slots)
    // Output: ["09:00", "09:40", "10:20", "11:00", ...]
  } catch (error) {
    console.error('Error:', error)
  }
}

/**
 * Example 2: Handling edge cases
 */
export async function example2() {
  const params: AvailabilityParams = {
    date: '2026-02-22',              // Date beyond 30 days
    serviceId: 'service-uuid',
    professionalId: 'prof-uuid',
    shopId: 'shop-uuid',
  }

  try {
    const slots = await getAvailableSlots(params)
    console.log('Slots:', slots)
  } catch (error) {
    // Expected error: "La fecha está fuera de la ventana de reserva"
    console.error('Expected error:', error)
  }
}

/**
 * Example 3: No available slots scenario
 * When professional doesn't work on that day or all slots are occupied
 */
export async function  example3() {
  const params: AvailabilityParams = {
    date: '2026-01-25',              // Sunday (assuming no schedule)
    serviceId: 'service-uuid',
    professionalId: 'prof-uuid',
    shopId: 'shop-uuid',
  }

  const slots = await getAvailableSlots(params)
  console.log('Slots on Sunday:', slots)
  // Output: [] (empty array if professional doesn't work Sundays)
}

/**
 * Example 4: API endpoint usage
 * How to call the availability API from the frontend
 */
export async function example4ClientSide() {
  const queryParams = new URLSearchParams({
    date: '2026-01-22',
    serviceId: 'service-uuid',
    professionalId: 'prof-uuid',
    shopId: 'shop-uuid',
  })

  const response = await fetch(`/api/v1/availability?${queryParams}`)
  const data = await response.json()
  
  if (response.ok) {
    console.log('Available slots:', data.availableSlots)
    console.log('Total count:', data.count)
  } else {
    console.error('API error:', data.error)
  }
}

/**
 * Mock Scenario: Complete workflow
 * 
 * Database setup needed:
 * 
 * 1. Shop:
 *    - id: shop-123
 *    - name: "Peluquería Ejemplo"
 *    - slug: "peluqueria-ejemplo"
 * 
 * 2. Professional:
 *    - id: prof-456
 *    - shop_id: shop-123
 *    - name: "Juan"
 *    - buffer_time_minutes: 10
 *    - is_active: true
 * 
 * 3. Service:
 *    - id: service-789
 *    - shop_id: shop-123
 *    - name: "Corte de cabello"
 *    - duration_minutes: 30
 * 
 * 4. Schedule (Wednesday):
 *    - professional_id: prof-456
 *    - day_of_week: 3
 *    - start_time: "09:00:00"
 *    - end_time: "18:00:00"
 * 
 * 5. Appointments (January 22, 2026):
 *    - start_time: "2026-01-22T10:20:00"
 *    - end_time: "2026-01-22T11:00:00"
 *    - status: "confirmado"
 * 
 * Expected result:
 * [
 *   "09:00",  // 09:00 - 09:40
 *   "09:40",  // 09:40 - 10:20
 *   // 10:20 - 11:00 is OCCUPIED
 *   "11:00",  // 11:00 - 11:40
 *   "11:40",  // 11:40 - 12:20
 *   ...
 *   "17:20"   // 17:20 - 18:00
 * ]
 */
