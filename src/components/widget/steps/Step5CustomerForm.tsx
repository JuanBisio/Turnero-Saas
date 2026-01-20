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

// Helper to format WhatsApp message
function getWhatsAppLink(phone: string, text: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}

  // Update success view
  if (success) {
    const waText = `Hola! Quiero confirmar mi turno:\n\n📅 Fecha: ${state.selectedDate}\n⏰ Hora: ${state.selectedTime}\n👤 Nombre: ${name}\n✨ Servicio: ${state.selectedService?.name}\n\nGracias!`
    const waLink = getWhatsAppLink('5493584014857', waText)

    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">✅</div>
        <h3 className="text-2xl font-bold text-primary mb-2">
          ¡Reserva Procesada!
        </h3>
        <p className="text-muted-foreground mb-6">
          Para finalizar, confirma tu turno enviándonos el siguiente mensaje por WhatsApp.
        </p>
        
        <a 
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-6 py-3 font-bold text-white shadow-lg hover:bg-[#20bd5a] transition-all hover:scale-105"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
          Confirmar por WhatsApp
        </a>
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
          placeholder="tu@email.com"
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
