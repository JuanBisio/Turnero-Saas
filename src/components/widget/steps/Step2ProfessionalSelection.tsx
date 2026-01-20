/**
 * Step 2: Professional Selection
 * "Obsidian Glass" Style
 */

'use client'

import { useEffect, useState } from 'react'
import { useBooking } from '../BookingProvider'
import { useShop } from '@/components/providers/ShopProvider'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { User } from 'lucide-react'

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
    return (
      <div className="flex flex-col items-center justify-center py-12 text-zinc-500 gap-3">
        <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"/>
        <p className="text-sm">Cargando profesionales...</p>
      </div>
    )
  }

  if (professionals.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <p>No hay profesionales disponibles</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-white mb-2">Elige un Profesional</h2>
        <p className="text-zinc-400 text-sm">¿Con quién te gustaría atenderte?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {professionals.map((prof) => (
          <motion.div
            key={prof.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'flex items-center gap-5 p-5 rounded-2xl cursor-pointer transition-all duration-300 group',
              state.selectedProfessional?.id === prof.id
                ? 'bg-white border-white shadow-xl z-10'
                : 'bg-white/[0.03] border border-white/5 hover:border-white/10 hover:bg-white/[0.05]'
            )}
            onClick={() => {
              dispatch({ type: 'SELECT_PROFESSIONAL', professional: prof as any })
              // Auto advance
              setTimeout(() => dispatch({ type: 'NEXT_STEP' }), 300)
            }}
          >
            <div className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold transition-all",
              state.selectedProfessional?.id === prof.id
                ? "bg-black text-white shadow-lg"
                : "bg-white/5 text-zinc-400 group-hover:text-white group-hover:bg-white/10"
            )}>
              {prof.name.charAt(0).toUpperCase()}
            </div>
            
            <div>
              <h4 className={cn(
                "font-bold text-lg transition-colors",
                state.selectedProfessional?.id === prof.id ? "text-black" : "text-zinc-200 group-hover:text-white"
              )}>
                {prof.name}
              </h4>
              <p className={cn(
                "text-sm transition-colors",
                state.selectedProfessional?.id === prof.id ? "text-zinc-600" : "text-zinc-500 group-hover:text-zinc-400"
              )}>
                Profesional
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
