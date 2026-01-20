/**
 * Step 3: Date Selection
 */

'use client'

import { useState } from 'react'
import { useBooking } from '../BookingProvider'
import { format, addDays } from 'date-fns'

export function Step3DateSelection() {
  const { state, dispatch } = useBooking()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    state.selectedDate ? new Date(state.selectedDate) : undefined
  )

  // Simple date picker (placeholder for proper Calendar component)
  const today = new Date()
  const dates = Array.from({ length: 14 }, (_, i) => addDays(today, i))

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date)
    dispatch({
      type: 'SELECT_DATE',
      date: format(date, 'yyyy-MM-dd'),
    })
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        Selecciona una fecha para tu turno (próximos 14 días)
      </p>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {dates.map((date) => {
          const dateStr = format(date, 'yyyy-MM-dd')
          const isSelected = state.selectedDate === dateStr
          
          return (
            <button
              key={dateStr}
              onClick={() => handleSelectDate(date)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary'
              }`}
            >
              <div className="text-sm text-muted-foreground">
                {format(date, 'EEEE')}
              </div>
              <div className="text-lg font-semibold">
                {format(date, 'd MMM')}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
