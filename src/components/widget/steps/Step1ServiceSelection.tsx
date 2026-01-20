/**
 * Step 1: Service Selection
 * Allows user to choose a service
 */

'use client'

import { useEffect, useState } from 'react'
import { useBooking } from '../BookingProvider'
import { useShop } from '@/components/providers/ShopProvider'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

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
    return <div className="text-center py-8">Cargando servicios...</div>
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay servicios disponibles
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {services.map((service) => (
        <div
          key={service.id}
          className={cn(
            'cursor-pointer rounded-lg border-2 p-4 transition-all hover:border-primary',
            state.selectedService?.id === service.id
              ? 'border-primary bg-primary/5'
              : 'border-border'
          )}
          onClick={() => {
            dispatch({ type: 'SELECT_SERVICE', service: service as any })
          }}
        >
          <h3 className="font-semibold text-lg">{service.name}</h3>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {service.duration_minutes} minutos
            </span>
            {service.price && (
              <span className="font-semibold text-primary">
                ${service.price}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
