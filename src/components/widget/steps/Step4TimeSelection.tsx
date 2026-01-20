/**
 * Step 4: Time Selection
 * "Obsidian Glass" Style
 */

'use client'

import { useEffect, useState } from 'react'
import { useBooking } from '../BookingProvider'
import { useShop } from '@/components/providers/ShopProvider'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Clock } from 'lucide-react'

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
    return (
      <div className="flex flex-col items-center justify-center py-12 text-zinc-500 gap-3">
        <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"/>
        <p className="text-sm">Buscando horarios disponibles...</p>
      </div>
    )
  }

  if (availableSlots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-zinc-500 bg-white/[0.02] rounded-2xl border border-white/5">
        <Clock className="w-8 h-8 mb-3 opacity-20" />
        <p className="font-medium">No hay horarios disponibles</p>
        <p className="text-sm mt-1">Por favor selecciona otra fecha</p>
      </div>
    )
  }

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.03
      }
    }
  }

  const item = {
    hidden: { opacity: 0, scale: 0.9 },
    show: { opacity: 1, scale: 1 }
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-white mb-2">Elige un Horario</h2>
        <p className="text-zinc-400 text-sm">Horarios disponibles para el {state.selectedDate}</p>
      </div>
      
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3"
      >
        {availableSlots.map((time) => (
          <motion.button
            key={time}
            variants={item}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              dispatch({ type: 'SELECT_TIME', time })
              // Auto advance
              setTimeout(() => dispatch({ type: 'NEXT_STEP' }), 200)
            }}
            className={cn(
              "p-3 rounded-xl border font-semibold text-sm transition-all duration-300 relative overflow-hidden",
              state.selectedTime === time
                ? 'bg-white border-white text-black shadow-lg scale-105 z-10'
                : 'bg-white/[0.03] border-white/5 text-zinc-300 hover:text-white hover:border-white/20 hover:bg-white/[0.05]'
            )}
          >
            <span className="relative z-10">{time}</span>
          </motion.button>
        ))}
      </motion.div>
    </div>
  )
}
