'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  format,
  addMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  parseISO,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { Trash2, Lock } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Appointment, Exception, Professional } from '../lib/types'

type Props = {
  professionals: Professional[]
  appointments: Appointment[]
  exceptions: Exception[]
  selectedDate: Date
  onSelectDate: (date: Date) => void
  onStatusChange: (appointmentId: string, newStatus: string) => void
  onDeleteException: (exceptionId: string) => void
  onOpenBlockDialog: (professionalId: string) => void
}

export function ClassicDayView({
  professionals,
  appointments,
  exceptions,
  selectedDate,
  onSelectDate,
  onStatusChange,
  onDeleteException,
  onOpenBlockDialog,
}: Props) {
  const [viewMonth, setViewMonth] = useState(selectedDate)
  const [selectedProfessional, setSelectedProfessional] = useState('')

  const effectiveProfessionalId = selectedProfessional || professionals[0]?.id || ''

  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const dayAppointments = appointments
    .filter((a) => a.professional_id === effectiveProfessionalId && a.start_time.startsWith(dateStr))
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
  const dayExceptions = exceptions
    .filter((e) => e.professional_id === effectiveProfessionalId && e.specific_date === dateStr)
    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))

  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <div className="lg:col-span-1">
        <div className="glass-card-dark p-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setViewMonth((d) => addMonths(startOfMonth(d), -1))}
              className="p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
              title="Mes anterior"
            >
              ←
            </button>
            <h3 className="font-bold text-lg font-heading text-white min-w-[140px] text-center capitalize">
              {format(viewMonth, 'MMMM yyyy', { locale: es })}
            </h3>
            <button
              onClick={() => setViewMonth((d) => addMonths(startOfMonth(d), 1))}
              className="p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
              title="Próximo mes"
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
            {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2" />
            ))}
            {daysInMonth.map((day, i) => {
              const isToday = isSameDay(day, new Date())
              const isSelected = isSameDay(day, selectedDate)
              const isCurrentMonth = isSameMonth(day, viewMonth)

              return (
                <button
                  key={i}
                  onClick={() => onSelectDate(day)}
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
              value={effectiveProfessionalId}
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
              <h3 className="font-semibold text-lg text-white capitalize">
                {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
              </h3>
              <p className="text-sm text-zinc-400">{dayAppointments.length} turnos</p>
            </div>
            <button
              onClick={() => onOpenBlockDialog(effectiveProfessionalId)}
              className="rounded-xl bg-white text-black font-bold text-sm px-4 py-2 hover:bg-zinc-200 shadow-md shadow-white/10 transition-all hover:scale-105"
            >
              Bloquear horario
            </button>
          </div>

          <div className="p-8 space-y-8 max-h-[600px] overflow-y-auto custom-scrollbar">
            <div>
              <h3 className="text-lg font-bold font-heading text-white mb-4 flex items-center gap-2">
                Turnos del Día
              </h3>

              <AnimatePresence mode="popLayout">
                {dayAppointments.length === 0 ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-zinc-500 italic pl-4"
                  >
                    No hay turnos programados.
                  </motion.p>
                ) : (
                  <div className="space-y-4">
                    {dayAppointments.map((apt) => {
                      const startTime = format(parseISO(apt.start_time), 'HH:mm')
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
                                  <p className="font-bold text-white text-xl tracking-tight leading-tight transition-all duration-300">
                                    {apt.customer_name}
                                  </p>
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
                                onValueChange={(newStatus) => onStatusChange(apt.id, newStatus)}
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

            {dayExceptions.length > 0 && (
              <div className="pt-6 border-t border-white/10 mt-8">
                <h3 className="text-sm font-bold font-heading text-zinc-500 mb-6 flex items-center gap-2 uppercase tracking-widest pl-1">
                  <Lock className="w-4 h-4 text-zinc-500" />
                  Bloqueos de Agenda
                </h3>

                <div className="space-y-4">
                  <AnimatePresence>
                    {dayExceptions.map((exc) => {
                      const isFullDay = !exc.start_time && !exc.end_time
                      const startTime = exc.start_time
                        ? exc.start_time.length > 8
                          ? format(parseISO(exc.start_time), 'HH:mm')
                          : exc.start_time.substring(0, 5)
                        : '00:00'
                      const endTime = exc.end_time
                        ? exc.end_time.length > 8
                          ? format(parseISO(exc.end_time), 'HH:mm')
                          : exc.end_time.substring(0, 5)
                        : '23:59'

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
                                {isFullDay ? 'Día completo bloqueado' : `Bloqueado ${startTime} - ${endTime}`}
                              </p>
                              <p className="text-sm text-zinc-500 mt-0.5 font-medium">{exc.reason || 'Sin motivo'}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => onDeleteException(exc.id)}
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
  )
}
