/**
 * Slot Generation Logic
 * Generates potential time slots based on workday schedule and service duration
 */

import { addMinutes } from 'date-fns'
import { TimeSlot } from './types'
import { roundToNearestInterval } from './timeUtils'

/**
 * Generates all potential slots for a given time range
 * @param startTime - Start of the workday
 * @param endTime - End of the workday
 * @param blockDurationMinutes - Total block duration (service + buffer)
 * @param intervalMinutes - Rounding interval for slots (default: 5)
 * @returns Array of potential time slots
 * 
 * @example
 * // Workday: 09:00 - 18:00, Block: 40 minutes
 * generatePotentialSlots(start, end, 40, 5)
 * // Returns: [
 * //   { start: 09:00, end: 09:40 },
 * //   { start: 09:40, end: 10:20 },
 * //   ...
 * // ]
 */
export function generatePotentialSlots(
  startTime: Date,
  endTime: Date,
  blockDurationMinutes: number,
  intervalMinutes: number = 5
): TimeSlot[] {
  const slots: TimeSlot[] = []
  
  // Round the start time to the nearest interval (rounds up)
  let currentSlotStart = roundToNearestInterval(startTime, intervalMinutes)
  
  // Generate slots until we run out of space
  while (true) {
    const slotEnd = addMinutes(currentSlotStart, blockDurationMinutes)
    
    // Check if this slot fits within the workday
    if (slotEnd > endTime) {
      break
    }
    
    slots.push({
      start: currentSlotStart,
      end: slotEnd,
    })
    
    // Move to next slot (increments by block duration)
    currentSlotStart = addMinutes(currentSlotStart, blockDurationMinutes)
  }
  
  return slots
}

/**
 * Calculates the total block duration for a service
 * @param serviceDurationMinutes - Duration of the service
 * @param bufferTimeMinutes - Professional's buffer time
 * @returns Total block duration in minutes
 * 
 * @example
 * calculateBlockDuration(30, 10) // Returns: 40
 */
export function calculateBlockDuration(
  serviceDurationMinutes: number,
  bufferTimeMinutes: number
): number {
  return serviceDurationMinutes + bufferTimeMinutes
}
