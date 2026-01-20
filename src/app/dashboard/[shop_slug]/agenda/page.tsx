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
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Lock, Clock } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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

type Exception = {
  id: string
  professional_id: string
  specific_date: string
  start_time: string
  end_time: string
  reason: string
}

export default function AgendaPage() {
  const { shopId } = useShop()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedProfessional, setSelectedProfessional] = useState<string>('')
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [exceptions, setExceptions] = useState<Exception[]>([])
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

  // Auto-complete past appointments
  useEffect(() => {
    if (shopId && selectedProfessional) {
      autoCompletePastAppointments()
    }
  }, [shopId, selectedProfessional])

  // Realtime subscription
  useEffect(() => {
    if (!shopId || !selectedProfessional) return

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
          console.log('Realtime appointment change received:', payload)
          fetchDayData()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'exceptions',
          filter: `professional_id=eq.${selectedProfessional}`,
        },
        (payload) => {
          console.log('Realtime exception change received:', payload)
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

    // Fetch exceptions for this date
    const { data: excs } = await supabase
      .from('exceptions')
      .select('*')
      .eq('professional_id', selectedProfessional)
      .eq('specific_date', dateStr)
      .order('start_time')

    if (excs) {
      setExceptions(excs)
    }
  }

  // Auto-complete past appointments
  async function autoCompletePastAppointments() {
    const now = new Date().toISOString()

    // Update only pendiente/confirmado appointments that have ended
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'completado' })
      .eq('professional_id', selectedProfessional)
      .lt('end_time', now)
      .in('status', ['pendiente', 'confirmado'])

    if (error) {
      console.error('Error auto-completing appointments:', error)
    } else {
      // Refresh data after auto-complete
      fetchDayData()
    }
  }

  // Update appointment status manually
  async function updateAppointmentStatus(appointmentId: string, newStatus: string) {
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', appointmentId)

    if (error) {
      console.error('Error updating status:', error)
      alert('Error al actualizar el estado')
    } else {
      // Refresh data
      fetchDayData()
    }
  }

  // Delete exception block
  async function deleteException(exceptionId: string) {
    const confirmed = window.confirm('¿Eliminar este bloqueo de horario?')
    if (!confirmed) return

    const { error } = await supabase
      .from('exceptions')
      .delete()
      .eq('id', exceptionId)

    if (error) {
      console.error('Error deleting exception:', error)
      alert('Error al eliminar el bloqueo')
    } else {
      // Refresh data
      fetchDayData()
    }
  }

  // Simple calendar grid
  const monthStart = startOfMonth(selectedDate)
  const monthEnd = endOfMonth(selectedDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  return (
    <div className="space-y-6 p-2">
      <div>
        <h2 className="text-4xl font-bold font-heading text-white text-glow mb-2">Agenda</h2>
        <p className="text-muted-foreground">
          Visualiza y administra los turnos
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-1">
          <div className="glass-card-dark p-6">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, -30))}
                className="p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
              >
                ←
              </button>
              <h3 className="font-bold text-lg font-heading text-white">
                {format(selectedDate, 'MMMM yyyy', { locale: es })}
              </h3>
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, 30))}
                className="p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
              >
                →
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                <div key={i} className="text-center text-xs font-bold text-zinc-500 uppercase tracking-widest p-2">
                  {day}
                </div>
              ))}
              {/* Add empty cells to align first day with correct weekday */}
              {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
                <div key={`empty-${i}`} className="p-2" />
              ))}
              {daysInMonth.map((day, i) => {
                const isToday = isSameDay(day, new Date())
                const isSelected = isSameDay(day, selectedDate)
                const isCurrentMonth = isSameMonth(day, selectedDate)

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(day)}
                    className={`p-2 text-sm rounded-xl transition-all duration-300 relative overflow-hidden group ${
                      isSelected
                        ? 'bg-white text-black font-bold shadow-lg shadow-white/10 scale-110 z-10 border border-white'
                        : isToday
                        ? 'bg-white/5 text-white font-bold border border-white/20'
                        : isCurrentMonth
                        ? 'text-zinc-400 hover:bg-white/10 hover:text-white hover:scale-105'
                        : 'text-zinc-700 opacity-30'
                    }`}
                  >
                    {isSelected && (
                        <span className="absolute inset-0 bg-gradient-to-br from-black/5 to-transparent pointer-events-none" />
                    )}
                    {format(day, 'd')}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Professional Selector */}
          <div className="mt-6 glass-card-dark p-6">
            <label className="block text-sm font-bold text-zinc-400 mb-3 uppercase tracking-wider">Profesional</label>
            <div className="relative">
              <select
                value={selectedProfessional}
                onChange={(e) => setSelectedProfessional(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-white/20 hover:bg-white/[0.03] transition-colors"
                style={{ backgroundImage: 'none' }} 
              >
                {professionals.map((prof) => (
                  <option key={prof.id} value={prof.id} className="bg-zinc-950 text-white">
                    {prof.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
                <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </div>
            </div>
          </div>
        </div>

        {/* Appointments List */}
        <div className="lg:col-span-2">
          <div className="glass-card-dark h-full relative overflow-hidden">
            <div className="border-b border-white/5 p-6 flex items-center justify-between bg-white/[0.01]">
              <div>
                <h3 className="font-semibold text-lg text-white">
                  {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                </h3>
                <p className="text-sm text-zinc-400">
                  {appointments.length} turnos
                </p>
              </div>
              <button
                onClick={() => setShowBlockDialog(true)}
                className="rounded-xl bg-white text-black font-bold text-sm px-4 py-2 hover:bg-zinc-200 shadow-md shadow-white/10 transition-all hover:scale-105"
              >
                Bloquear horario
              </button>
            </div>

            <div className="p-8 space-y-8 max-h-[600px] overflow-y-auto custom-scrollbar">
              
              {/* --- APPOINTMENTS SECTION --- */}
              <div>
                <h3 className="text-lg font-bold font-heading text-white mb-4 flex items-center gap-2">
                  Turnos del Día
                </h3>

                  <AnimatePresence mode="popLayout">
                  {appointments.length === 0 ? (
                    <motion.p 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-zinc-500 italic pl-4"
                    >
                      No hay turnos programados.
                    </motion.p>
                  ) : (
                    <div className="space-y-4">
                      {appointments
                        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                        .map((apt) => {
                          const startTime = format(parseISO(apt.start_time), 'HH:mm')
                          const endTime = format(parseISO(apt.end_time), 'HH:mm')
                          const isFinalized = ['completado', 'no_asistio'].includes(apt.status)

                          return (
                            <motion.div
                              key={`apt-${apt.id}`}
                              layout
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.4 } }}
                              transition={{ duration: 0.4 }}
                              className={`rounded-3xl border p-6 transition-all duration-400 group ${
                                apt.status === 'cancelado'
                                  ? 'bg-zinc-900/10 border-zinc-800 opacity-60'
                                  : isFinalized
                                  ? 'bg-zinc-900/20 border-zinc-800/50 opacity-70 grayscale-[0.5]'
                                  : 'bg-white/[0.02] backdrop-blur-3xl border-white/10 hover:bg-white/[0.04] hover:border-white/20 hover:shadow-lg hover:shadow-white/5 shadow-sm'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-6">
                                <div className="flex-1">
                                  <div className="flex items-center gap-4 mb-3">
                                    <div className="flex flex-col items-center justify-center min-w-[4rem]">
                                      <span className="font-light text-2xl text-white tracking-tight leading-none">
                                        {startTime}
                                      </span>
                                    </div>
                                    <div>
                                      <p className="font-bold text-white text-xl tracking-tight leading-tight transition-all duration-300">{apt.customer_name}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-800/40 border border-white/5">
                                          <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]"></span>
                                          <p className="text-sm text-zinc-300 font-medium">
                                            {apt.service?.name || 'Servicio General'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex-shrink-0 pt-1">
                                   <Select
                                      value={apt.status}
                                      onValueChange={(newStatus) => updateAppointmentStatus(apt.id, newStatus)}
                                    >
                                      <SelectTrigger className="w-[150px] bg-white/[0.03] border-white/10 text-zinc-200 h-9 rounded-xl focus:ring-1 focus:ring-white/20 backdrop-blur-md hover:bg-white/[0.06] transition-colors">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-zinc-950/95 backdrop-blur-xl border-white/10 text-zinc-200 shadow-2xl rounded-xl">
                                        <SelectItem value="pendiente" className="focus:bg-white/10 focus:text-white">Pendiente</SelectItem>
                                        <SelectItem value="confirmado" className="text-emerald-400 focus:bg-white/10 focus:text-emerald-300">Confirmado</SelectItem>
                                        <SelectItem value="completado" className="text-blue-400 focus:bg-white/10 focus:text-blue-300">Completado</SelectItem>
                                        <SelectItem value="no_asistio" className="text-rose-400 focus:bg-white/10 focus:text-rose-300">No Asistió</SelectItem>
                                        <SelectItem value="cancelado" className="text-zinc-500 focus:bg-white/10 focus:text-zinc-300">Cancelado</SelectItem>
                                      </SelectContent>
                                    </Select>
                                </div>
                              </div>
                            </motion.div>
                          )
                        })}
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* --- EXCEPTIONS SECTION --- */}
              {exceptions.length > 0 && (
                <div className="pt-6 border-t border-white/10 mt-8">
                  <h3 className="text-sm font-bold font-heading text-zinc-500 mb-6 flex items-center gap-2 uppercase tracking-widest pl-1">
                    <Lock className="w-4 h-4 text-zinc-500" />
                    Bloqueos de Agenda
                  </h3>
                  
                  <div className="space-y-4">
                    <AnimatePresence>
                      {exceptions
                        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                        .map((exc) => {
                          const startTime = exc.start_time.length > 8 ? format(parseISO(exc.start_time), 'HH:mm') : exc.start_time.substring(0, 5)
                          const endTime = exc.end_time.length > 8 ? format(parseISO(exc.end_time), 'HH:mm') : exc.end_time.substring(0, 5)
                          
                          return (
                            <motion.div
                              key={`exc-${exc.id}`}
                              layout
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20, transition: { duration: 0.4 } }}
                              transition={{ duration: 0.4 }}
                              className="group relative flex items-center justify-between p-5 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md hover:border-white/20 hover:bg-white/[0.04] hover:shadow-lg hover:shadow-white/5 transition-all duration-500"
                            >
                              <div className="flex items-center gap-5">
                                <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-zinc-400 bg-zinc-900 group-hover:bg-white/10 group-hover:text-white transition-all duration-300">
                                  <Lock className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="text-white font-semibold text-base flex items-center gap-2">
                                    Bloqueado {startTime} - {endTime}
                                  </p>
                                  <p className="text-sm text-zinc-500 mt-0.5 font-medium">{exc.reason || 'Sin motivo'}</p>
                                </div>
                              </div>
                              
                              <button
                                onClick={() => deleteException(exc.id)}
                                className="p-2.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 duration-300"
                                title="Desbloquear"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </motion.div>
                          )
                        })}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Block Time Dialog - Midnight Glass Modal */}
      {showBlockDialog && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card-dark p-8 max-w-md w-full relative overflow-hidden border border-white/10 shadow-2xl"
          >
            {/* Modal Glow Background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[80px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 blur-[80px] rounded-full pointer-events-none" />

            <h3 className="text-2xl font-bold font-heading mb-6 text-white">Bloquear horario</h3>
            
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
                  const startDateTime = `${startTime}:00`
                  const endDateTime = `${endTime}:00`

                  const { error, data } = await supabase.from('exceptions').insert({
                    professional_id: selectedProfessional,
                    specific_date: dateStr,
                    start_time: startDateTime,
                    end_time: endDateTime,
                    reason: reason || 'Bloqueo manual',
                  }).select()

                  if (error) {
                    console.error('Error creating exception:', error)
                    alert(`Error al bloquear horario: ${error.message}`)
                  } else {
                    setShowBlockDialog(false)
                    fetchDayData()
                  }
                } catch (error: any) {
                  console.error('Error:', error)
                  alert(`Error: ${error.message || 'Error desconocido'}`)
                } finally {
                  setLoading(false)
                }
              }}
              className="space-y-5"
            >
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">
                  Hora inicio *
                </label>
                <div className="relative">
                  <input
                    type="time"
                    name="start_time"
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/20 focus:bg-white/[0.08] transition-all [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">
                  Hora fin *
                </label>
                <div className="relative">
                  <input
                    type="time"
                    name="end_time"
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/20 focus:bg-white/[0.08] transition-all [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">
                  Motivo (opcional)
                </label>
                <input
                  type="text"
                  name="reason"
                  placeholder="Ej: Almuerzo, Reunión..."
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-white/20 focus:bg-white/[0.08] transition-all"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBlockDialog(false)}
                  className="flex-1 rounded-xl border border-white/10 px-4 py-3 hover:bg-white/5 text-slate-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold px-4 py-3 shadow-lg shadow-white/10 transition-all disabled:opacity-50"
                >
                  {loading ? 'Bloqueando...' : 'Bloquear Horario'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
