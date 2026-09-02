'use client'

import { format, isSameDay, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { parseISO } from 'date-fns'
import { getProfessionalColor } from '@/lib/professionalColors'
import type { Appointment } from '../lib/types'

type Props = {
  weekDays: Date[]
  appointments: Appointment[]
  selectedDate: Date
  onSelectDay: (day: Date) => void
}

export function WeekView({ weekDays, appointments, selectedDate, onSelectDay }: Props) {
  return (
    <div className="glass-card-dark overflow-hidden">
      <div className="grid grid-cols-7 divide-x divide-white/5">
        {weekDays.map((day) => {
          const dayStr = format(day, 'yyyy-MM-dd')
          const dayAppointments = appointments
            .filter((a) => a.start_time.startsWith(dayStr) && a.status !== 'cancelado')
            .sort((a, b) => a.start_time.localeCompare(b.start_time))
          const selected = isSameDay(day, selectedDate)

          return (
            <button
              key={dayStr}
              onClick={() => onSelectDay(day)}
              className={`text-left p-4 min-h-[420px] transition-colors hover:bg-white/[0.03] ${
                selected ? 'bg-white/[0.05]' : ''
              }`}
            >
              <div className="mb-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                  {format(day, 'EEE', { locale: es })}
                </p>
                <p
                  className={`text-2xl font-bold font-heading ${
                    isToday(day) ? 'text-white' : selected ? 'text-white' : 'text-zinc-400'
                  }`}
                >
                  {format(day, 'd')}
                </p>
                <p className="text-xs text-zinc-500">{dayAppointments.length} turnos</p>
              </div>

              <div className="space-y-1.5">
                {dayAppointments.slice(0, 6).map((apt) => {
                  const color = getProfessionalColor(apt.professional_id)
                  return (
                    <div
                      key={apt.id}
                      className={`rounded-md border-l-2 px-2 py-1 ${color.border} ${color.bgSoft}`}
                    >
                      <p className="text-[11px] font-semibold text-zinc-300">
                        {format(parseISO(apt.start_time), 'HH:mm')}
                      </p>
                      <p className="text-xs text-white truncate">{apt.customer_name}</p>
                    </div>
                  )
                })}
                {dayAppointments.length > 6 && (
                  <p className="text-[11px] text-zinc-500 pl-1">
                    +{dayAppointments.length - 6} más
                  </p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
