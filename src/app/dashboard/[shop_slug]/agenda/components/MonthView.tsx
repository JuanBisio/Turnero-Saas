'use client'

import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
} from 'date-fns'
import type { Appointment } from '../lib/types'

type Props = {
  month: Date
  selectedDate: Date
  appointments: Appointment[]
  onSelectDay: (day: Date) => void
}

export function MonthView({ month, selectedDate, appointments, onSelectDay }: Props) {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const countByDay = new Map<string, number>()
  for (const apt of appointments) {
    if (apt.status === 'cancelado') continue
    const dayStr = apt.start_time.slice(0, 10)
    countByDay.set(dayStr, (countByDay.get(dayStr) || 0) + 1)
  }

  return (
    <div className="glass-card-dark p-6">
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <div key={i} className="text-center text-xs font-bold text-zinc-200 uppercase tracking-widest p-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDate)
          const isCurrentMonth = isSameMonth(day, month)
          const count = countByDay.get(format(day, 'yyyy-MM-dd')) || 0
          const hasAppointments = count > 0

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDay(day)}
              className={`relative aspect-square rounded-xl p-2 flex flex-col items-center justify-center gap-1 transition-all ${
                isSelected
                  ? 'bg-white text-black font-bold shadow-lg shadow-white/10'
                  : hasAppointments
                  ? 'bg-pastel-lavender/15 border border-pastel-lavender/40 text-white hover:bg-pastel-lavender/25'
                  : isCurrentMonth
                  ? 'text-zinc-300 hover:bg-white/10 hover:text-white'
                  : 'text-zinc-700 opacity-30'
              }`}
            >
              <span className="text-sm">{format(day, 'd')}</span>
              {hasAppointments && (
                <span
                  className={`text-[11px] font-bold min-w-[18px] px-1.5 py-px rounded-full ${
                    isSelected
                      ? 'bg-black/10 text-black'
                      : 'bg-pastel-lavender text-black'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
