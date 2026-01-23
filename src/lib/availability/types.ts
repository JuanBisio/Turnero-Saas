/**
 * Type definitions for the Availability Engine
 * Phase 2 - Turnero SaaS
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../supabase/database.types'

/**
 * A time slot with start and end times
 */
export type TimeSlot = {
  start: Date
  end: Date
}

/**
 * Parameters for calculating available slots
 */
export type AvailabilityParams = {
  /** Date in ISO format (YYYY-MM-DD) */
  date: string
  /** UUID of the service */
  serviceId: string
  /** UUID of the professional */
  professionalId: string
  /** UUID of the shop (for RLS) */
  shopId: string
  /** Optional Supabase client (for public access without authentication) */
  supabaseClient?: SupabaseClient<Database>
}

/**
 * Schedule data from the database
 */
export type ScheduleData = {
  /** Day of week (0-6, where 0 = Sunday) */
  dayOfWeek: number
  /** Start time in HH:mm:ss format */
  startTime: string
  /** End time in HH:mm:ss format */
  endTime: string
}

/**
 * Exception data from the database (manual blocks or custom hours)
 */
export type ExceptionData = {
  /** Specific date for the exception */
  specificDate: string
  /** Optional start time (if null with end null, means full day blocked) */
  startTime: string | null
  /** Optional end time (if null with start null, means full day blocked) */
  endTime: string | null
  /** Whether this is a blocking exception */
  isBlocked: boolean
}

/**
 * Appointment occupation data
 */
export type AppointmentOccupation = {
  /** Start time of the appointment */
  startTime: Date
  /** End time of the appointment */
  endTime: Date
}

/**
 * Service data needed for slot calculation
 */
export type ServiceData = {
  /** Service ID */
  id: string
  /** Duration in minutes */
  durationMinutes: number
}

/**
 * Professional data needed for slot calculation
 */
export type ProfessionalData = {
  /** Professional ID */
  id: string
  /** Buffer time in minutes (added after each service) */
  bufferTimeMinutes: number
  /** Whether the professional is active */
  isActive: boolean
}

/**
 * Result type for getAvailableSlots
 * Array of time strings in HH:mm format
 */
export type AvailabilityResult = string[]

/**
 * Configuration constants for the availability engine
 */
export const AVAILABILITY_CONFIG = {
  /** Slot rounding interval in minutes */
  SLOT_INTERVAL_MINUTES: 5,
  /** Maximum days in the future that can be booked */
  MAX_BOOKING_DAYS: 30,
  /** Minimum lead time in minutes before a slot can be booked */
  MIN_LEAD_TIME_MINUTES: 60,
  /** Default timezone for Argentina */
  DEFAULT_TIMEZONE: 'America/Argentina/Buenos_Aires',
} as const
