/**
 * Create/Edit Professional Form
 */

'use client'

import { useState, useEffect } from 'react'
import { useShop } from '@/components/providers/ShopProvider'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const DAYS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
]

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
    // Convert HH:mm:ss to minutes for comparison
    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number)
      return h * 60 + m
    }
    
    const s1 = toMinutes(start1)
    const e1 = toMinutes(end1)
    const s2 = toMinutes(start2)
    const e2 = toMinutes(end2)
    
    // Ranges overlap if: start1 < end2 AND start2 < end1
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
    // Group by day
    const byDay = schedules.reduce((acc, schedule) => {
      if (!acc[schedule.day_of_week]) {
        acc[schedule.day_of_week] = []
      }
      acc[schedule.day_of_week].push(schedule)
      return acc
    }, {} as Record<number, Schedule[]>)

    // Check each day for overlaps
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

    // Validate schedules before saving
    const validationError = validateSchedules()
    if (validationError) {
      alert(validationError)
      return
    }

    setLoading(true)

    try {
      if (isEdit) {
        // Update professional
        await supabase
          .from('professionals')
          .update({
            name,
            buffer_time_minutes: bufferTime,
            is_active: isActive,
          })
          .eq('id', resolvedParams.id)

        // Delete old schedules
        await supabase
          .from('schedules')
          .delete()
          .eq('professional_id', resolvedParams.id)

        // Insert new schedules
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
        // Create professional
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

        // Insert schedules
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
    return <div>Cargando...</div>
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-3xl font-bold mb-6">
        {isEdit ? 'Editar' : 'Nuevo'} Profesional
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-2">Nombre *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border bg-background px-4 py-2"
            required
          />
        </div>

        {/* Buffer Time */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Tiempo de buffer (minutos) *
          </label>
          <input
            type="number"
            value={bufferTime}
            onChange={(e) => setBufferTime(parseInt(e.target.value))}
            className="w-full rounded-lg border bg-background px-4 py-2"
            min="0"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">
            Tiempo adicional entre turnos para preparación
          </p>
        </div>

        {/* Active */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="active" className="text-sm font-medium">
            Activo (disponible para reservas)
          </label>
        </div>

        {/* Schedules - Grouped by Day */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Horarios</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Configura uno o más rangos horarios por día (ej: turno mañana y tarde)
          </p>
          
          {/* Day Selector Buttons */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {DAYS.map((day) => {
              const hasSchedules = schedules.some(s => s.day_of_week === day.value)
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => {
                    if (!hasSchedules) {
                      addSchedule(day.value)
                    }
                  }}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    hasSchedules
                      ? "bg-primary text-primary-foreground cursor-default"
                      : "border border-dashed border-primary/50 text-primary hover:bg-primary/10"
                  )}
                >
                  {day.label.substring(0, 2)}
                </button>
              )
            })}
          </div>
          
          <div className="space-y-4">
            {DAYS.filter(day => schedules.some(s => s.day_of_week === day.value)).map((day) => {
              const daySchedules = schedules
                .map((s, idx) => ({ ...s, originalIndex: idx }))
                .filter((s) => s.day_of_week === day.value)
              
              return (
                <div key={day.value} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                      {day.label}
                    </h4>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    {daySchedules.map((schedule) => (
                      <div
                        key={schedule.originalIndex}
                        className="flex items-center gap-3 rounded-lg border bg-card p-3"
                      >
                        <input
                          type="time"
                          value={schedule.start_time.substring(0, 5)}
                          onChange={(e) =>
                            updateSchedule(schedule.originalIndex, 'start_time', e.target.value + ':00')
                          }
                          className="rounded border px-2 py-1 text-sm bg-background"
                        />
                        <span className="text-muted-foreground">-</span>
                        <input
                          type="time"
                          value={schedule.end_time.substring(0, 5)}
                          onChange={(e) =>
                            updateSchedule(schedule.originalIndex, 'end_time', e.target.value + ':00')
                          }
                          className="rounded border px-2 py-1 text-sm bg-background"
                        />
                        <button
                          type="button"
                          onClick={() => removeSchedule(schedule.originalIndex)}
                          className="ml-auto text-destructive hover:underline text-sm"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => addSchedule(day.value)}
                    className="w-full rounded-lg border border-dashed border-primary/50 px-3 py-2 text-sm text-primary hover:bg-primary/10 transition-colors"
                  >
                    + Agregar rango adicional
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border px-4 py-2 hover:bg-accent"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
