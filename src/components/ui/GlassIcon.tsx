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
    primary: 'text-blue-400',
    secondary: 'text-cyan-400',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
  }

  return (
    <div className={cn('glass-icon', sizeClasses[size], className)}>
      {/* Glossy reflection effect is handled by CSS .glass-icon::before */}
      
      {/* Inner glow specific to variant */}
      <div className={cn(
        'absolute inset-0 opacity-20 blur-md',
        variant === 'primary' && 'bg-blue-500',
        variant === 'secondary' && 'bg-cyan-500',
        variant === 'success' && 'bg-emerald-500',
        variant === 'warning' && 'bg-amber-500',
      )} />

      {/* The Icon */}
      {/* cloneElement allows us to inject classes into the passed icon */}
       {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            className: cn('relative z-10 drop-shadow-md', iconSizes[size], variantColors[variant], (child.props as any).className)
          })
        }
        return child
      })}
    </div>
  )
}
