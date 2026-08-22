'use client'

import { Check, Lock } from 'lucide-react'
import { getProfessionalColor } from '../lib/colors'
import { assignLanes } from '../lib/lanes'
import { isoToMinutes, parseTimeToMinutes, minutesToLabel } from '../lib/time'
import type { Appointment, Exception, Professional } from '../lib/types'

const PX_PER_HOUR = 128
const PX_PER_MIN = PX_PER_HOUR / 60
const COLUMN_TEMPLATE = 'minmax(min(170px, 62vw), 1fr)'

type Props = {
  professionals: Professional[]
  appointments: Appointment[]
  exceptions: Exception[]
  dayStartMin: number
  dayEndMin: number
  highlightId: string | null
  onSelectAppointment: (appointment: Appointment) => void
  onSlotClick: (professionalId: string, timeHHmm: string) => void
  onDeleteException: (exceptionId: string) => void
}

export function DayTimelineView({
  professionals,
  appointments,
  exceptions,
  dayStartMin,
  dayEndMin,
  highlightId,
  onSelectAppointment,
  onSlotClick,
  onDeleteException,
}: Props) {
  const totalMinutes = Math.max(dayEndMin - dayStartMin, 60)
  const gridHeight = totalMinutes * PX_PER_MIN
  const hourMarks: number[] = []
  for (let m = Math.ceil(dayStartMin / 60) * 60; m <= dayEndMin; m += 60) {
    hourMarks.push(m)
  }

  if (professionals.length === 0) {
    return (
      <div className="glass-card-dark p-12 text-center text-zinc-500">
        No hay profesionales activos para mostrar en la agenda.
      </div>
    )
  }

  return (
    <div className="glass-card-dark overflow-hidden">
      <div
        className="overflow-auto custom-scrollbar overscroll-contain"
        style={{ maxHeight: '72vh', scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
      >
        <div style={{ minWidth: professionals.length > 2 ? '640px' : undefined }}>
          {/* Header row */}
          <div
            className="grid border-b border-white/10 sticky top-0 z-20 bg-zinc-950/85 backdrop-blur-xl"
            style={{ gridTemplateColumns: `56px repeat(${professionals.length}, ${COLUMN_TEMPLATE})` }}
          >
            <div className="px-2 py-4 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
              Hora
            </div>
            {professionals.map((prof) => {
              const color = getProfessionalColor(prof.id)
              return (
                <div
                  key={prof.id}
                  className="flex items-center gap-2 px-3 py-4 border-l border-white/5 min-w-0"
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${color.dot}`}
                  >
                    {prof.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="font-semibold text-white truncate">{prof.name}</span>
                </div>
              )
            })}
          </div>

          {/* Grid body */}
          <div
            className="grid relative"
            style={{ gridTemplateColumns: `56px repeat(${professionals.length}, ${COLUMN_TEMPLATE})` }}
          >
            {/* Hour labels column */}
            <div className="relative" style={{ height: gridHeight }}>
              {hourMarks.map((m) => (
                <div
                  key={m}
                  className="absolute left-0 right-0 px-2 text-[11px] text-zinc-500 -translate-y-1/2"
                  style={{ top: (m - dayStartMin) * PX_PER_MIN }}
                >
                  {minutesToLabel(m)}
                </div>
              ))}
            </div>

            {/* Professional columns */}
            {professionals.map((prof) => {
              const color = getProfessionalColor(prof.id)
              const profExceptions = exceptions.filter((e) => e.professional_id === prof.id)
              const fullDayBlocked = profExceptions.some(
                (e) => e.is_blocked && !e.start_time && !e.end_time
              )
              const profAppointments = appointments
                .filter((a) => a.professional_id === prof.id && a.status !== 'cancelado')
                .sort((a, b) => a.start_time.localeCompare(b.start_time))

              const layoutItems = profAppointments.map((a) => ({
                id: a.id,
                startMin: isoToMinutes(a.start_time),
                endMin: isoToMinutes(a.end_time),
              }))
              const lanes = assignLanes(layoutItems)

              const timedExceptions = profExceptions.filter((e) => e.start_time && e.end_time)

              return (
                <div
                  key={prof.id}
                  className="relative border-l border-white/5 cursor-pointer"
                  style={{ height: gridHeight }}
                  onClick={(e) => {
                    if (e.target !== e.currentTarget) return
                    const rect = e.currentTarget.getBoundingClientRect()
                    const offsetY = e.clientY - rect.top
                    const clickedMin = dayStartMin + Math.round(offsetY / PX_PER_MIN / 15) * 15
                    onSlotClick(prof.id, minutesToLabel(clickedMin))
                  }}
                >
                  {/* Hour gridlines */}
                  {hourMarks.map((m) => (
                    <div
                      key={m}
                      className="absolute left-0 right-0 border-t border-white/5 pointer-events-none"
                      style={{ top: (m - dayStartMin) * PX_PER_MIN }}
                    />
                  ))}

                  {fullDayBlocked ? (
                    <div className="absolute inset-1 rounded-xl bg-zinc-800/30 border border-white/5 flex flex-col items-center justify-center gap-2 text-zinc-500 pointer-events-none">
                      <Lock className="w-5 h-5" />
                      <span className="text-xs font-medium">Día bloqueado</span>
                    </div>
                  ) : (
                    <>
                      {timedExceptions.map((exc) => {
                        const startMin = parseTimeToMinutes(exc.start_time!)
                        const endMin = parseTimeToMinutes(exc.end_time!)
                        const top = (startMin - dayStartMin) * PX_PER_MIN
                        const height = Math.max((endMin - startMin) * PX_PER_MIN, 24)
                        return (
                          <div
                            key={exc.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteException(exc.id)
                            }}
                            title="Click para desbloquear"
                            className="absolute left-1.5 right-1.5 rounded-lg border border-dashed border-zinc-600 bg-zinc-800/40 px-2 py-1 text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200 transition-colors overflow-hidden"
                            style={{ top, height }}
                          >
                            <div className="flex items-center gap-1 text-[11px] font-semibold">
                              <Lock className="w-3 h-3 shrink-0" />
                              <span className="truncate">{exc.reason || 'Bloqueado'}</span>
                            </div>
                          </div>
                        )
                      })}

                      {profAppointments.map((apt, index) => {
                        const startMin = isoToMinutes(apt.start_time)
                        const endMin = isoToMinutes(apt.end_time)
                        const top = (startMin - dayStartMin) * PX_PER_MIN
                        const height = Math.max((endMin - startMin) * PX_PER_MIN, 36)
                        const layout = lanes.get(apt.id) ?? { lane: 0, laneCount: 1 }
                        const widthPct = 100 / layout.laneCount
                        const leftPct = widthPct * layout.lane
                        const isFinalized = ['completado', 'no_asistio'].includes(apt.status)
                        const isConfirmed = ['confirmado', 'completado'].includes(apt.status)
                        const isHighlighted = highlightId === apt.id
                        const tone = index % 2 === 0 ? color.bg : color.bgAlt

                        return (
                          <button
                            key={apt.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelectAppointment(apt)
                            }}
                            className={`absolute rounded-lg border-l-4 px-2.5 py-1.5 text-left overflow-hidden transition-all hover:z-10 hover:shadow-lg ${color.border} ${
                              isFinalized ? 'bg-zinc-800/40 opacity-60' : tone
                            } ${isHighlighted ? 'ring-2 ring-white/60 z-10' : ''}`}
                            style={{
                              top: top + 2,
                              height: height - 4,
                              left: `calc(${leftPct}% + 3px)`,
                              width: `calc(${widthPct}% - 6px)`,
                            }}
                          >
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-300">
                              {isConfirmed && <Check className="w-3 h-3 shrink-0" />}
                              <span>{minutesToLabel(startMin)}</span>
                            </div>
                            <p className="text-sm font-bold text-white truncate leading-tight">
                              {apt.customer_name}
                            </p>
                            {height > 52 && (
                              <p className="text-xs text-zinc-400 truncate">
                                {apt.service?.name || 'Servicio general'}
                              </p>
                            )}
                          </button>
                        )
                      })}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
