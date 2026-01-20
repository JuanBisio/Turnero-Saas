/**
 * Soft-UI Dashboard Sidebar
 * With glassmorphism and Framer Motion animations
 */

'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useShop } from '@/components/providers/ShopProvider'
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Briefcase,
  Settings,
  LogOut
} from 'lucide-react'
import { motion } from 'framer-motion'

export function DashboardSidebar() {
  const { shopData } = useShop()
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
    <aside className="w-72 h-screen sticky top-0 z-50 flex flex-col relative overflow-hidden transition-all duration-300">
      {/* Unified Glass Background Layer */}
      <div className="absolute inset-0 bg-white/[0.015] backdrop-blur-3xl border-r border-white/5" />

      {/* Logo/Brand */}
      <div className="relative z-10 p-8 mb-6">
        <h2 className="text-2xl font-bold font-heading gradient-text truncate">
          {shopData?.name || 'Turnero'}
        </h2>
        <p className="text-xs text-zinc-400 mt-1 truncate">
          {shopData?.slug ? `/${shopData.slug}` : 'Sistema de Turnos'}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = item.exact 
            ? pathname === item.href
            : isActive(item.href)

          // Determine icon glow color based on item name (just for variety or consistent pastel)
          // Using cyan/emerald/fuchsia as requested
          let glowClass = "glow-cyan"
          if (item.name === 'Agenda') glowClass = "glow-emerald"
          if (item.name === 'Profesionales') glowClass = "glow-fuchsia"
          if (item.name === 'Servicios') glowClass = "glow-rose"

          return (
            <Link key={item.name} href={item.href}>
              <motion.div
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-300 relative overflow-hidden group ${
                  active
                    ? 'bg-white/10 text-white font-medium shadow-[0_0_20px_rgba(255,255,255,0.05)] border border-white/10'
                    : 'text-zinc-500 hover:text-white hover:bg-white/5'
                }`}
              >
                {/* Active Indicator Glow */}
                {active && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] rounded-r-full" />
                )}

                <Icon className={`h-5 w-5 transition-all duration-300 ${
                  active 
                    ? `text-white ${glowClass}` 
                    : 'text-zinc-600 group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]'
                }`} />
                <span className={active ? 'text-glow-white' : ''}>{item.name}</span>
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* Logout section */}
      <div className="p-4 border-t border-white/5">
        <form action="/api/auth/signout" method="POST">
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Cerrar sesión</span>
          </motion.button>
        </form>
      </div>
    </aside>
  )
}
