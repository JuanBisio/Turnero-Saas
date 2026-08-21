import { parseISO } from 'date-fns'

/**
 * Parses either a full ISO datetime string or a plain "HH:mm[:ss]" string
 * into minutes since midnight. Exceptions rows have historically been
 * stored in both formats, so both must be supported.
 */
export function parseTimeToMinutes(value: string): number {
  if (value.length > 8) {
    const date = parseISO(value)
    return date.getHours() * 60 + date.getMinutes()
  }
  const [h, m] = value.split(':').map(Number)
  return h * 60 + m
}

export function isoToMinutes(value: string): number {
  const date = parseISO(value)
  return date.getHours() * 60 + date.getMinutes()
}

export function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
