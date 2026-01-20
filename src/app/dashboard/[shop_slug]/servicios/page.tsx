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
    return <div>Cargando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Servicios</h2>
          <p className="text-muted-foreground">
            Administra los servicios de {shopData?.name}
          </p>
        </div>
        <Link
          href={`/dashboard/${shopData?.slug}/servicios/nuevo`}
          className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Nuevo Servicio
        </Link>
      </div>

      {services.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            No hay servicios. Crea el primero para empezar.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {services.map((service) => (
            <div
              key={service.id}
              className="flex items-center justify-between rounded-lg border bg-card p-4"
            >
              <div>
                <h3 className="font-semibold text-lg">{service.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {service.duration_minutes} minutos
                  {service.price && ` · $${service.price}`}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/dashboard/${shopData?.slug}/servicios/${service.id}`}
                  className="rounded-lg border px-3 py-1 text-sm hover:bg-accent"
                >
                  Editar
                </Link>
                <button
                  onClick={() => handleDelete(service.id)}
                  className="rounded-lg border border-destructive px-3 py-1 text-sm text-destructive hover:bg-destructive/10"
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
