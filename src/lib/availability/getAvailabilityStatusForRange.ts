/**
 * Availability Status for a Date Range
 * Computes, per day, WHY a day has no bookable slots (no schedule / blocked / full)
 * so the widget calendar can paint each day accordingly.
 *
 * Mirrors the logic in getAvailableSlots.ts, but batches schedules/exceptions/
 * appointments for the whole range instead of issuing 3 queries per day.
 */

import { createClient } from '../supabase/server'
import {
  AvailabilityRangeParams,
  DayAvailability,
  ExceptionData,
  AppointmentOccupation,
  ServiceData,
  ProfessionalData,
  TimeSlot,
  AVAILABILITY_CONFIG,
} from './types'
import { getDayOfWeek, combineDateAndTime } from './timeUtils'
import { generatePotentialSlots, calculateBlockDuration } from './slotGeneration'
import { filterAvailableSlots } from './collisionDetection'

/**
 * Calculates availability status for each day in [startDate, endDate] (inclusive)
 *
 * @param params - Range parameters
 * @returns Array of { date, status } for every day in the range
 */
export async function getAvailabilityStatusForRange(
  params: AvailabilityRangeParams
): Promise<DayAvailability[]> {
  const { startDate, endDate, serviceId, professionalId, shopId, supabaseClient } = params

  const supabase: any = supabaseClient || await createClient()

  const dates = enumerateDates(startDate, endDate)

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
    return dates.map(date => ({ date, status: 'no-schedule' as const }))
  }

  const blockDuration = calculateBlockDuration(
    service.durationMinutes,
    professional.bufferTimeMinutes
  )

  // ============================================
  // Batch fetch: schedules (all days), exceptions and appointments (for the range)
  // ============================================
  const [schedulesResult, exceptionsResult, appointmentsResult] = await Promise.all([
    supabase
      .from('schedules')
      .select('day_of_week, start_time, end_time')
      .eq('professional_id', professionalId),

    supabase
      .from('exceptions')
      .select('specific_date, start_time, end_time, is_blocked')
      .eq('professional_id', professionalId)
      .gte('specific_date', startDate)
      .lte('specific_date', endDate),

    supabase
      .from('appointments')
      .select('start_time, end_time, status')
      .eq('professional_id', professionalId)
      .gte('start_time', `${startDate}T00:00:00`)
      .lt('start_time', `${endDate}T23:59:59`)
      .in('status', ['pendiente', 'confirmado', 'completado', 'no_asistio']),
  ])

  const schedulesByDay = new Map<number, Array<{ start_time: string; end_time: string }>>()
  for (const s of schedulesResult.data || []) {
    const list = schedulesByDay.get(s.day_of_week) || []
    list.push(s)
    schedulesByDay.set(s.day_of_week, list)
  }

  const exceptionsByDate = new Map<string, ExceptionData[]>()
  for (const exc of exceptionsResult.data || []) {
    const list = exceptionsByDate.get(exc.specific_date) || []
    list.push({
      specificDate: exc.specific_date,
      startTime: exc.start_time,
      endTime: exc.end_time,
      isBlocked: exc.is_blocked,
    })
    exceptionsByDate.set(exc.specific_date, list)
  }

  const appointmentsByDate = new Map<string, AppointmentOccupation[]>()
  for (const apt of appointmentsResult.data || []) {
    const dateKey = String(apt.start_time).slice(0, 10)
    const list = appointmentsByDate.get(dateKey) || []
    list.push({ startTime: new Date(apt.start_time), endTime: new Date(apt.end_time) })
    appointmentsByDate.set(dateKey, list)
  }

  // ============================================
  // Resolve status per day
  // ============================================
  return dates.map(date => {
    const dayOfWeek = getDayOfWeek(date)
    const schedulesForDay = schedulesByDay.get(dayOfWeek) || []
    const exceptionsForDate = exceptionsByDate.get(date) || []

    if (schedulesForDay.length === 0) {
      // No schedule configured for this day of week -> professional doesn't work that day
      return { date, status: 'no-schedule' as const }
    }

    const isFullyBlocked = exceptionsForDate.some(
      exc => exc.isBlocked && exc.startTime === null && exc.endTime === null
    )
    if (isFullyBlocked) {
      return { date, status: 'blocked' as const }
    }

    const workdayException = exceptionsForDate.find(
      exc => exc.startTime !== null && exc.endTime !== null && !exc.isBlocked
    )

    const timeRanges: TimeSlot[] = workdayException
      ? [{
          start: combineDateAndTime(date, workdayException.startTime!),
          end: combineDateAndTime(date, workdayException.endTime!),
        }]
      : schedulesForDay.map(schedule => ({
          start: combineDateAndTime(date, schedule.start_time),
          end: combineDateAndTime(date, schedule.end_time),
        }))

    let potentialSlots: TimeSlot[] = []
    for (const range of timeRanges) {
      potentialSlots = potentialSlots.concat(
        generatePotentialSlots(
          range.start,
          range.end,
          blockDuration,
          AVAILABILITY_CONFIG.SLOT_INTERVAL_MINUTES
        )
      )
    }

    if (potentialSlots.length === 0) {
      // Service too long for the workday -> effectively no room
      return { date, status: 'full' as const }
    }

    const appointments = appointmentsByDate.get(date) || []
    const availableSlots = filterAvailableSlots(
      potentialSlots,
      appointments,
      exceptionsForDate,
      date
    )

    return {
      date,
      status: availableSlots.length > 0 ? ('available' as const) : ('full' as const),
    }
  })
}

/**
 * Enumerates ISO date strings (YYYY-MM-DD) between startDate and endDate, inclusive
 */
function enumerateDates(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  let current = startDate

  while (current <= endDate) {
    dates.push(current)
    const next = new Date(`${current}T00:00:00Z`)
    next.setUTCDate(next.getUTCDate() + 1)
    current = next.toISOString().slice(0, 10)
  }

  return dates
}
