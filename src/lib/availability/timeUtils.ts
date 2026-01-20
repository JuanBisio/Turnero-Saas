/**
 * Time utilities for the Availability Engine
 * Handles time parsing, formatting, and rounding operations
 */

import { parse, format, addMinutes, addDays, isAfter, isBefore, parseISO } from 'date-fns'
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz'
import { AVAILABILITY_CONFIG } from './types'

const { DEFAULT_TIMEZONE, SLOT_INTERVAL_MINUTES } = AVAILABILITY_CONFIG

/**
 * Rounds a time to the nearest interval (rounds UP)
 * @param time - The time to round
 * @param intervalMinutes - The interval in minutes (default: 5)
 * @returns Rounded time
 * 
 * @example
 * roundToNearestInterval(new Date('2026-01-20T09:03:00'), 5)
 * // Returns: 2026-01-20T09:05:00
 */
export function roundToNearestInterval(
  time: Date,
  intervalMinutes: number = SLOT_INTERVAL_MINUTES
): Date {
  const minutes = time.getMinutes()
  const roundedMinutes = Math.ceil(minutes / intervalMinutes) * intervalMinutes
  const newTime = new Date(time)
  newTime.setMinutes(roundedMinutes, 0, 0) // Set seconds and ms to 0
  return newTime
}

/**
 * Combines a date (YYYY-MM-DD) with a time (HH:mm:ss) into a Date object
 * @param dateStr - Date in ISO format (YYYY-MM-DD)
 * @param timeStr - Time in HH:mm:ss format
 * @param timezone - Timezone (default: Argentina/Buenos Aires)
 * @returns Combined Date object
 * 
 * @example
 * combineDateAndTime('2026-01-20', '09:00:00')
 * // Returns: Date object for 2026-01-20 09:00:00 in Argentina timezone
 */
export function combineDateAndTime(
  dateStr: string,
  timeStr: string,
  timezone: string = DEFAULT_TIMEZONE
): Date {
  // Parse the date
  const datePart = parseISO(dateStr)
  
  // Parse the time (HH:mm:ss)
  const [hours, minutes, seconds = 0] = timeStr.split(':').map(Number)
  
  // Create a date in the local timezone
  const combined = new Date(datePart)
  combined.setHours(hours, minutes, seconds, 0)
  
  // Convert to UTC considering the timezone
  return fromZonedTime(combined, timezone)
}

/**
 * Formats a Date object to HH:mm format
 * @param date - The date to format
 * @param timezone - Timezone (default: Argentina/Buenos Aires)
 * @returns Time string in HH:mm format
 * 
 * @example
 * formatTimeSlot(new Date('2026-01-20T09:00:00'))
 * // Returns: "09:00"
 */
export function formatTimeSlot(
  date: Date,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const zonedDate = toZonedTime(date, timezone)
  return format(zonedDate, 'HH:mm')
}

/**
 * Gets the day of week (0-6) from an ISO date string
 * @param dateStr - Date in ISO format (YYYY-MM-DD)
 * @returns Day of week (0 = Sunday, 6 = Saturday)
 * 
 * @example
 * getDayOfWeek('2026-01-20') // Tuesday
 * // Returns: 2
 */
export function getDayOfWeek(dateStr: string): number {
  const date = parseISO(dateStr)
  return date.getDay()
}

/**
 * Validates if a date is within the booking window (max 30 days in the future)
 * @param dateStr - Date in ISO format (YYYY-MM-DD)
 * @param maxDays - Maximum days in the future (default: 30)
 * @returns True if valid, false otherwise
 */
export function isWithinBookingWindow(
  dateStr: string,
  maxDays: number = AVAILABILITY_CONFIG.MAX_BOOKING_DAYS
): boolean {
  const requestedDate = parseISO(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Start of today
  
  const maxDate = addDays(today, maxDays)
  maxDate.setHours(23, 59, 59, 999) // End of max day
  
  return !isAfter(requestedDate, maxDate) && !isBefore(requestedDate, today)
}

/**
 * Checks if a slot meets the minimum lead time requirement
 * @param slotStart - Start time of the slot
 * @param dateStr - Date string to check if it's today
 * @param minLeadTimeMinutes - Minimum lead time in minutes (default: 60)
 * @returns True if slot is valid, false otherwise
 */
export function meetsMinimumLeadTime(
  slotStart: Date,
  dateStr: string,
  minLeadTimeMinutes: number = AVAILABILITY_CONFIG.MIN_LEAD_TIME_MINUTES
): boolean {
  // Only apply lead time check if the date is today
  const today = format(new Date(), 'yyyy-MM-dd')
  if (dateStr !== today) {
    return true
  }
  
  const now = new Date()
  const minStartTime = addMinutes(now, minLeadTimeMinutes)
  
  return !isBefore(slotStart, minStartTime)
}

/**
 * Checks if two time ranges overlap
 * @param start1 - Start of first range
 * @param end1 - End of first range
 * @param start2 - Start of second range
 * @param end2 - End of second range
 * @returns True if ranges overlap, false otherwise
 * 
 * @example
 * // Slot: 09:00 - 09:40
 * // Appointment: 09:30 - 10:00
 * hasOverlap(slot.start, slot.end, apt.start, apt.end)
 * // Returns: true (they overlap)
 */
export function hasOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  // Two ranges overlap if: start1 < end2 AND end1 > start2
  return isBefore(start1, end2) && isAfter(end1, start2)
}
