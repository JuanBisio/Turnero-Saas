/**
 * Main Availability Engine
 * Calculates available time slots for booking appointments
 * 
 * Algorithm (5 Steps):
 * 1. Define time frame (get workday schedule)
 * 2. Get existing appointments
 * 3. Generate potential slot grid
 * 4. Filter collisions (appointments + exceptions + lead time)
 * 5. Format response
 */

import { createClient } from '../supabase/server'
import type { Database } from '../supabase/database.types'
import {
  AvailabilityParams,
  AvailabilityResult,
  ScheduleData,
  ExceptionData,
  AppointmentOccupation,
  ServiceData,
  ProfessionalData,
  TimeSlot,
  AVAILABILITY_CONFIG,
} from './types'
import {
  getDayOfWeek,
  isWithinBookingWindow,
  combineDateAndTime,
  formatTimeSlot,
} from './timeUtils'
import { generatePotentialSlots, calculateBlockDuration } from './slotGeneration'
import { filterAvailableSlots } from './collisionDetection'

/**
 * Main function: Calculates available time slots for a given date, service, and professional
 * 
 * @param params - Availability parameters
 * @returns Array of available time slots in HH:mm format
 * 
 * @throws Error if date is outside booking window or if data is invalid
 * 
 * @example
 * const slots = await getAvailableSlots({
 *   date: '2026-01-22',
 *   serviceId: 'abc-123',
 *   professionalId: 'def-456',
 *   shopId: 'ghi-789'
 * })
 * // Returns: ["09:00", "09:40", "11:00", "11:40", ...]
 */
export async function getAvailableSlots(
  params: AvailabilityParams
): Promise<AvailabilityResult> {
  const { date, serviceId, professionalId, shopId } = params

  // ============================================
  // VALIDATION: Check booking window (30 days)
  // ============================================
  if (!isWithinBookingWindow(date)) {
    throw new Error('La fecha está fuera de la ventana de reserva (máximo 30 días)')
  }

  const supabase = await createClient()

  // ============================================
  // STEP 0: Fetch service and professional data
  // ============================================
  const [serviceResult, professionalResult] = await Promise.all([
    supabase
      .from('services')
      .select('id, duration_minutes')
      .eq('id', serviceId)
      .eq('shop_id', shopId)
      .single(),
    
    supabase
      .from('professionals')
      .select('id, buffer_time_minutes, is_active')
      .eq('id', professionalId)
      .eq('shop_id', shopId)
      .single(),
  ])

  if (serviceResult.error || !serviceResult.data) {
    throw new Error('Servicio no encontrado')
  }

  if (professionalResult.error || !professionalResult.data) {
    throw new Error('Profesional no encontrado')
  }

  const service: ServiceData = {
    id: serviceResult.data.id,
    durationMinutes: serviceResult.data.duration_minutes,
  }

  const professional: ProfessionalData = {
    id: professionalResult.data.id,
    bufferTimeMinutes: professionalResult.data.buffer_time_minutes || 0,
    isActive: professionalResult.data.is_active,
  }

  if (!professional.isActive) {
    throw new Error('El profesional no está activo')
  }

  // Calculate total block duration
  const blockDuration = calculateBlockDuration(
    service.durationMinutes,
    professional.bufferTimeMinutes
  )

  // ============================================
  // STEP 1: Define time frame (get workday)
  // ============================================
  const dayOfWeek = getDayOfWeek(date)

  // Get base schedule for this day of week
  const { data: scheduleData, error: scheduleError } = await supabase
    .from('schedules')
    .select('day_of_week, start_time, end_time')
    .eq('professional_id', professionalId)
    .eq('day_of_week', dayOfWeek)
    .single()

  if (scheduleError || !scheduleData) {
    // No schedule configured for this day -> no available slots
    return []
  }

  // Check for exceptions on this specific date
  const { data: exceptionsData } = await supabase
    .from('exceptions')
    .select('specific_date, start_time, end_time, is_blocked')
    .eq('professional_id', professionalId)
    .eq('specific_date', date)

  const exceptions: ExceptionData[] = (exceptionsData || []).map(exc => ({
    specificDate: exc.specific_date,
    startTime: exc.start_time,
    endTime: exc.end_time,
    isBlocked: exc.is_blocked,
  }))

  // Check if day is fully blocked (exception with no times specified)
  const isFullyBlocked = exceptions.some(
    exc => exc.isBlocked && exc.startTime === null && exc.endTime === null
  )

  if (isFullyBlocked) {
    // Day is marked as non-working -> no slots
    return []
  }

  // Determine actual work hours (exception overrides schedule if both times are specified)
  const workdayException = exceptions.find(
    exc => exc.startTime !== null && exc.endTime !== null && !exc.isBlocked
  )

  let workdayStart: Date
  let workdayEnd: Date

  if (workdayException) {
    // Use exception hours instead of regular schedule
    workdayStart = combineDateAndTime(date, workdayException.startTime!)
    workdayEnd = combineDateAndTime(date, workdayException.endTime!)
  } else {
    // Use regular schedule
    workdayStart = combineDateAndTime(date, scheduleData.start_time)
    workdayEnd = combineDateAndTime(date, scheduleData.end_time)
  }

  // ============================================
  // STEP 2: Get existing appointments
  // ============================================
  const { data: appointmentsData } = await supabase
    .from('appointments')
    .select('start_time, end_time, status')
    .eq('professional_id', professionalId)
    .gte('start_time', `${date}T00:00:00`)
    .lt('start_time', `${date}T23:59:59`)
    .in('status', ['pendiente', 'confirmado', 'completado', 'no_asistio'])

  const appointments: AppointmentOccupation[] = (appointmentsData || []).map(apt => ({
    startTime: new Date(apt.start_time),
    endTime: new Date(apt.end_time),
  }))

  // ============================================
  // STEP 3: Generate potential slot grid
  // ============================================
  const potentialSlots = generatePotentialSlots(
    workdayStart,
    workdayEnd,
    blockDuration,
    AVAILABILITY_CONFIG.SLOT_INTERVAL_MINUTES
  )

  if (potentialSlots.length === 0) {
    // Service is too long for the workday
    return []
  }

  // ============================================
  // STEP 4: Filter collisions
  // ============================================
  const availableSlots = filterAvailableSlots(
    potentialSlots,
    appointments,
    exceptions,
    date
  )

  // ============================================
  // STEP 5: Format response
  // ============================================
  return availableSlots.map(slot => formatTimeSlot(slot.start))
}
