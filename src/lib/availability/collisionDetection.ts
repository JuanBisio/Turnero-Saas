/**
 * Collision Detection Logic
 * Filters slots based on existing appointments and exceptions
 */

import { TimeSlot, AppointmentOccupation, ExceptionData } from './types'
import { hasOverlap, meetsMinimumLeadTime } from './timeUtils'
import { combineDateAndTime } from './timeUtils'

/**
 * Filters out slots that collide with existing appointments
 * @param slots - Array of potential slots
 * @param appointments - Array of existing appointment occupations
 * @returns Filtered slots that don't collide with appointments
 */
export function filterAppointmentCollisions(
  slots: TimeSlot[],
  appointments: AppointmentOccupation[]
): TimeSlot[] {
  return slots.filter(slot => {
    // Check if this slot overlaps with any appointment
    const hasCollision = appointments.some(apt =>
      hasOverlap(slot.start, slot.end, apt.startTime, apt.endTime)
    )
    
    return !hasCollision
  })
}

/**
 * Filters out slots that collide with time-based exceptions (partial day blocks)
 * @param slots - Array of potential slots
 * @param exceptions - Array of exception data for the date
 * @param dateStr - The date being checked (ISO format)
 * @returns Filtered slots that don't collide with exceptions
 */
export function filterExceptionCollisions(
  slots: TimeSlot[],
  exceptions: ExceptionData[],
  dateStr: string
): TimeSlot[] {
  // Filter for exceptions that have specific time ranges (not full-day blocks)
  const timeBasedExceptions = exceptions.filter(
    exc => exc.startTime !== null && exc.endTime !== null
  )
  
  if (timeBasedExceptions.length === 0) {
    return slots
  }
  
  return slots.filter(slot => {
    // Check if this slot overlaps with any time-based exception
    const hasCollision = timeBasedExceptions.some(exc => {
      const excStart = combineDateAndTime(dateStr, exc.startTime!)
      const excEnd = combineDateAndTime(dateStr, exc.endTime!)
      
      return hasOverlap(slot.start, slot.end, excStart, excEnd)
    })
    
    return !hasCollision
  })
}

/**
 * Filters out slots that don't meet the minimum lead time requirement
 * @param slots - Array of potential slots
 * @param dateStr - The date being checked (ISO format)
 * @param minLeadTimeMinutes - Minimum lead time in minutes
 * @returns Filtered slots that meet the lead time requirement
 */
export function filterMinimumLeadTime(
  slots: TimeSlot[],
  dateStr: string,
  minLeadTimeMinutes: number = 60
): TimeSlot[] {
  return slots.filter(slot =>
    meetsMinimumLeadTime(slot.start, dateStr, minLeadTimeMinutes)
  )
}

/**
 * Master filter function that applies all collision checks
 * @param slots - Array of potential slots
 * @param appointments - Existing appointments
 * @param exceptions - Time-based exceptions
 * @param dateStr - Date being checked
 * @returns Fully filtered available slots
 */
export function filterAvailableSlots(
  slots: TimeSlot[],
  appointments: AppointmentOccupation[],
  exceptions: ExceptionData[],
  dateStr: string
): TimeSlot[] {
  let availableSlots = slots
  
  // Step 1: Filter appointment collisions
  availableSlots = filterAppointmentCollisions(availableSlots, appointments)
  
  // Step 2: Filter exception collisions
  availableSlots = filterExceptionCollisions(availableSlots, exceptions, dateStr)
  
  // Step 3: Filter by minimum lead time
  availableSlots = filterMinimumLeadTime(availableSlots, dateStr)
  
  return availableSlots
}
