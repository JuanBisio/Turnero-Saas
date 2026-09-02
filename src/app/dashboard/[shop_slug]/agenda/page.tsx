/**
 * Agenda Page
 * Multi-professional timeline calendar (day / week / month views)
 */

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useShop } from '@/components/providers/ShopProvider'
import { createClient } from '@/lib/supabase/client'
import {
  format,
  addDays,
  addWeeks,
  addMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { DayTimelineView } from './components/DayTimelineView'
import { WeekView } from './components/WeekView'
import { MonthView } from './components/MonthView'
import { ClassicDayView } from './components/ClassicDayView'
import { AppointmentDetailModal } from './components/AppointmentDetailModal'
import { BlockDialog } from './components/BlockDialog'
import { parseTimeToMinutes } from './lib/time'
import type { Appointment, Exception, LayoutMode, Professional, Schedule, ViewMode } from './lib/types'

const slideVariants = {
  enter: (dir: number) => ({ x: dir >= 0 ? 24 : -24, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir >= 0 ? -24 : 24, opacity: 0 }),
}

const FALLBACK_DAY_START = 9 * 60
const FALLBACK_DAY_END = 20 * 60

export default function AgendaPage() {
  const { shopId } = useShop()
  const supabase = createClient()

  const [viewMode, setViewMode] = useState<ViewMode>('dia')
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('timeline')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [direction, setDirection] = useState(1)

  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [exceptions, setExceptions] = useState<Exception[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [showBlockDialog, setShowBlockDialog] = useState(false)
  const [blockDefaults, setBlockDefaults] = useState<{ professionalId?: string; startTime?: string }>({})

  const professionalIds = useMemo(() => professionals.map((p) => p.id), [professionals])

  const range = useMemo(() => {
    if (layoutMode === 'clasica') {
      return { start: selectedDate, end: selectedDate }
    }
    if (viewMode === 'semana') {
      return {
        start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
        end: endOfWeek(selectedDate, { weekStartsOn: 1 }),
      }
    }
    if (viewMode === 'mes') {
      return { start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) }
    }
    return { start: selectedDate, end: selectedDate }
  }, [layoutMode, viewMode, selectedDate, currentMonth])

  const fetchProfessionals = useCallback(async () => {
    const { data } = await supabase
      .from('professionals')
      .select('id, name')
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .order('name')

    setProfessionals(data || [])
  }, [shopId, supabase])

  const fetchRangeData = useCallback(async () => {
    const startStr = format(range.start, 'yyyy-MM-dd')
    const endStr = format(range.end, 'yyyy-MM-dd')

    const [aptsRes, excsRes, schedRes] = await Promise.all([
      supabase
        .from('appointments')
        .select(`
          id, start_time, end_time, customer_name, customer_phone, status, professional_id,
          professional:professionals(id, name),
          service:services(id, name)
        `)
        .eq('shop_id', shopId)
        .gte('start_time', `${startStr}T00:00:00`)
        .lt('start_time', `${endStr}T23:59:59`)
        .order('start_time'),
      supabase
        .from('exceptions')
        .select('id, professional_id, specific_date, start_time, end_time, reason, is_blocked')
        .in('professional_id', professionalIds)
        .gte('specific_date', startStr)
        .lte('specific_date', endStr),
      supabase
        .from('schedules')
        .select('professional_id, day_of_week, start_time, end_time')
        .in('professional_id', professionalIds),
    ])

    if (aptsRes.data) setAppointments(aptsRes.data as unknown as Appointment[])
    if (excsRes.data) setExceptions(excsRes.data as Exception[])
    if (schedRes.data) setSchedules(schedRes.data as Schedule[])
  }, [shopId, professionalIds, range, supabase])

  const autoCompletePastAppointments = useCallback(async () => {
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'completado' })
      .in('professional_id', professionalIds)
      .lt('end_time', now)
      .in('status', ['pendiente', 'confirmado'])

    if (!error) fetchRangeData()
  }, [professionalIds, supabase, fetchRangeData])

  useEffect(() => {
    if (shopId) fetchProfessionals()
  }, [shopId, fetchProfessionals])

  useEffect(() => {
    if (shopId && professionalIds.length > 0) fetchRangeData()
  }, [shopId, professionalIds.length, fetchRangeData])

  useEffect(() => {
    if (shopId && professionalIds.length > 0) autoCompletePastAppointments()
  }, [shopId, professionalIds.length, autoCompletePastAppointments])

  // Realtime subscription
  useEffect(() => {
    if (!shopId || professionalIds.length === 0) return

    const channel = supabase
      .channel('agenda-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments', filter: `shop_id=eq.${shopId}` },
        () => fetchRangeData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'exceptions' },
        (payload: { new: { professional_id?: string } | null; old: { professional_id?: string } | null }) => {
          const row = payload.new || payload.old
          if (row?.professional_id && professionalIds.includes(row.professional_id)) fetchRangeData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [shopId, professionalIds, supabase, fetchRangeData])

  async function updateAppointmentStatus(appointmentId: string, newStatus: string) {
    const { error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', appointmentId)
    if (error) {
      alert('Error al actualizar el estado')
    } else {
      setSelectedAppointment(null)
      fetchRangeData()
    }
  }

  async function deleteException(exceptionId: string) {
    const confirmed = window.confirm('¿Eliminar este bloqueo de horario?')
    if (!confirmed) return

    const { error } = await supabase.from('exceptions').delete().eq('id', exceptionId)
    if (error) {
      alert('Error al eliminar el bloqueo')
    } else {
      fetchRangeData()
    }
  }

  async function createBlock(data: { professionalId: string; startTime: string; endTime: string; reason: string; fullDay: boolean }) {
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const { error } = await supabase.from('exceptions').insert({
      professional_id: data.professionalId,
      specific_date: dateStr,
      start_time: data.fullDay ? null : `${data.startTime}:00`,
      end_time: data.fullDay ? null : `${data.endTime}:00`,
      reason: data.reason || (data.fullDay ? 'Día bloqueado' : 'Bloqueo manual'),
      is_blocked: true,
    })

    if (error) {
      alert(`Error al bloquear horario: ${error.message}`)
    } else {
      setShowBlockDialog(false)
      setBlockDefaults({})
      fetchRangeData()
    }
  }

  const filteredAppointments = useMemo(() => {
    if (!searchQuery.trim()) return appointments
    const q = searchQuery.trim().toLowerCase()
    return appointments.filter(
      (a) =>
        a.customer_name.toLowerCase().includes(q) ||
        a.service?.name?.toLowerCase().includes(q) ||
        a.professional?.name?.toLowerCase().includes(q)
    )
  }, [appointments, searchQuery])

  const dayBounds = useMemo(() => {
    const dayOfWeek = selectedDate.getDay()
    const daySchedules = schedules.filter((s) => s.day_of_week === dayOfWeek)

    let startMin = FALLBACK_DAY_START
    let endMin = FALLBACK_DAY_END

    if (daySchedules.length > 0) {
      startMin = Math.min(...daySchedules.map((s) => parseTimeToMinutes(s.start_time)))
      endMin = Math.max(...daySchedules.map((s) => parseTimeToMinutes(s.end_time)))
    }

    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const dayAppointments = appointments.filter((a) => a.start_time.startsWith(dateStr))
    for (const apt of dayAppointments) {
      const aptStart = new Date(apt.start_time)
      const aptEnd = new Date(apt.end_time)
      startMin = Math.min(startMin, aptStart.getHours() * 60 + aptStart.getMinutes())
      endMin = Math.max(endMin, aptEnd.getHours() * 60 + aptEnd.getMinutes())
    }

    return {
      start: Math.floor(startMin / 60) * 60,
      end: Math.ceil(endMin / 60) * 60,
    }
  }, [schedules, selectedDate, appointments])

  const weekDays = useMemo(
    () => eachDayOfInterval({ start: startOfWeek(selectedDate, { weekStartsOn: 1 }), end: endOfWeek(selectedDate, { weekStartsOn: 1 }) }),
    [selectedDate]
  )

  const navigate = useCallback(
    (step: 1 | -1) => {
      setDirection(step)
      const effectiveMode = layoutMode === 'clasica' ? 'dia' : viewMode
      if (effectiveMode === 'dia') setSelectedDate((d) => addDays(d, step))
      else if (effectiveMode === 'semana') setSelectedDate((d) => addWeeks(d, step))
      else setCurrentMonth((m) => addMonths(m, step))
    },
    [viewMode, layoutMode]
  )

  const goToday = () => {
    const today = new Date()
    setDirection(1)
    setSelectedDate(today)
    setCurrentMonth(today)
  }

  const headerLabel =
    layoutMode === 'clasica' || viewMode === 'dia'
      ? format(selectedDate, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })
      : viewMode === 'semana'
      ? `${format(range.start, 'd MMM', { locale: es })} - ${format(range.end, 'd MMM yyyy', { locale: es })}`
      : format(currentMonth, 'MMMM yyyy', { locale: es })

  const viewKey = `${layoutMode}-${layoutMode === 'clasica' ? 'dia' : viewMode}-${format(selectedDate, 'yyyy-MM-dd')}-${format(currentMonth, 'yyyy-MM')}`

  return (
    <div className="space-y-6 p-2">
      <div>
        <h2 className="text-4xl font-bold font-heading text-white text-glow mb-2">Agenda</h2>
        <p className="text-muted-foreground">Visualiza y administra los turnos</p>
      </div>

      {/* Toolbar */}
      <div className="glass-card-dark p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-2 shrink-0 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
          >
            ←
          </button>
          <h3 className="font-bold text-base sm:text-lg font-heading text-white capitalize truncate">
            {headerLabel}
          </h3>
          <button
            onClick={() => navigate(1)}
            className="p-2 shrink-0 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
          >
            →
          </button>
          <button
            onClick={goToday}
            className="ml-1 shrink-0 px-3 py-1.5 rounded-lg border border-white/10 text-sm text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            Hoy
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-1 sm:justify-end">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cliente o servicio..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/20"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-lg border border-white/10 overflow-hidden">
              {(['timeline', 'clasica'] as LayoutMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setLayoutMode(mode)}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    layoutMode === mode ? 'bg-white text-black' : 'text-zinc-300 hover:bg-white/10'
                  }`}
                >
                  {mode === 'timeline' ? 'Timeline' : 'Clásica'}
                </button>
              ))}
            </div>

            {layoutMode === 'timeline' && (
              <div className="flex rounded-lg border border-white/10 overflow-hidden">
                {(['dia', 'semana', 'mes'] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-2 text-sm font-medium capitalize transition-colors ${
                      viewMode === mode ? 'bg-white text-black' : 'text-zinc-300 hover:bg-white/10'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            )}

            {layoutMode === 'timeline' && (
              <button
                onClick={() => {
                  setBlockDefaults({})
                  setShowBlockDialog(true)
                }}
                className="rounded-lg bg-white text-black font-bold text-sm px-4 py-2 hover:bg-zinc-200 shadow-md shadow-white/10 transition-all whitespace-nowrap"
              >
                Bloquear horario
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Views */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={viewKey}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {layoutMode === 'clasica' && (
            <ClassicDayView
              professionals={professionals}
              appointments={filteredAppointments}
              exceptions={exceptions}
              selectedDate={selectedDate}
              onSelectDate={(day) => {
                setDirection(1)
                setSelectedDate(day)
              }}
              onStatusChange={updateAppointmentStatus}
              onDeleteException={deleteException}
              onOpenBlockDialog={(professionalId) => {
                setBlockDefaults({ professionalId })
                setShowBlockDialog(true)
              }}
            />
          )}

          {layoutMode === 'timeline' && viewMode === 'dia' && (
            <DayTimelineView
              professionals={professionals}
              appointments={filteredAppointments}
              exceptions={exceptions}
              dayStartMin={dayBounds.start}
              dayEndMin={dayBounds.end}
              highlightId={null}
              onSelectAppointment={setSelectedAppointment}
              onSlotClick={(professionalId, timeHHmm) => {
                setBlockDefaults({ professionalId, startTime: timeHHmm })
                setShowBlockDialog(true)
              }}
              onDeleteException={deleteException}
            />
          )}

          {layoutMode === 'timeline' && viewMode === 'semana' && (
            <WeekView
              weekDays={weekDays}
              appointments={filteredAppointments}
              selectedDate={selectedDate}
              onSelectDay={(day) => {
                setDirection(1)
                setSelectedDate(day)
                setViewMode('dia')
              }}
            />
          )}

          {layoutMode === 'timeline' && viewMode === 'mes' && (
            <MonthView
              month={currentMonth}
              selectedDate={selectedDate}
              appointments={filteredAppointments}
              onSelectDay={(day) => {
                setDirection(1)
                setSelectedDate(day)
                setViewMode('dia')
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {selectedAppointment && (
        <AppointmentDetailModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onStatusChange={updateAppointmentStatus}
        />
      )}

      {showBlockDialog && (
        <BlockDialog
          professionals={professionals}
          defaultProfessionalId={blockDefaults.professionalId}
          defaultStartTime={blockDefaults.startTime}
          onClose={() => {
            setShowBlockDialog(false)
            setBlockDefaults({})
          }}
          onSubmit={createBlock}
        />
      )}
    </div>
  )
}
