/**
 * Soft-UI KPI Card Component
 * Display key metrics with glassmorphism and Framer Motion animations
 */

'use client'

import { LucideIcon, TrendingUp, TrendingDown, Minus, Calendar, DollarSign, CheckCircle, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlassIcon } from '@/components/ui/GlassIcon'

// Icon mapping to avoid serialization issues
const iconMap: Record<string, LucideIcon> = {
  Calendar,
  DollarSign,
  CheckCircle,
  Users,
}

interface KPICardProps {
  title: string
  value: string
  icon: string  // Changed from LucideIcon to string
  change?: number
  trendLabel?: string
  className?: string
  iconVariant?: 'primary' | 'secondary' | 'success' | 'warning'
}

export function KPICard({
  title,
  value,
  icon: iconName,
  change: trend,
  trendLabel,
  className,
  iconVariant = 'primary'
}: KPICardProps) {
  const Icon = iconMap[iconName] || Calendar  // Fallback to Calendar if not found
  
  return (
    <div
      className={cn(
        "relative overflow-hidden group h-full flex flex-col justify-between p-8",
        className
      )}
    >
      {/* Soft gradient overlay */}
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10 flex flex-col h-full justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-400 mb-2 uppercase tracking-wider">{title}</p>
          <h3 className="text-5xl font-bold font-heading tracking-tight text-white text-glow">
            {value}
          </h3>
        </div>
        
        
        {trend !== undefined && (
          <div className="flex items-center gap-2 text-xs mt-4">
            <span className={cn(
              "flex items-center px-2.5 py-1 rounded-full font-bold backdrop-blur-md shadow-sm border",
              trend > 0 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(52,211,153,0.2)]" : 
              trend < 0 ? "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(251,113,133,0.2)]" : 
              "bg-zinc-800/30 text-zinc-400 border-white/10"
            )}>
              {trend > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : 
               trend < 0 ? <TrendingDown className="w-3 h-3 mr-1" /> : 
               <Minus className="w-3 h-3 mr-1" />}
              {Math.abs(trend)}%
            </span>
            <span className="text-zinc-500 font-medium">{trendLabel || 'vs. periodo anterior'}</span>
          </div>
        )}
      </div>

      <div className="absolute bottom-5 right-5 opacity-90 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110 group-hover:-rotate-12">
        <GlassIcon variant={iconVariant} size="lg">
          <Icon className={cn(
            "drop-shadow-lg", 
            iconVariant === 'primary' && "glow-icon-blue",
            iconVariant === 'secondary' && "glow-icon-mint",
            iconVariant === 'success' && "glow-icon-lavender",
            iconVariant === 'warning' && "glow-icon-rose"
          )}/>
        </GlassIcon>
      </div>
    </div>
  )
}
