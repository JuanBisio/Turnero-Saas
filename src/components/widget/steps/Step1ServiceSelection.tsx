/**
 * Step 1: Service Selection
 * "Obsidian Glass" Style
 */

'use client'

import { useEffect, useState } from 'react'
import { useBooking } from '../BookingProvider'
import { useShop } from '@/components/providers/ShopProvider'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Sparkles, Clock } from 'lucide-react'

type Service = {
  id: string
  name: string
  duration_minutes: number
  price: number | null
}

export function Step1ServiceSelection() {
  const { state, dispatch } = useBooking()
  const { shopId } = useShop()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchServices = async () => {
      if (!shopId) return
      
      setLoading(true)
      const { data, error } = await supabase
        .from('services')
        .select('id, name, duration_minutes, price')
        .eq('shop_id', shopId)
      
      if (!error && data) {
        setServices(data)
      }
      setLoading(false)
    }
    
    fetchServices()
  }, [shopId, supabase])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-zinc-500 gap-3">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"/>
        <p className="text-sm">Cargando servicios...</p>
      </div>
    )
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <p>No hay servicios disponibles</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-white mb-2">Selecciona un Servicio</h2>
        <p className="text-zinc-400 text-sm">Elige el servicio que deseas reservar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service) => (
          <motion.div
            key={service.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'cursor-pointer relative overflow-hidden rounded-2xl p-5 transition-all duration-300 group',
              state.selectedService?.id === service.id
                ? 'bg-white border-white shadow-xl scale-[1.02] z-10'
                : 'bg-white/[0.03] border border-white/5 hover:border-white/10 hover:bg-white/[0.05]'
            )}
            onClick={() => {
              dispatch({ type: 'SELECT_SERVICE', service: service as any })
              // Auto advance delay ensures animation completes
              setTimeout(() => dispatch({ type: 'NEXT_STEP' }), 300)
            }}
          >
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <h3 className={cn(
                  "font-bold text-lg mb-2 transition-colors",
                  state.selectedService?.id === service.id ? "text-black" : "text-zinc-200 group-hover:text-white"
                )}>
                  {service.name}
                </h3>
                
                <div className="flex items-center gap-4 text-sm">
                  <span className={cn(
                    "flex items-center gap-1.5 transition-colors",
                    state.selectedService?.id === service.id ? "text-zinc-600" : "text-zinc-500 group-hover:text-zinc-400"
                  )}>
                    <Clock className="w-3.5 h-3.5" />
                    {service.duration_minutes} min
                  </span>
                </div>
              </div>

              {service.price && (
                <span className={cn(
                  "px-3 py-1 rounded-full text-sm font-semibold border transition-all",
                  state.selectedService?.id === service.id
                    ? "bg-black/5 text-black border-black/10"
                    : "bg-white/5 text-zinc-400 border-white/5 group-hover:border-white/10 group-hover:text-white"
                )}>
                  ${service.price}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
