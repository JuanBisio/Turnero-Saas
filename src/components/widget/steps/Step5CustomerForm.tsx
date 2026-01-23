/**
 * Step 5: Customer Form with CAPTCHA
 * "Obsidian Glass" Style
 */

'use client'

import { useState } from 'react'
import { useBooking } from '../BookingProvider'
import { useShop } from '@/components/providers/ShopProvider'
import { Turnstile } from '@marsidev/react-turnstile'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { User, Phone, Mail, CheckCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Step5CustomerForm() {
  const { state, dispatch } = useBooking()
  const { shopId } = useShop()
  const [name, setName] = useState(state.customerName)
  const [phone, setPhone] = useState(state.customerPhone)
  const [email, setEmail] = useState(state.customerEmail)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!state.captchaToken) {
      alert('Por favor completa el CAPTCHA')
      return
    }

    if (!name || !phone || !email) {
      alert('Por favor completa todos los campos')
      return
    }

    setSubmitting(true)

    try {
      // Calculate end time
      const startDateTime = `${state.selectedDate}T${state.selectedTime}:00`
      const startDate = new Date(startDateTime)
      const endDate = new Date(
        startDate.getTime() +
          (state.selectedService!.duration_minutes +
            state.selectedProfessional!.buffer_time_minutes) *
            60000
      )

      // Generate cancellation token (browser-compatible)
      const cancellationToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .substring(0, 32)

      // Create appointment via API (bypasses RLS)
      const response = await fetch('/api/public/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: shopId,
          professional_id: state.selectedProfessional!.id,
          service_id: state.selectedService!.id,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          customer_name: name,
          customer_phone: phone,
          customer_email: email,
          cancellation_token: cancellationToken,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('API error:', result)
        alert(`Error: ${result.error || 'No se pudo crear la reserva'}`)
        return
      }

      console.log('Appointment created:', result.data)

      // Trigger webhook (fire and forget - handled by server)
      fetch('/api/v1/webhooks/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'appointment.created',
          appointmentId: result.data.id,
        }),
      }).catch(err => console.error('Webhook trigger failed:', err))

      setSuccess(true)
      
      // Reset form after a few seconds or let user confirm via WhatsApp
      // Kept user logic but extended success text visibility
    } catch (error) {
      console.error('Error creating appointment:', error)
      alert('Error al crear la reserva. Por favor intenta nuevamente.')
    } finally {
      setSubmitting(false)
    }
  }



  // Update success view
  if (success) {
    return (
      <div className="text-center py-12 flex flex-col items-center animate-in fade-in zoom-in duration-500">
        {/* Success Icon with Glow */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-emerald-500/30 blur-3xl rounded-full" />
          <div className="relative w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <CheckCircle className="w-12 h-12 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
          </div>
        </div>
        
        <h3 className="text-4xl font-bold text-white mb-4 font-heading tracking-tight">
          ¡Reserva Confirmada!
        </h3>
        
        <p className="text-zinc-400 text-lg mb-8 max-w-md leading-relaxed">
          ¡Listo! Recibirás una confirmación por WhatsApp en segundos.
        </p>
        
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 backdrop-blur-sm">
          <p className="text-sm text-zinc-500">
            Revisa tu teléfono para ver los detalles del turno.
          </p>
        </div>
      </div>
    )
  }


  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-white mb-2">tus datos</h2>
        <p className="text-zinc-400 text-sm">Completa tus datos para finalizar</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="group">
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 group-focus-within:text-white transition-colors">
            Nombre completo *
          </label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-white transition-colors" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-14 bg-white/[0.02] border-b border-white/10 px-12 text-white placeholder:text-zinc-700 focus:outline-none focus:border-white/30 focus:bg-white/[0.04] transition-all rounded-t-lg"
              placeholder="Leo Messi"
              required
            />
          </div>
        </div>

        <div className="group">
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 group-focus-within:text-white transition-colors">
            Teléfono *
          </label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-white transition-colors" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-14 bg-white/[0.02] border-b border-white/10 px-12 text-white placeholder:text-zinc-700 focus:outline-none focus:border-white/30 focus:bg-white/[0.04] transition-all rounded-t-lg"
              placeholder="+54 9 11 1234-5678"
              required
            />
          </div>
        </div>

        <div className="group">
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 group-focus-within:text-white transition-colors">
            Email *
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-white transition-colors" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-14 bg-white/[0.02] border-b border-white/10 px-12 text-white placeholder:text-zinc-700 focus:outline-none focus:border-white/30 focus:bg-white/[0.04] transition-all rounded-t-lg"
              placeholder="tu@email.com"
              required
            />
          </div>
        </div>

        {/* CAPTCHA */}
        <div className="flex justify-center py-4">
          <Turnstile
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
            onSuccess={(token) => {
              dispatch({ type: 'SET_CAPTCHA_TOKEN', token })
            }}
            options={{
              theme: 'dark',
            }}
          />
        </div>

        <motion.button
          type="submit"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={!state.captchaToken || submitting}
          className="w-full rounded-xl bg-white px-6 py-4 font-bold text-black shadow-lg hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all relative overflow-hidden"
        >
          {submitting ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-black" />
              <span>Confirmando...</span>
            </div>
          ) : (
            'Confirmar Reserva'
          )}
        </motion.button>
      </form>
    </div>
  )
}
