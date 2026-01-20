/**
 * Glass Card Component
 * Modern glassmorphism card with blur effect
 */

import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export function GlassCard({ children, className, hover = false }: GlassCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/20',
        'bg-white/10 backdrop-blur-lg',
        'shadow-xl',
        'dark:bg-white/5 dark:border-white/10',
        hover && 'card-hover cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  )
}
