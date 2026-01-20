/**
 * Modern Dashboard Sidebar
 * With lucide-react icons and glassmorphism
 */

'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Briefcase,
  Settings,
  LogOut
} from 'lucide-react'

export function DashboardSidebar() {
  const pathname = usePathname()
  
  // Extract shop_slug from pathname
  const shopSlug = pathname.split('/')[2] || ''

  const isActive = (path: string) => {
    return pathname.includes(path)
  }

  const navItems = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      href: `/dashboard/${shopSlug}`,
      exact: true
    },
    {
      name: 'Agenda',
      icon: Calendar,
      href: `/dashboard/${shopSlug}/agenda`,
    },
    {
      name: 'Profesionales',
      icon: Users,
      href: `/dashboard/${shopSlug}/profesionales`,
    },
    {
      name: 'Servicios',
      icon: Briefcase,
      href: `/dashboard/${shopSlug}/servicios`,
    },
    {
      name: 'Configuración',
      icon: Settings,
      href: `/dashboard/${shopSlug}/configuracion`,
    },
  ]

  return (
    <aside className="w-64 border-r border-white/10 flex flex-col backdrop-blur-md bg-black/20">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-white/10">
        <h2 className="text-2xl font-bold font-heading gradient-text">
          Turnero
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Sistema de Turnos
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = item.exact 
            ? pathname === item.href
            : isActive(item.href)

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 group relative overflow-hidden ${
                active
                  ? 'text-white'
                  : 'text-muted-foreground hover:text-white hover:bg-white/5'
              }`}
            >
              {active && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-transparent border-l-2 border-blue-500" />
              )}
              
              <Icon className={`h-5 w-5 relative z-10 ${active ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : ''}`} />
              <span className="font-medium relative z-10">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Logout section */}
      <div className="p-4 border-t border-white/10">
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Cerrar sesión</span>
          </button>
        </form>
      </div>
    </aside>
  )
}
