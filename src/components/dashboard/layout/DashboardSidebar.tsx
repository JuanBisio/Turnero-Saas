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


export function DashboardSidebar({ isTablet = false }: { isTablet?: boolean }) {
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
    <aside className={`h-full flex flex-col relative overflow-hidden transition-all duration-300 bg-black/40 backdrop-blur-xl border-r border-white/10 ${isTablet ? 'w-20' : 'w-72'}`}>
      {/* Unified Glass Background Layer */}
      <div className="absolute inset-0 bg-white/[0.015] pointer-events-none" />

      {/* Logo/Brand */}
      <div className={`relative z-10 flex items-center ${isTablet ? 'justify-center p-4 mb-2' : 'p-8 mb-6'}`}>
        {isTablet ? (
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
                <span className="font-bold text-white text-xl">T</span>
             </div>
        ) : (
            <div className="overflow-hidden">
                <h2 className="text-2xl font-bold font-heading gradient-text truncate">
                {shopData?.name || 'Turnero'}
                </h2>
                <p className="text-xs text-zinc-400 mt-1 truncate">
                {shopData?.slug ? `/${shopData.slug}` : 'Sistema de Turnos'}
                </p>
            </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 space-y-2 ${isTablet ? 'px-2' : 'px-4'}`}>
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
            <Link key={item.name} href={item.href} title={isTablet ? item.name : ''}>
              <motion.div
                whileHover={{ x: isTablet ? 0 : 4, scale: isTablet ? 1.05 : 1 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center ${isTablet ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'} rounded-xl transition-all duration-300 relative overflow-hidden group ${
                  active
                    ? 'bg-white/10 text-white font-medium shadow-[0_0_20px_rgba(255,255,255,0.05)] border border-white/10'
                    : 'text-zinc-500 hover:text-white hover:bg-white/5'
                }`}
              >
                {/* Active Indicator Glow */}
                {active && (
                  <div className={`absolute bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] rounded-r-full ${isTablet ? 'left-1 top-3 bottom-3 w-1 h-auto rounded-full' : 'left-0 top-0 bottom-0 w-1'}`} />
                )}

                <Icon className={`h-5 w-5 transition-all duration-300 ${
                  active 
                    ? `text-white ${glowClass}` 
                    : 'text-zinc-600 group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]'
                }`} />
                {!isTablet && <span className={active ? 'text-glow-white' : ''}>{item.name}</span>}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* Logout section */}
      <div className={`border-t border-white/5 ${isTablet ? 'p-2' : 'p-4'}`}>
        <form action="/api/auth/signout" method="POST">
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`flex w-full items-center ${isTablet ? 'justify-center p-3' : 'gap-3 px-4 py-3'} rounded-xl text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-colors`}
            title={isTablet ? 'Cerrar sesión' : ''}
          >
            <LogOut className="h-5 w-5" />
            {!isTablet && <span className="font-medium">Cerrar sesión</span>}
          </motion.button>
        </form>
      </div>
    </aside>
  )
}
