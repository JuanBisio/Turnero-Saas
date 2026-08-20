/**
 * Availability Engine - Public API
 * Export all availability-related functions and types
 */

export { getAvailableSlots } from './getAvailableSlots'
export { getAvailabilityStatusForRange } from './getAvailabilityStatusForRange'
export type {
  AvailabilityParams,
  AvailabilityResult,
  AvailabilityRangeParams,
  DayAvailability,
  DayAvailabilityStatus,
  TimeSlot,
  ScheduleData,
  ExceptionData,
  AppointmentOccupation,
  ServiceData,
  ProfessionalData,
} from './types'
export { AVAILABILITY_CONFIG } from './types'
