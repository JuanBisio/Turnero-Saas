/**
 * Agenda Page
 * Calendar view with daily appointments and slot management
 */

'use client'

import { useState, useEffect } from 'react'
import { useShop } from '@/components/providers/ShopProvider'
import { createClient } from '@/lib/supabase/client'
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

type Professional = {
  id: string
  name: string
}

type Service = {
  id: string
  name: string
}

type Appointment = {
  id: string
  start_time: string
  end_time: string
  customer_name: string
  customer_phone: string
  status: string
  professional: Professional
  service: Service
}

export default function AgendaPage() {
  const { shopId } = useShop()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedProfessional, setSelectedProfessional] = useState<string>('')
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showBlockDialog, setShowBlockDialog] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (shopId) {
      fetchProfessionals()
    }
  }, [shopId])

  useEffect(() => {
    if (selectedDate && selectedProfessional) {
      fetchDayData()
    }
  }, [selectedDate, selectedProfessional])

  // Realtime subscription
  useEffect(() => {
    if (!shopId) return

    console.log('Setting up realtime subscription for shop:', shopId)

    const channel = supabase
      .channel('agenda-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'appointments',
          filter: `shop_id=eq.${shopId}`,
        },
        (payload) => {
          console.log('Realtime change received:', payload)
          // Refresh data if the change might affect current view
          // Optimization: check if payload.new/old date matches selectedDate, but easier to just fetch
          fetchDayData()
        }
      )
      .subscribe()

    return () => {
      console.log('Cleaning up realtime subscription')
      supabase.removeChannel(channel)
    }
  }, [shopId, selectedDate, selectedProfessional]) // Re-subscribe if context changes (actually channel persistence handles it, but dependency ensures fetchDayData context is fresh)

  async function fetchProfessionals() {
    const { data } = await supabase
      .from('professionals')
      .select('id, name')
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .order('name')

    if (data && data.length > 0) {
      setProfessionals(data)
      setSelectedProfessional(data[0].id)
    }
  }

  async function fetchDayData() {
    const dateStr = format(selectedDate, 'yyyy-MM-dd')

    // Fetch appointments
    const { data: apts } = await supabase
      .from('appointments')
      .select(`
        *,
        professional:professionals(id, name),
        service:services(id, name)
      `)
      .eq('professional_id', selectedProfessional)
      .gte('start_time', `${dateStr}T00:00:00`)
      .lt('start_time', `${dateStr}T23:59:59`)
      .order('start_time')

    if (apts) {
      setAppointments(apts)
    }
  }

  // Simple calendar grid
  const monthStart = startOfMonth(selectedDate)
  const monthEnd = endOfMonth(selectedDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Agenda</h2>
        <p className="text-muted-foreground">
          Visualiza y administra los turnos
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, -30))}
                className="p-2 hover:bg-accent rounded"
              >
                ←
              </button>
              <h3 className="font-semibold">
                {format(selectedDate, 'MMMM yyyy', { locale: es })}
              </h3>
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, 30))}
                className="p-2 hover:bg-accent rounded"
              >
                →
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                <div key={i} className="text-center text-xs font-medium text-muted-foreground p-2">
                  {day}
                </div>
              ))}
              {daysInMonth.map((day, i) => {
                const isToday = isSameDay(day, new Date())
                const isSelected = isSameDay(day, selectedDate)
                const isCurrentMonth = isSameMonth(day, selectedDate)

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(day)}
                    className={`p-2 text-sm rounded ${
                      isSelected
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : isToday
                        ? 'bg-accent font-semibold'
                        : isCurrentMonth
                        ? 'hover:bg-accent'
                        : 'text-muted-foreground opacity-50'
                    }`}
                  >
                    {format(day, 'd')}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Professional Selector */}
          <div className="mt-4 rounded-lg border bg-card p-4">
            <label className="block text-sm font-medium mb-2">Profesional</label>
            <select
              value={selectedProfessional}
              onChange={(e) => setSelectedProfessional(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2"
            >
              {professionals.map((prof) => (
                <option key={prof.id} value={prof.id}>
                  {prof.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Appointments List */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border bg-card">
            <div className="border-b p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">
                  {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {appointments.length} turnos
                </p>
              </div>
              <button
                onClick={() => setShowBlockDialog(true)}
                className="rounded-lg border px-3 py-2 text-sm hover:bg-accent"
              >
                Bloquear horario
              </button>
            </div>

            <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
              {appointments.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">
                  No hay turnos para este día
                </p>
              ) : (
                appointments.map((apt) => {
                  const startTime = format(parseISO(apt.start_time), 'HH:mm')
                  const endTime = format(parseISO(apt.end_time), 'HH:mm')

                  return (
                    <div
                      key={apt.id}
                      className={`rounded-lg border p-3 ${
                        apt.status === 'cancelado'
                          ? 'bg-muted opacity-60'
                          : 'bg-card'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">
                              {startTime} - {endTime}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                apt.status === 'confirmado'
                                  ? 'bg-green-100 text-green-800'
                                  : apt.status === 'pendiente'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {apt.status}
                            </span>
                          </div>
                          <p className="font-medium">{apt.customer_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {apt.service?.name || 'Servicio no disponible'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {apt.customer_phone}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Block Time Dialog */}
      {showBlockDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Bloquear horario</h3>
            
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                
                if (!selectedProfessional) {
                  alert('Por favor selecciona un profesional primero')
                  return
                }

                const formData = new FormData(e.currentTarget)
                const startTime = formData.get('start_time') as string
                const endTime = formData.get('end_time') as string
                const reason = formData.get('reason') as string

                if (!startTime || !endTime) {
                  alert('Por favor completa todos los campos')
                  return
                }

                setLoading(true)

                try {
                  const dateStr = format(selectedDate, 'yyyy-MM-dd')
                  const startDateTime = `${dateStr}T${startTime}:00`
                  const endDateTime = `${dateStr}T${endTime}:00`

                  console.log('Creating exception:', {
                    professional_id: selectedProfessional,
                    start_time: startDateTime,
                    end_time: endDateTime,
                    reason: reason || 'Bloqueo manual',
                  })

                  const { error, data } = await supabase.from('exceptions').insert({
                    professional_id: selectedProfessional,
                    start_time: startDateTime,
                    end_time: endDateTime,
                    reason: reason || 'Bloqueo manual',
                  }).select()

                  if (error) {
                    console.error('Error creating exception:', error)
                    alert(`Error al bloquear horario: ${error.message}`)
                  } else {
                    console.log('Exception created:', data)
                    setShowBlockDialog(false)
                    fetchDayData()
                    alert('Horario bloqueado exitosamente')
                  }
                } catch (error: any) {
                  console.error('Error:', error)
                  alert(`Error: ${error.message || 'Error desconocido'}`)
                } finally {
                  setLoading(false)
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-2">
                  Hora inicio *
                </label>
                <div className="relative">
                  <input
                    type="time"
                    name="start_time"
                    className="w-full glass rounded-lg px-3 py-2 text-white/90 bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/50 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                     {/* Custom icon overlay could go here, but native one is inverted via CSS */}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Hora fin *
                </label>
                <div className="relative">
                  <input
                    type="time"
                    name="end_time"
                    className="w-full glass rounded-lg px-3 py-2 text-white/90 bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/50 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Motivo (opcional)
                </label>
                <input
                  type="text"
                  name="reason"
                  placeholder="Ej: Almuerzo, Reunión..."
                  className="w-full rounded-lg border bg-background px-3 py-2"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? 'Bloqueando...' : 'Bloquear'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBlockDialog(false)}
                  className="flex-1 rounded-lg border px-4 py-2 hover:bg-accent"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
