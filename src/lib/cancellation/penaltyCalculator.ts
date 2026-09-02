/**
 * Penalty calculator for late cancellations and no-shows
 * Ref: Requerimientos Técnicos — Flujo de Cancelación y Multa v1.0
 */

/**
 * Determines whether a cancellation falls inside the penalized window,
 * meaning the shop owner CAN choose to charge a penalty (it's never
 * automatic — see section 3 of the requirements doc). Cancellations made
 * at or beyond `freeCancellationWindowHours` in advance are always free.
 *
 * A no-show naturally falls inside the window too: by the time it's
 * marked, the appointment's start time is already in the past, so
 * `hoursUntilAppointment` is negative and this returns true without any
 * special-casing.
 *
 * @example
 * // Turno a las 18:00, cancela a las 10:00 del mismo día, ventana de 24hs
 * isLateCancellation(new Date('2026-08-28T18:00:00'), 24, new Date('2026-08-28T10:00:00'))
 * // Returns: true (solo 8hs de anticipación, dentro de ventana penalizada)
 */
export function isLateCancellation(
  appointmentStartTime: Date | string,
  freeCancellationWindowHours: number,
  cancelledAt: Date = new Date()
): boolean {
  const startTime = typeof appointmentStartTime === 'string'
    ? new Date(appointmentStartTime)
    : appointmentStartTime

  const hoursUntilAppointment = (startTime.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60)

  return hoursUntilAppointment < freeCancellationWindowHours
}

/**
 * Calculates the penalty amount for a late cancellation or no-show.
 * Rounded to the nearest integer to match `services.price` (INTEGER).
 *
 * @example
 * calculatePenaltyAmount(10000, 50) // Returns: 5000
 */
export function calculatePenaltyAmount(
  servicePrice: number,
  penaltyPercentage: number
): number {
  return Math.round(servicePrice * (penaltyPercentage / 100))
}
