'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { DashboardSidebar } from '@/components/dashboard/layout/DashboardSidebar'

interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isTablet, setIsTablet] = useState(false)

  // Handle screen resize to detect tablet mode
  useEffect(() => {
    const handleResize = () => {
      // Tablet range: >= 640px and < 1024px
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024)
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false)
      }
    }

    // Initial check
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-black/90">
      {/* 
        SIDEBAR 
        - Desktop: Fixed w-72
        - Tablet: Fixed w-20 (Collapsed) 
        - Mobile: Hidden by default, absolute overlay when open
      */}
      
      {/* Mobile Overlay Backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Wrapper */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transition-all duration-300
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isTablet ? 'lg:w-20' : 'lg:w-72'}
      `}>
        <DashboardSidebar isTablet={isTablet} />
      </div>

      {/* 
        MAIN CONTENT 
        - Left margin adjusts based on sidebar width in desktop/tablet
      */}
      <div className={`
        flex flex-1 flex-col overflow-hidden transition-all duration-300
        ${isTablet ? 'lg:ml-20' : 'lg:ml-72'} 
        w-full
      `}>
        {/* Mobile Header with Hamburger */}
        <header className="flex items-center justify-between p-4 lg:hidden border-b border-white/10 bg-black/20 backdrop-blur-md">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 text-zinc-400 hover:text-white transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-heading font-bold text-white text-lg">Menu</span>
          <div className="w-8" /> {/* Spacer for centering if needed */}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8">
            {children}
        </main>
      </div>
    </div>
  )
}
