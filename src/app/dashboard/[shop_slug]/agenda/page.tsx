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

import { DayTimelineView } from './components/DayTimelineView'
import { WeekView } from './components/WeekView'
import { MonthView } from './components/MonthView'
import { AppointmentDetailModal } from './components/AppointmentDetailModal'
import { BlockDialog } from './components/BlockDialog'
import { parseTimeToMinutes } from './lib/time'
import type { Appointment, Exception, Professional, Schedule, ViewMode } from './lib/types'

const FALLBACK_DAY_START = 9 * 60
const FALLBACK_DAY_END = 20 * 60

export default function AgendaPage() {
  const { shopId } = useShop()
  const supabase = createClient()

  const [viewMode, setViewMode] = useState<ViewMode>('dia')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')

  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [exceptions, setExceptions] = useState<Exception[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [showBlockDialog, setShowBlockDialog] = useState(false)
  const [blockDefaults, setBlockDefaults] = useState<{ professionalId?: string; startTime?: string }>({})

  const professionalIds = useMemo(() => professionals.map((p) => p.id), [professionals])

  const range = useMemo(() => {
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
  }, [viewMode, selectedDate, currentMonth])

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

  async function createBlock(data: { professionalId: string; startTime: string; endTime: string; reason: string }) {
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const { error } = await supabase.from('exceptions').insert({
      professional_id: data.professionalId,
      specific_date: dateStr,
      start_time: `${data.startTime}:00`,
      end_time: `${data.endTime}:00`,
      reason: data.reason || 'Bloqueo manual',
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
    (direction: 1 | -1) => {
      if (viewMode === 'dia') setSelectedDate((d) => addDays(d, direction))
      else if (viewMode === 'semana') setSelectedDate((d) => addWeeks(d, direction))
      else setCurrentMonth((m) => addMonths(m, direction))
    },
    [viewMode]
  )

  const goToday = () => {
    const today = new Date()
    setSelectedDate(today)
    setCurrentMonth(today)
  }

  const headerLabel =
    viewMode === 'dia'
      ? format(selectedDate, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })
      : viewMode === 'semana'
      ? `${format(range.start, 'd MMM', { locale: es })} - ${format(range.end, 'd MMM yyyy', { locale: es })}`
      : format(currentMonth, 'MMMM yyyy', { locale: es })

  return (
    <div className="space-y-6 p-2">
      <div>
        <h2 className="text-4xl font-bold font-heading text-white text-glow mb-2">Agenda</h2>
        <p className="text-muted-foreground">Visualiza y administra los turnos</p>
      </div>

      {/* Toolbar */}
      <div className="glass-card-dark p-4 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
          >
            ←
          </button>
          <h3 className="font-bold text-lg font-heading text-white capitalize min-w-[220px]">
            {headerLabel}
          </h3>
          <button
            onClick={() => navigate(1)}
            className="p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
          >
            →
          </button>
          <button
            onClick={goToday}
            className="ml-2 px-3 py-1.5 rounded-lg border border-white/10 text-sm text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            Hoy
          </button>
        </div>

        <div className="flex items-center gap-3 flex-1 justify-end min-w-[260px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cliente o servicio..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/20"
            />
          </div>

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

          <button
            onClick={() => {
              setBlockDefaults({})
              setShowBlockDialog(true)
            }}
            className="rounded-lg bg-white text-black font-bold text-sm px-4 py-2 hover:bg-zinc-200 shadow-md shadow-white/10 transition-all whitespace-nowrap"
          >
            Bloquear horario
          </button>
        </div>
      </div>

      {/* Views */}
      {viewMode === 'dia' && (
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

      {viewMode === 'semana' && (
        <WeekView
          weekDays={weekDays}
          appointments={filteredAppointments}
          selectedDate={selectedDate}
          onSelectDay={(day) => {
            setSelectedDate(day)
            setViewMode('dia')
          }}
        />
      )}

      {viewMode === 'mes' && (
        <MonthView
          month={currentMonth}
          selectedDate={selectedDate}
          appointments={filteredAppointments}
          onSelectDay={(day) => {
            setSelectedDate(day)
            setViewMode('dia')
          }}
        />
      )}

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
