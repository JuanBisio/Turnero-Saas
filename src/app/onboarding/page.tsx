'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowRight, Lock } from 'lucide-react'
import { createShop, CreateShopState } from './actions'

const initialState: CreateShopState = { message: null, errors: {} }

export default function OnboardingPage() {
  const [state, formAction, isPending] = useActionState(createShop, initialState)
  const [loading, setLoading] = useState(true)
  const [slug, setSlug] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const router = useRouter()
  const supabase = createClient()

  // Detect Timezone on Mount
  useEffect(() => {
    try {
        const detectedZone = Intl.DateTimeFormat().resolvedOptions().timeZone
        if (detectedZone) setTimezone(detectedZone)
    } catch (e) {
        console.warn('Could not detect timezone', e)
    }
  }, [])

  // Initial Auth Check
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
      } else {
        setLoading(false)
      }
    })
  }, [])

  // Basic slug auto-gen helper (Client side only for UX)
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    const autoSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    setSlug(autoSlug)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center p-4">
      <Loader2 className="animate-spin h-8 w-8 text-primary" />
    </div>
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 animate-fade-in-up">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 font-heading tracking-tight">Bienvenido a Turnero</h1>
          <p className="text-muted-foreground text-lg">
            Configura tu espacio privado
          </p>
        </div>

        <div className="glass-card p-8 shadow-xl border-t border-white/10">
          <form action={formAction} className="space-y-6">
            
            {/* Business Name */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Nombre del Negocio
              </label>
              <input
                name="name"
                type="text"
                onChange={handleNameChange}
                placeholder="Ej: Peluquería Estilos"
                className="w-full glass rounded-lg px-4 py-3 bg-transparent text-lg focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all placeholder:text-muted-foreground/50"
              />
              {state.errors?.name && (
                <p className="text-xs text-red-400 mt-2 ml-1">{state.errors.name[0]}</p>
              )}
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-medium mb-2 text-muted-foreground">
                URL del Dashboard (Slug)
              </label>
              <div className="flex items-center">
                <span className="text-muted-foreground mr-2 text-sm">turnero.app/</span>
                <input
                  name="slug"
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="flex-1 glass rounded-lg px-3 py-2 bg-transparent text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none font-mono text-muted-foreground"
                />
              </div>
              {state.errors?.slug && (
                <p className="text-xs text-red-400 mt-2 ml-1">{state.errors.slug[0]}</p>
              )}
            </div>

            {/* Invite Code */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                Código de Invitación
              </label>
              <input
                name="inviteCode"
                type="text"
                placeholder="Ingresa tu código de acceso"
                className="w-full glass rounded-lg px-4 py-3 bg-transparent text-lg font-mono tracking-widest text-center uppercase focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all placeholder:text-muted-foreground/30 placeholder:tracking-normal placeholder:normal-case"
              />
               {state.errors?.inviteCode && (
                <p className="text-xs text-red-400 mt-2 ml-1 text-center font-bold">{state.errors.inviteCode[0]}</p>
              )}
            </div>

            {/* Timezone (Detected) */}
            <input type="hidden" name="timezone" value={timezone} />
            <div className="text-center">
                 <p className="text-xs text-muted-foreground bg-white/5 inline-block px-3 py-1 rounded-full border border-white/5">
                    🕛 Zona horaria detectada: <span className="text-primary font-medium">{timezone}</span>
                 </p>
                 {/* Fallback info in case detection is wrong (could make this editable in settings later) */}
            </div>

            {/* General Error */}
            {state.message && (
               <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                 {state.message}
               </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-lg bg-primary px-4 py-4 font-bold text-white shadow-lg shadow-blue-500/25 hover:bg-primary/90 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group"
            >
              {isPending ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  Verificando...
                </>
              ) : (
                <>
                  Crear Espacio
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  )
}
