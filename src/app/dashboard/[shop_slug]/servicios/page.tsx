/**
 * Servicios Page
 * List and manage services
 */

'use client'

import { useState, useEffect } from 'react'
import { useShop } from '@/components/providers/ShopProvider'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Service = {
  id: string
  name: string
  duration_minutes: number
  price: number | null
}

export default function ServiciosPage() {
  const { shopId, shopData } = useShop()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (shopId) {
      fetchServices()
    }
  }, [shopId])

  async function fetchServices() {
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('shop_id', shopId)
      .order('name')

    if (data) {
      setServices(data)
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar este servicio?')) return

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id)

    if (!error) {
      fetchServices()
    }
  }

  if (loading) {
    return <div className="text-white">Cargando...</div>
  }

  return (
    <div className="space-y-8 p-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-bold font-heading text-white text-glow mb-2">Servicios</h2>
          <p className="text-slate-400">
            Administra los servicios de {shopData?.name}
          </p>
        </div>
        <Link
          href={`/dashboard/${shopData?.slug}/servicios/nuevo`}
          className="px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold shadow-lg shadow-white/10 transition-all duration-300 hover:-translate-y-0.5"
        >
          + Nuevo Servicio
        </Link>
      </div>

      {services.length === 0 ? (
        <div className="glass-card-dark rounded-3xl p-12 text-center">
          <p className="text-slate-400 text-lg">
            No hay servicios. Crea el primero para empezar.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {services.map((service) => (
            <div
              key={service.id}
              className="glass-card-dark p-6 rounded-2xl flex items-center justify-between group hover:-translate-y-1 transition-all duration-300"
            >
              <div>
                <h3 className="font-semibold text-lg text-white mb-1 group-hover:text-pastel-blue transition-colors">{service.name}</h3>
                <p className="text-sm text-slate-400 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-slate-300">
                    {service.duration_minutes} min
                  </span>
                  {service.price && (
                    <span className="text-pastel-mint font-medium">
                      ${service.price}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  href={`/dashboard/${shopData?.slug}/servicios/${service.id}`}
                  className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-slate-300 hover:text-white transition-all duration-300 text-sm"
                >
                  Editar
                </Link>
                <button
                  onClick={() => handleDelete(service.id)}
                  className="px-4 py-2 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all duration-300 text-sm"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
