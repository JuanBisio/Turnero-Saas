/**
 * Modern Dashboard Header
 * With search, notifications, and user menu
 */

'use client'

import { Search, Bell, User } from 'lucide-react'
import { useShop } from '@/components/providers/ShopProvider'

export function DashboardHeader() {
  const { shopData } = useShop()

  return (
    <header className="border-b border-white/10 px-6 py-4 backdrop-blur-sm bg-black/10">
      <div className="flex items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar..."
              className="w-full rounded-full border border-white/10 bg-white/5 pl-10 pr-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white/10 transition-all placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Shop name */}
          <div className="text-right mr-2">
            <p className="text-sm font-medium">{shopData?.name || 'Cargando...'}</p>
            <p className="text-xs text-muted-foreground">/{shopData?.slug}</p>
          </div>

          {/* Notifications */}
          <button className="relative rounded-lg p-2 hover:bg-white/5 transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
          </button>

          {/* User menu */}
          <button className="flex items-center gap-2 rounded-lg p-2 hover:bg-white/5 transition-colors">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <User className="h-4 w-4 text-white" />
            </div>
          </button>
        </div>
      </div>
    </header>
  )
}
