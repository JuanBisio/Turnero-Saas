/**
 * Step 2: Professional Selection
 */

'use client'

import { useEffect, useState } from 'react'
import { useBooking } from '../BookingProvider'
import { useShop } from '@/components/providers/ShopProvider'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type Professional = {
  id: string
  name: string
  buffer_time_minutes: number
  is_active: boolean
}

export function Step2ProfessionalSelection() {
  const { state, dispatch } = useBooking()
  const { shopId } = useShop()
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchProfessionals = async () => {
      if (!shopId) return
      
      setLoading(true)
      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_active', true)
      
      if (!error && data) {
        setProfessionals(data)
      }
      setLoading(false)
    }
    
    fetchProfessionals()
  }, [shopId, supabase])

  if (loading) {
    return <div className="text-center py-8">Cargando profesionales...</div>
  }

  if (professionals.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay profesionales disponibles
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {professionals.map((prof) => (
        <div
          key={prof.id}
          className={cn(
            'flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-primary',
            state.selectedProfessional?.id === prof.id
              ? 'border-primary bg-primary/5'
              : 'border-border'
          )}
          onClick={() => {
            dispatch({ type: 'SELECT_PROFESSIONAL', professional: prof as any })
          }}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground text-xl font-semibold">
            {prof.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="font-semibold text-lg">{prof.name}</h4>
            <p className="text-sm text-muted-foreground">Profesional</p>
          </div>
        </div>
      ))}
    </div>
  )
}
