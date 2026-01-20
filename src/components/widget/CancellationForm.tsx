/**
 * Cancellation Form Component
 * Handles appointment cancellation with webhook trigger
 */

'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function CancellationForm({ appointment, token }: { appointment: any; token: string }) {
  const [loading, setLoading] = useState(false)
  const [cancelled, setCancelled] = useState(appointment.status === 'cancelado')
  const [error, setError] = useState<string | null>(null)

  const handleCancel = async () => {
    if (!confirm('¿Estás seguro que deseas cancelar este turno?')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/v1/appointments/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (response.ok) {
        setCancelled(true)
      } else {
        setError(data.error || 'Error al cancelar el turno')
      }
    } catch (err) {
      setError('Error de conexión. Por favor intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const startTime = new Date(appointment.start_time)

  if (cancelled) {
    return (
      <div className="max-w-md w-full rounded-lg border bg-card p-6 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold mb-2">Turno Cancelado</h2>
        <p className="text-muted-foreground">
          Tu turno ha sido cancelado exitosamente.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-md w-full rounded-lg border bg-card p-6">
      <h2 className="text-2xl font-bold mb-4">Cancelar Turno</h2>
      
      <div className="space-y-3 mb-6">
        <div>
          <p className="text-sm text-muted-foreground">Servicio</p>
          <p className="font-semibold">{appointment.service?.name}</p>
        </div>
        
        <div>
          <p className="text-sm text-muted-foreground">Profesional</p>
          <p className="font-semibold">{appointment.professional?.name}</p>
        </div>
        
        <div>
          <p className="text-sm text-muted-foreground">Fecha y Hora</p>
          <p className="font-semibold">
            {format(startTime, "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })}
          </p>
        </div>
        
        <div>
          <p className="text-sm text-muted-foreground">Cliente</p>
          <p className="font-semibold">{appointment.customer_name}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <button
        onClick={handleCancel}
        disabled={loading}
        className="w-full rounded-lg bg-destructive px-4 py-3 font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
      >
        {loading ? 'Cancelando...' : 'Confirmar Cancelación'}
      </button>
      
      <p className="text-xs text-muted-foreground mt-4 text-center">
        Esta acción no se puede deshacer
      </p>
    </div>
  )
}
