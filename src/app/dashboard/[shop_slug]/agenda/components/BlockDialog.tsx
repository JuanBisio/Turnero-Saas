'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Professional } from '../lib/types'

type Props = {
  professionals: Professional[]
  defaultProfessionalId?: string
  defaultStartTime?: string
  onClose: () => void
  onSubmit: (data: { professionalId: string; startTime: string; endTime: string; reason: string }) => Promise<void>
}

export function BlockDialog({ professionals, defaultProfessionalId, defaultStartTime, onClose, onSubmit }: Props) {
  const [loading, setLoading] = useState(false)

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card-dark p-8 max-w-md w-full relative overflow-hidden border border-white/10 shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 blur-[80px] rounded-full pointer-events-none" />

        <h3 className="text-2xl font-bold font-heading mb-6 text-white">Bloquear horario</h3>

        <form
          onSubmit={async (e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            const professionalId = formData.get('professional_id') as string
            const startTime = formData.get('start_time') as string
            const endTime = formData.get('end_time') as string
            const reason = formData.get('reason') as string

            if (!professionalId || !startTime || !endTime) {
              alert('Por favor completa todos los campos')
              return
            }

            setLoading(true)
            try {
              await onSubmit({ professionalId, startTime, endTime, reason })
            } finally {
              setLoading(false)
            }
          }}
          className="space-y-5"
        >
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">Profesional *</label>
            <select
              name="professional_id"
              defaultValue={defaultProfessionalId || ''}
              required
              className="w-full appearance-none rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-white/20"
            >
              <option value="" disabled className="bg-zinc-950">Seleccionar...</option>
              {professionals.map((prof) => (
                <option key={prof.id} value={prof.id} className="bg-zinc-950 text-white">
                  {prof.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">Hora inicio *</label>
            <input
              type="time"
              name="start_time"
              defaultValue={defaultStartTime}
              className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/20 focus:bg-white/[0.08] transition-all [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">Hora fin *</label>
            <input
              type="time"
              name="end_time"
              className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/20 focus:bg-white/[0.08] transition-all [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">Motivo (opcional)</label>
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
              onClick={onClose}
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
  )
}
