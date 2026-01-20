/**
 * KPI Card Component
 * Display key metrics with trend indicators and glassmorphism style
 */

import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlassIcon } from '@/components/ui/GlassIcon'

interface KPICardProps {
  title: string
  value: string
  icon: LucideIcon
  change?: number
  trendLabel?: string
  className?: string
  iconVariant?: 'primary' | 'secondary' | 'success' | 'warning'
}

export function KPICard({
  title,
  value,
  icon: Icon,
  change: trend,
  trendLabel,
  className,
  iconVariant = 'primary'
}: KPICardProps) {
  return (
    <div className={cn("glass-card p-6 flex items-start justify-between relative overflow-hidden group", className)}>
      {/* Background Glow on Hover */}
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500" />
      
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
        <h3 className="text-3xl font-bold font-heading tracking-tight mb-2 text-foreground">{value}</h3>
        
        {trend !== undefined && (
          <div className="flex items-center gap-2 text-xs">
            <span className={cn(
              "flex items-center px-1.5 py-0.5 rounded-full font-medium",
              trend > 0 ? "bg-emerald-500/10 text-emerald-400" : 
              trend < 0 ? "bg-rose-500/10 text-rose-400" : 
              "bg-slate-500/10 text-slate-400"
            )}>
              {trend > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : 
               trend < 0 ? <TrendingDown className="w-3 h-3 mr-1" /> : 
               <Minus className="w-3 h-3 mr-1" />}
              {Math.abs(trend)}%
            </span>
            <span className="text-muted-foreground">{trendLabel || 'vs. periodo anterior'}</span>
          </div>
        )}
      </div>

      <GlassIcon variant={iconVariant} size="md">
        <Icon />
      </GlassIcon>
    </div>
  )
}
