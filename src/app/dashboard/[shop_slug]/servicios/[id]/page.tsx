/**
 * Create/Edit Service Form
 */

'use client'

import { useState, useEffect } from 'react'
import { useShop } from '@/components/providers/ShopProvider'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ServiceFormPage({
  params,
}: {
  params: Promise<{ shop_slug: string; id: string }>
}) {
  const [resolvedParams, setResolvedParams] = useState<{ shop_slug: string; id: string } | null>(null)
  const { shopId } = useShop()
  const [name, setName] = useState('')
  const [duration, setDuration] = useState(30)
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    params.then(setResolvedParams)
  }, [params])

  const isEdit = resolvedParams?.id !== 'nuevo'

  useEffect(() => {
    if (isEdit && resolvedParams?.id && shopId) {
      fetchService()
    }
  }, [isEdit, resolvedParams?.id, shopId])

  async function fetchService() {
    if (!resolvedParams?.id) return

    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('id', resolvedParams.id)
      .single()

    if (data) {
      setName(data.name)
      setDuration(data.duration_minutes)
      setPrice(data.price?.toString() || '')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!shopId || !resolvedParams) return

    setLoading(true)

    try {
      const serviceData = {
        name,
        duration_minutes: duration,
        price: price ? parseFloat(price) : null,
      }

      if (isEdit) {
        await supabase
          .from('services')
          .update(serviceData)
          .eq('id', resolvedParams.id)
      } else {
        await supabase
          .from('services')
          .insert({
            ...serviceData,
            shop_id: shopId,
          })
      }

      router.push(`/dashboard/${resolvedParams.shop_slug}/servicios`)
    } catch (error) {
      console.error('Error saving service:', error)
      alert('Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  if (!resolvedParams) {
    return <div>Cargando...</div>
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-3xl font-bold mb-6">
        {isEdit ? 'Editar' : 'Nuevo'} Servicio
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-2">Nombre *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border bg-background px-4 py-2"
            placeholder="Ej: Corte de Cabello"
            required
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Duración (minutos) *
          </label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            className="w-full rounded-lg border bg-background px-4 py-2"
            min="5"
            step="5"
            required
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Precio (opcional)
          </label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-lg border bg-background px-4 py-2"
            placeholder="0.00"
            step="0.01"
            min="0"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border px-4 py-2 hover:bg-accent"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
