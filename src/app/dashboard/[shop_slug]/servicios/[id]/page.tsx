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
    return <div className="text-white">Cargando...</div>
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-4xl font-heading font-bold mb-8 text-white tracking-tight text-center">
        {isEdit ? 'Editar' : 'Nuevo'} Servicio
      </h2>

      <div className="glass-card-dark p-8 rounded-3xl relative overflow-hidden">
        {/* Glow Effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-pastel-blue/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Nombre del Servicio *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-12 rounded-xl border border-white/10 bg-slate-950/50 px-4 text-white placeholder:text-slate-600 focus:border-pastel-blue/50 focus:bg-white/5 focus:outline-none focus:ring-1 focus:ring-pastel-blue/50 transition-all duration-300"
              placeholder="Ej: Corte de Cabello Premium"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Duration */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Duración (min) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full h-12 rounded-xl border border-white/10 bg-slate-950/50 px-4 text-white placeholder:text-slate-600 focus:border-pastel-mint/50 focus:bg-white/5 focus:outline-none focus:ring-1 focus:ring-pastel-mint/50 transition-all duration-300"
                  min="5"
                  step="5"
                  required
                />
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <span className="text-xs font-medium text-slate-500">MIN</span>
                </div>
              </div>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Precio (opcional)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full h-12 rounded-xl border border-white/10 bg-slate-950/50 pl-8 pr-4 text-white placeholder:text-slate-600 focus:border-pastel-lavender/50 focus:bg-white/5 focus:outline-none focus:ring-1 focus:ring-pastel-lavender/50 transition-all duration-300"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-6">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold shadow-lg shadow-white/10 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {loading ? 'Guardando...' : 'Guardar Servicio'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 hover:text-white transition-all duration-300"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
