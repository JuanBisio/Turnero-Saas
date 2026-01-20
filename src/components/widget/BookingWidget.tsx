/**
 * Main Booking Widget Component
 * "Obsidian Glass" Design System
 */

'use client'

import { useBooking } from './BookingProvider'
import { useShop } from '@/components/providers/ShopProvider'
import { Calendar, ChevronLeft, Sparkles } from 'lucide-react'
import { Step1ServiceSelection } from './steps/Step1ServiceSelection'
import { Step2ProfessionalSelection } from './steps/Step2ProfessionalSelection'
import { Step3DateSelection } from './steps/Step3DateSelection'
import { Step4TimeSelection } from './steps/Step4TimeSelection'
import { Step5CustomerForm } from './steps/Step5CustomerForm'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export function BookingWidget() {
  const { state, dispatch } = useBooking()
  const { shopData } = useShop()

  return (
    <div className="w-full max-w-4xl relative">
      {/* Container with "Obsidian" depth - Mobile sensitive */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/80 shadow-[0_20px_60px_-15px_rgba(0,0,0,1),0_0_30px_-5px_rgba(255,255,255,0.07)] backdrop-blur-3xl">
        
        {/* Decorative Top Glow (Neutral) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-white/5 blur-[100px] pointer-events-none" />

        {/* Header */}
        <div className="relative border-b border-white/5 p-6 md:p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 border border-white/10 text-white shadow-sm">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold font-heading text-white tracking-tight">
                  Reservar Turno
                </h1>
                <p className="text-sm text-zinc-400 mt-0.5 font-medium">
                  {shopData?.name || 'Cargando...'}
                </p>
              </div>
            </div>
            
            {/* Step Counter (Mobile Visible) */}
            <div className="text-right">
              <span className="text-2xl font-bold text-white/90">0{state.currentStep}</span>
              <span className="text-zinc-600 text-sm font-medium">/05</span>
            </div>
          </div>
        </div>

        {/* "Light Line" Stepper (Minimalist White) */}
        <div className="relative w-full h-[1px] bg-white/5">
          <motion.div 
            className="absolute left-0 top-0 h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]"
            initial={{ width: '20%' }}
            animate={{ width: `${state.currentStep * 20}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>

        {/* Step Content with AnimatePresence */}
        <div className="p-6 md:p-8 min-h-[500px] relative">
          {state.error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-medium text-rose-300 flex items-center gap-2"
            >
              <span className="block w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              {state.error}
            </motion.div>
          )}
          
          {/* Back button */}
          {state.currentStep > 1 && state.currentStep <= 5 && (
            <button
              onClick={() => dispatch({ type: 'PREV_STEP' })}
              className="mb-6 flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-white transition-colors uppercase tracking-widest group"
            >
              <ChevronLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
              Volver
            </button>
          )}
          
          <AnimatePresence mode="wait">
            <motion.div
              key={state.currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-full"
            >
              {state.currentStep === 1 && <Step1ServiceSelection />}
              {state.currentStep === 2 && <Step2ProfessionalSelection />}
              {state.currentStep === 3 && <Step3DateSelection />}
              {state.currentStep === 4 && <Step4TimeSelection />}
              {state.currentStep === 5 && <Step5CustomerForm />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Glass Footer Summary (visible from step 2 onwards) */}
        {state.currentStep > 1 && (
          <div className="border-t border-white/5 bg-white/[0.01] p-4 md:px-8 backdrop-blur-md">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs md:text-sm">
              <div className="flex items-center gap-2 text-zinc-500">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>Resumen:</span>
              </div>
              
              {state.selectedService && (
                <div className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-zinc-700" />
                  <span className="text-zinc-400">Servicio:</span>
                  <span className="font-medium text-white">{state.selectedService.name}</span>
                </div>
              )}
              {state.selectedProfessional && (
                <div className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-zinc-700" />
                  <span className="text-zinc-400">Profesional:</span>
                  <span className="font-medium text-white">{state.selectedProfessional.name}</span>
                </div>
              )}
              {state.selectedDate && (
                <div className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-zinc-700" />
                  <span className="text-zinc-400">Fecha:</span>
                  <span className="font-medium text-white">{state.selectedDate}</span>
                </div>
              )}
              {state.selectedTime && (
                <div className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-zinc-700" />
                  <span className="text-zinc-400">Hora:</span>
                  <span className="font-medium text-white">{state.selectedTime}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Background decoration behind the modal (if needed for the page context) */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#050505] to-[#050505] pointer-events-none opacity-50" />
    </div>
  )
}
