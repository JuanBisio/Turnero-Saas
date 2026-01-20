/**
 * PageWrapper with AnimatePresence
 * Smooth page transitions for dashboard navigation
 */

'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

const springTransition = {
  type: 'spring' as 'spring',
  stiffness: 300,
  damping: 30,
}

const pageVariants = {
  initial: {
    opacity: 0,
    x: 20,
  },
  animate: {
    opacity: 1,
    x: 0,
  },
  exit: {
    opacity: 0,
    x: -20,
  },
}

interface PageWrapperProps {
  children: ReactNode
}

export function PageWrapper({ children }: PageWrapperProps) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={springTransition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
