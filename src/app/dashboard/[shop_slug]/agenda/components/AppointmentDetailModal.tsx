'use client'

import { motion } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { X, Phone } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getProfessionalColor } from '@/lib/professionalColors'
import type { Appointment } from '../lib/types'

type Props = {
  appointment: Appointment
  onClose: () => void
  onStatusChange: (appointmentId: string, newStatus: string) => void
}

export function AppointmentDetailModal({ appointment, onClose, onStatusChange }: Props) {
  const color = getProfessionalColor(appointment.professional_id)

  return (
    <div
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card-dark p-8 max-w-md w-full relative overflow-hidden border border-white/10 shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <span className={`h-2.5 w-2.5 rounded-full ${color.dot}`} />
          <span className="text-sm font-medium text-zinc-400">{appointment.professional?.name}</span>
        </div>
        <h3 className="text-2xl font-bold font-heading text-white mb-1">
          {appointment.customer_name}
        </h3>
        <p className="text-zinc-400 mb-6">
          {format(parseISO(appointment.start_time), "EEEE d 'de' MMMM, HH:mm", { locale: es })} —{' '}
          {format(parseISO(appointment.end_time), 'HH:mm')}
        </p>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
            <span className="text-sm text-zinc-300">{appointment.service?.name || 'Servicio general'}</span>
          </div>
          {appointment.customer_phone && (
            <a
              href={`tel:${appointment.customer_phone}`}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors"
            >
              <Phone className="w-4 h-4 text-zinc-400" />
              <span className="text-sm text-zinc-300">{appointment.customer_phone}</span>
            </a>
          )}
        </div>

        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
          Estado del turno
        </label>
        <Select
          value={appointment.status}
          onValueChange={(newStatus) => onStatusChange(appointment.id, newStatus)}
        >
          <SelectTrigger className="w-full bg-white/[0.03] border-white/10 text-zinc-200 h-11 rounded-xl focus:ring-1 focus:ring-white/20 backdrop-blur-md hover:bg-white/[0.06] transition-colors">
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
      </motion.div>
    </div>
  )
}
