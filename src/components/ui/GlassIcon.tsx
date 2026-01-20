/**
 * GlassIcon Component
 * Creates a beautiful 3D-like glass container for icons
 */
'use client'

import { LucideIcon } from 'lucide-react'
import React from 'react'
import { cn } from '@/lib/utils'

interface GlassIconProps {
  icon: LucideIcon
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'success' | 'warning'
}

export function GlassIcon({ 
  children, 
  className, 
  size = 'md',
  variant = 'primary'
}: {
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'success' | 'warning'
}) {
  
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  const variantColors = {
    primary: 'text-cyan-300',
    secondary: 'text-fuchsia-300',
    success: 'text-emerald-300',
    warning: 'text-rose-300',
  }

  return (
    <div className={cn('relative flex items-center justify-center rounded-2xl glass-midnight overflow-hidden', sizeClasses[size], className)}>
      {/* Background Glow */}
      <div className={cn(
        'absolute inset-0 opacity-20 blur-xl',
        variant === 'primary' && 'bg-cyan-400',
        variant === 'secondary' && 'bg-fuchsia-400',
        variant === 'success' && 'bg-emerald-400',
        variant === 'warning' && 'bg-rose-400',
      )} />

       {/* Icon Render */}
       {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            className: cn(
                'relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]', 
                iconSizes[size], 
                variantColors[variant], 
                (child.props as any).className
            )
          })
        }
        return child
      })}
    </div>
  )
}
