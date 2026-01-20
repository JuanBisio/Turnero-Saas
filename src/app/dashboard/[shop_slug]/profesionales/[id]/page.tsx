/**
 * Create/Edit Professional Form
 */

'use client'

import { useState, useEffect } from 'react'
import { useShop } from '@/components/providers/ShopProvider'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Lock, Clock, CheckCircle, Plus } from 'lucide-react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const DAYS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
]

const TIME_OPTIONS = Array.from({ length: 96 }).map((_, i) => {
  const h = Math.floor(i / 4)
  const m = (i % 4) * 15
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
})

type Schedule = {
  day_of_week: number
  start_time: string
  end_time: string
}

export default function ProfessionalFormPage({
  params,
}: {
  params: Promise<{ shop_slug: string; id: string }>
}) {
  const [resolvedParams, setResolvedParams] = useState<{ shop_slug: string; id: string } | null>(null)
  const { shopId } = useShop()
  const [name, setName] = useState('')
  const [bufferTime, setBufferTime] = useState(10)
  const [isActive, setIsActive] = useState(true)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    params.then(setResolvedParams)
  }, [params])

  const isEdit = resolvedParams?.id !== 'nuevo'

  useEffect(() => {
    if (isEdit && resolvedParams?.id && shopId) {
      fetchProfessional()
    }
  }, [isEdit, resolvedParams?.id, shopId])

  async function fetchProfessional() {
    if (!resolvedParams?.id) return

    const { data: prof } = await supabase
      .from('professionals')
      .select('*')
      .eq('id', resolvedParams.id)
      .single()

    if (prof) {
      setName(prof.name)
      setBufferTime(prof.buffer_time_minutes)
      setIsActive(prof.is_active)
    }

    const { data: scheds } = await supabase
      .from('schedules')
      .select('*')
      .eq('professional_id', resolvedParams.id)

    if (scheds) {
      setSchedules(scheds)
    }
  }

  // Check if two time ranges overlap
  function doRangesOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean {
    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number)
      return h * 60 + m
    }
    
    const s1 = toMinutes(start1)
    const e1 = toMinutes(end1)
    const s2 = toMinutes(start2)
    const e2 = toMinutes(end2)
    
    return s1 < e2 && s2 < e1
  }

  function addSchedule(day: number) {
    setSchedules([
      ...schedules,
      { day_of_week: day, start_time: '09:00:00', end_time: '18:00:00' },
    ])
  }

  function removeSchedule(index: number) {
    setSchedules(schedules.filter((_, i) => i !== index))
  }

  function updateSchedule(index: number, field: keyof Schedule, value: string | number) {
    const updated = [...schedules]
    updated[index] = { ...updated[index], [field]: value }
    setSchedules(updated)
  }

  // Validate no overlaps before submit
  function validateSchedules(): string | null {
    const byDay = schedules.reduce((acc, schedule) => {
      if (!acc[schedule.day_of_week]) {
        acc[schedule.day_of_week] = []
      }
      acc[schedule.day_of_week].push(schedule)
      return acc
    }, {} as Record<number, Schedule[]>)

    for (const [day, daySchedules] of Object.entries(byDay)) {
      for (let i = 0; i < daySchedules.length; i++) {
        for (let j = i + 1; j < daySchedules.length; j++) {
          if (doRangesOverlap(
            daySchedules[i].start_time,
            daySchedules[i].end_time,
            daySchedules[j].start_time,
            daySchedules[j].end_time
          )) {
            const dayLabel = DAYS.find(d => d.value === parseInt(day))?.label
            return `Los horarios en ${dayLabel} se superponen. Por favor revisa las horas.`
          }
        }
      }
    }

    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!shopId || !resolvedParams) return

    const validationError = validateSchedules()
    if (validationError) {
      alert(validationError)
      return
    }

    setLoading(true)

    try {
      if (isEdit) {
        await supabase
          .from('professionals')
          .update({
            name,
            buffer_time_minutes: bufferTime,
            is_active: isActive,
          })
          .eq('id', resolvedParams.id)

        await supabase
          .from('schedules')
          .delete()
          .eq('professional_id', resolvedParams.id)

        if (schedules.length > 0) {
          await supabase.from('schedules').insert(
            schedules.map((s) => ({
              professional_id: resolvedParams.id,
              day_of_week: s.day_of_week,
              start_time: s.start_time,
              end_time: s.end_time,
            }))
          )
        }
      } else {
        const { data: newProf } = await supabase
          .from('professionals')
          .insert({
            shop_id: shopId,
            name,
            buffer_time_minutes: bufferTime,
            is_active: isActive,
          })
          .select()
          .single()

        if (newProf && schedules.length > 0) {
          await supabase.from('schedules').insert(
            schedules.map((s) => ({
              professional_id: newProf.id,
              day_of_week: s.day_of_week,
              start_time: s.start_time,
              end_time: s.end_time,
            }))
          )
        }
      }

      router.push(`/dashboard/${resolvedParams.shop_slug}/profesionales`)
    } catch (error) {
      console.error('Error saving professional:', error)
      alert('Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  if (!resolvedParams) {
    return <div className="text-white">Cargando...</div>
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-4xl font-heading font-bold mb-8 text-white tracking-tight text-center">
        {isEdit ? 'Editar' : 'Nuevo'} Profesional
      </h2>

      <div className="glass-card-dark p-8 rounded-3xl relative overflow-hidden">
        {/* Glow Effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-pastel-lavender/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Nombre *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-12 rounded-xl border border-white/10 bg-slate-950/50 px-4 text-white placeholder:text-slate-600 focus:border-pastel-lavender/50 focus:bg-white/5 focus:outline-none focus:ring-1 focus:ring-pastel-lavender/50 transition-all duration-300"
                required
              />
            </div>

            {/* Buffer Time */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Tiempo de buffer (min) *
              </label>
              <input
                type="number"
                value={bufferTime}
                onChange={(e) => setBufferTime(parseInt(e.target.value))}
                className="w-full h-12 rounded-xl border border-white/10 bg-slate-950/50 px-4 text-white placeholder:text-slate-600 focus:border-pastel-lavender/50 focus:bg-white/5 focus:outline-none focus:ring-1 focus:ring-pastel-lavender/50 transition-all duration-300"
                min="0"
                required
              />
              <p className="text-xs text-slate-500">
                Tiempo adicional entre turnos
              </p>
            </div>
          </div>

          {/* Active */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors cursor-pointer" onClick={() => setIsActive(!isActive)}>
            <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${isActive ? 'bg-indigo-500 border-indigo-500' : 'border-zinc-600 bg-transparent'}`}>
              {isActive && <CheckCircle className="w-4 h-4 text-white" />}
            </div>
            <label className="text-sm font-medium text-zinc-200 cursor-pointer select-none">
              Profesional Activo
            </label>
            <span className="text-xs text-zinc-500 ml-auto">
              {isActive ? 'Visible para reservas' : 'Oculto en el widget'}
            </span>
          </div>

          <div className="h-px bg-white/5 w-full" />

          {/* Schedules */}
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Horarios de Atención</h3>
            <p className="text-sm text-zinc-400 mb-6">
              Selecciona los días y define los rangos horarios.
            </p>
            
            {/* Day Selector Pills - Unified Neutral Style */}
            <div className="flex gap-2 mb-8 flex-wrap">
              {DAYS.map((day) => {
                const hasSchedules = schedules.some(s => s.day_of_week === day.value)
                return (
                  <motion.button
                    key={day.value}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (!hasSchedules) {
                        addSchedule(day.value)
                      }
                    }}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border",
                      hasSchedules
                        ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                        : "bg-transparent border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/20"
                    )}
                  >
                    {day.label}
                  </motion.button>
                )
              })}
            </div>
            
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {DAYS.filter(day => schedules.some(s => s.day_of_week === day.value)).map((day) => {
                  const daySchedules = schedules
                    .map((s, idx) => ({ ...s, originalIndex: idx }))
                    .filter((s) => s.day_of_week === day.value)
                  
                  return (
                    <motion.div
                      key={day.value}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ type: 'tween', ease: 'easeOut', duration: 0.3 }}
                      className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden"
                    >
                      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                        <h4 className="font-semibold text-white">
                          {day.label}
                        </h4>
                        <span className="text-xs text-zinc-500">{daySchedules.length} rangos</span>
                      </div>
                      
                      <div className="p-4 space-y-3">
                        <AnimatePresence mode="popLayout">
                          {daySchedules.map((schedule) => (
                            <motion.div
                              key={schedule.originalIndex}
                              layout
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                              className="flex items-center gap-3"
                            >
                              <div className="flex-1 flex items-center gap-3 bg-[#0A0A0A] border border-white/5 rounded-xl p-1 pr-4">
                                <Select
                                  value={schedule.start_time.substring(0, 5)}
                                  onValueChange={(val) =>
                                    updateSchedule(schedule.originalIndex, 'start_time', val + ':00')
                                  }
                                >
                                  <SelectTrigger className="w-[100px] bg-transparent border-none text-white focus:ring-0 h-10 hover:bg-white/5 transition-colors justify-center font-medium">
                                    <SelectValue placeholder="Inicio" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-zinc-950 border-white/10 text-white max-h-[200px]">
                                    {TIME_OPTIONS.map((time) => (
                                      <SelectItem 
                                        key={`start-${time}`} 
                                        value={time}
                                        className="focus:bg-white/10 focus:text-white"
                                      >
                                        {time}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                <span className="text-zinc-600 font-medium">-</span>

                                <Select
                                  value={schedule.end_time.substring(0, 5)}
                                  onValueChange={(val) =>
                                    updateSchedule(schedule.originalIndex, 'end_time', val + ':00')
                                  }
                                >
                                  <SelectTrigger className="w-[100px] bg-transparent border-none text-white focus:ring-0 h-10 hover:bg-white/5 transition-colors justify-center font-medium">
                                    <SelectValue placeholder="Fin" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-zinc-950 border-white/10 text-white max-h-[200px]">
                                    {TIME_OPTIONS.map((time) => (
                                      <SelectItem 
                                        key={`end-${time}`} 
                                        value={time}
                                        className="focus:bg-white/10 focus:text-white"
                                      >
                                        {time}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <button
                                type="button"
                                onClick={() => removeSchedule(schedule.originalIndex)}
                                className="p-3 rounded-xl hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors border border-transparent hover:border-red-500/20"
                                title="Eliminar rango"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>

                        <button
                          type="button"
                          onClick={() => addSchedule(day.value)}
                          className="w-full mt-2 py-3 rounded-xl border border-dashed border-white/10 text-xs font-medium text-zinc-500 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                        >
                          <Plus className="w-3 h-3" /> Agregar Horario
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t border-white/5">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold shadow-lg shadow-white/10 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {loading ? 'Guardando...' : 'Guardar Profesional'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 hover:text-white transition-all duration-300"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
