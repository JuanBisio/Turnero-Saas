/**
 * Step 4: Time Selection
 */

'use client'

import { useEffect, useState } from 'react'
import { useBooking } from '../BookingProvider'
import { useShop } from '@/components/providers/ShopProvider'

export function Step4TimeSelection() {
  const { state, dispatch } = useBooking()
  const { shopId } = useShop()
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchSlots = async () => {
      if (
        !state.selectedDate ||
        !state.selectedService ||
        !state.selectedProfessional ||
        !shopId
      ) {
        return
      }

      setLoading(true)
      try {
        // Call public API route
        const params = new URLSearchParams({
          date: state.selectedDate,
          serviceId: state.selectedService.id,
          professionalId: state.selectedProfessional.id,
          shopId: shopId,
        })
        
        const response = await fetch(`/api/public/availability?${params}`)
        const data = await response.json()
        
        if (response.ok) {
          setAvailableSlots(data.availableSlots || [])
        } else {
          console.error('Error fetching slots:', data.error)
          setAvailableSlots([])
        }
      } catch (error) {
        console.error('Error fetching slots:', error)
        setAvailableSlots([])
      } finally {
        setLoading(false)
      }
    }

    fetchSlots()
  }, [
    state.selectedDate,
    state.selectedService,
    state.selectedProfessional,
    shopId,
  ])

  if (loading) {
    return <div className="text-center py-8">Cargando horarios disponibles...</div>
  }

  if (availableSlots.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay horarios disponibles para esta fecha.
        <br />
        Por favor selecciona otra fecha.
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        Horarios disponibles para {state.selectedDate}
      </p>
      
      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
        {availableSlots.map((time) => (
          <button
            key={time}
            onClick={() => dispatch({ type: 'SELECT_TIME', time })}
            className={`p-3 rounded-lg border-2 font-semibold transition-all ${
              state.selectedTime === time
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border hover:border-primary'
            }`}
          >
            {time}
          </button>
        ))}
      </div>
    </div>
  )
}
