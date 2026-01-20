/**
 * Profesionales Page
 * List and manage professionals
 */

'use client'

import { useState, useEffect } from 'react'
import { useShop } from '@/components/providers/ShopProvider'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Professional = {
  id: string
  name: string
  buffer_time_minutes: number
  is_active: boolean
}

export default function ProfesionalesPage() {
  const { shopId, shopData } = useShop()
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (shopId) {
      console.log('Fetching professionals for shopId:', shopId)
      fetchProfessionals()
    } else {
      console.log('No shopId yet, waiting...')
    }
  }, [shopId])

  async function fetchProfessionals() {
    console.log('Starting fetchProfessionals, shopId:', shopId)
    
    const { data, error } = await supabase
      .from('professionals')
      .select('*')
      .eq('shop_id', shopId)
      .order('name')

    console.log('Fetch result:', { data, error, count: data?.length })

    if (error) {
      console.error('Error fetching professionals:', error)
      alert(`Error: ${error.message}`)
    }

    if (data) {
      setProfessionals(data)
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar este profesional?')) return

    const { error } = await supabase
      .from('professionals')
      .delete()
      .eq('id', id)

    if (!error) {
      fetchProfessionals()
    }
  }

  if (loading) {
    return <div>Cargando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Profesionales</h2>
          <p className="text-muted-foreground">
            Administra los profesionales de {shopData?.name}
          </p>
        </div>
        <Link
          href={`/dashboard/${shopData?.slug}/profesionales/nuevo`}
          className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Nuevo Profesional
        </Link>
      </div>

      {professionals.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            No hay profesionales. Crea el primero para empezar.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {professionals.map((prof) => (
            <div
              key={prof.id}
              className="flex items-center justify-between rounded-lg border bg-card p-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-xl font-semibold">
                  {prof.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold">{prof.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Buffer: {prof.buffer_time_minutes} min
                    {!prof.is_active && ' · Inactivo'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/dashboard/${shopData?.slug}/profesionales/${prof.id}`}
                  className="rounded-lg border px-3 py-1 text-sm hover:bg-accent"
                >
                  Editar
                </Link>
                <button
                  onClick={() => handleDelete(prof.id)}
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
