/**
 * Step 5: Customer Form with CAPTCHA
 */

'use client'

import { useState } from 'react'
import { useBooking } from '../BookingProvider'
import { useShop } from '@/components/providers/ShopProvider'
import { Turnstile } from '@marsidev/react-turnstile'
import { createClient } from '@/lib/supabase/client'

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
      
      // Reset form after 3 seconds
      setTimeout(() => {
        dispatch({ type: 'RESET' })
        setSuccess(false)
      }, 3000)
    } catch (error) {
      console.error('Error creating appointment:', error)
      alert('Error al crear la reserva. Por favor intenta nuevamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">✅</div>
        <h3 className="text-2xl font-bold text-primary mb-2">
          ¡Reserva Confirmada!
        </h3>
        <p className="text-muted-foreground">
          Te enviamos un email de confirmación a {email}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Nombre completo *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border bg-background px-4 py-2"
          placeholder="Juan Pérez"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Teléfono *
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-lg border bg-background px-4 py-2"
          placeholder="+54 9 11 1234-5678"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Email *
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border bg-background px-4 py-2"
          placeholder="juan@example.com"
          required
        />
      </div>

      {/* CAPTCHA */}
      <div className="flex justify-center py-4">
        <Turnstile
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
          onSuccess={(token) => {
            dispatch({ type: 'SET_CAPTCHA_TOKEN', token })
          }}
        />
      </div>

      <button
        type="submit"
        disabled={!state.captchaToken || submitting}
        className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Confirmando...' : 'Confirmar Reserva'}
      </button>
    </form>
  )
}
