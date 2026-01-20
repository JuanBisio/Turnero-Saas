/**
 * Availability Engine - Public API
 * Export all availability-related functions and types
 */

export { getAvailableSlots } from './getAvailableSlots'
export type {
  AvailabilityParams,
  AvailabilityResult,
  TimeSlot,
  ScheduleData,
  ExceptionData,
  AppointmentOccupation,
  ServiceData,
  ProfessionalData,
} from './types'
export { AVAILABILITY_CONFIG } from './types'
