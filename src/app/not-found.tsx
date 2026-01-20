'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background pointer-events-none" />
      
      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow delay-1000" />

      <div className="w-full max-w-md relative z-10 animate-fade-in-up text-center">
        
        <div className="glass-card p-12 shadow-2xl border-t border-white/10 flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
          
          <h1 className="text-6xl font-bold font-heading mb-2 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">
            404
          </h1>
          
          <h2 className="text-2xl font-semibold mb-4 text-foreground">
            Página no encontrada
          </h2>
          
          <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
            Lo sentimos, la página que estás buscando no existe o ha sido movida.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <Link 
              href="/dashboard" 
              className="flex-1 rounded-lg bg-primary px-4 py-3 font-bold text-white shadow-lg shadow-blue-500/25 hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Ir al Inicio
            </Link>
            
            <button 
              onClick={() => router.back()}
              className="flex-1 rounded-lg glass hover:bg-white/5 px-4 py-3 font-medium text-foreground transition-all flex items-center justify-center gap-2 border border-white/10"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>
          </div>
        </div>
        
        <div className="mt-8 text-sm text-muted-foreground/50">
          Turnero SaaS &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}
