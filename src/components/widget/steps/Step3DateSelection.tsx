/**
 * Step 3: Date Selection
 * "Obsidian Glass" Style
 */

'use client'

import { useEffect, useState } from 'react'
import { useBooking } from '../BookingProvider'
import { useShop } from '@/components/providers/ShopProvider'
import { format, addDays, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type DayStatus = 'available' | 'no-schedule' | 'blocked' | 'full'

const UNAVAILABLE_REASON: Record<Exclude<DayStatus, 'available'>, string> = {
  'no-schedule': 'No atiende este día',
  'blocked': 'Día no disponible',
  'full': 'Sin turnos libres',
}

export function Step3DateSelection() {
  const { state, dispatch } = useBooking()
  const { shopId } = useShop()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    state.selectedDate ? new Date(state.selectedDate) : undefined
  )
  const [statusByDate, setStatusByDate] = useState<Record<string, DayStatus>>({})

  // Generate next 14 days
  const today = new Date()
  const dates = Array.from({ length: 14 }, (_, i) => addDays(today, i))

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!state.selectedService || !state.selectedProfessional || !shopId) {
        return
      }

      try {
        const params = new URLSearchParams({
          startDate: format(dates[0], 'yyyy-MM-dd'),
          endDate: format(dates[dates.length - 1], 'yyyy-MM-dd'),
          serviceId: state.selectedService.id,
          professionalId: state.selectedProfessional.id,
          shopId,
        })

        const response = await fetch(`/api/public/availability/range?${params}`)
        const data = await response.json()

        if (response.ok && Array.isArray(data.days)) {
          const map: Record<string, DayStatus> = {}
          for (const day of data.days) {
            map[day.date] = day.status
          }
          setStatusByDate(map)
        }
      } catch (error) {
        console.error('Error fetching date availability:', error)
      }
    }

    fetchAvailability()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedService, state.selectedProfessional, shopId])

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date)
    dispatch({
      type: 'SELECT_DATE',
      date: format(date, 'yyyy-MM-dd'),
    })
    // Auto advance
    setTimeout(() => dispatch({ type: 'NEXT_STEP' }), 300)
  }

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-white mb-2">Selecciona una Fecha</h2>
        <p className="text-zinc-400 text-sm">¿Cuándo te gustaría venir? (Próximos 14 días)</p>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4"
      >
        {dates.map((date) => {
          const dateStr = format(date, 'yyyy-MM-dd')
          const isSelected = state.selectedDate === dateStr
          const isToday = isSameDay(date, today)
          const status = statusByDate[dateStr]
          const isUnavailable = !!status && status !== 'available'

          return (
            <motion.button
              key={dateStr}
              variants={item}
              whileHover={isUnavailable ? undefined : { scale: 1.05 }}
              whileTap={isUnavailable ? undefined : { scale: 0.95 }}
              onClick={() => !isUnavailable && handleSelectDate(date)}
              disabled={isUnavailable}
              title={isUnavailable ? UNAVAILABLE_REASON[status as Exclude<DayStatus, 'available'>] : undefined}
              className={cn(
                "relative overflow-hidden p-4 rounded-xl border transition-all duration-300 flex flex-col items-center justify-center gap-1 group",
                isUnavailable
                  ? 'bg-white/[0.02] border-white/5 opacity-40 cursor-not-allowed'
                  : isSelected
                  ? 'bg-white border-white shadow-xl scale-105 z-10'
                  : 'bg-white/[0.03] border-white/5 hover:border-white/20 hover:bg-white/[0.05]'
              )}
            >
              <span className={cn(
                "text-xs uppercase font-medium tracking-widest transition-colors z-10",
                isSelected ? "text-black/60" : "text-zinc-500 group-hover:text-zinc-300"
              )}>
                {isToday ? 'Hoy' : format(date, 'EEE', { locale: es })}
              </span>

              <span className={cn(
                "text-2xl font-bold transition-colors z-10 font-heading",
                isSelected ? "text-black" : "text-zinc-300 group-hover:text-white"
              )}>
                {format(date, 'd')}
              </span>

              <span className={cn(
                "text-xs transition-colors z-10",
                isSelected ? "text-black/60" : "text-zinc-600"
              )}>
                {format(date, 'MMM', { locale: es })}
              </span>
            </motion.button>
          )
        })}
      </motion.div>
    </div>
  )
}
