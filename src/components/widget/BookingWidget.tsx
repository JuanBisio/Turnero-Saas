/**
 * Main Booking Widget Component
 * Contains the stepper and all booking steps
 */

'use client'

import { useState } from 'react'
import { useBooking } from './BookingProvider'
import { useShop } from '@/components/providers/ShopProvider'
import { Calendar } from 'lucide-react'
import { Step1ServiceSelection } from './steps/Step1ServiceSelection'
import { Step2ProfessionalSelection } from './steps/Step2ProfessionalSelection'
import { Step3DateSelection } from './steps/Step3DateSelection'
import { Step4TimeSelection } from './steps/Step4TimeSelection'
import { Step5CustomerForm } from './steps/Step5CustomerForm'

export function BookingWidget() {
  const { state, dispatch } = useBooking()
  const { shopData } = useShop()

  return (
    <div className="w-full max-w-3xl">
      <div className="rounded-lg border bg-card shadow-lg">
        {/* Header */}
        <div className="border-b p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Reservar Turno</h1>
              <p className="text-sm text-muted-foreground">
                {shopData?.name || 'Cargando...'}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="border-b p-6">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    state.currentStep >= step
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step}
                </div>
                {step < 5 && (
                  <div
                    className={`h-0.5 w-8 md:w-16 ${
                      state.currentStep > step ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 text-center text-sm text-muted-foreground">
            {state.currentStep === 1 && 'Selecciona un servicio'}
            {state.currentStep === 2 && 'Elige tu profesional'}
            {state.currentStep === 3 && 'Selecciona una fecha'}
            {state.currentStep === 4 && 'Elige un horario'}
            {state.currentStep === 5 && 'Completa tus datos'}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6 min-h-[400px]">
          {state.error && (
            <div className="mb-4 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
              {state.error}
            </div>
          )}
          
          {/* Back button for steps 2-5 */}
          {state.currentStep > 1 && state.currentStep <= 5 && (
            <button
              onClick={() => dispatch({ type: 'PREV_STEP' })}
              className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>←</span>
              <span>Volver</span>
            </button>
          )}
          
          {state.currentStep === 1 && <Step1ServiceSelection />}
          {state.currentStep === 2 && <Step2ProfessionalSelection />}
          {state.currentStep === 3 && <Step3DateSelection />}
          {state.currentStep === 4 && <Step4TimeSelection />}
          {state.currentStep === 5 && <Step5CustomerForm />}
        </div>

        {/* Summary (visible from step 2 onwards) */}
        {state.currentStep > 1 && (
          <div className="border-t bg-muted/30 p-4 text-sm">
            <div className="flex flex-wrap gap-4">
              {state.selectedService && (
                <div>
                  <span className="text-muted-foreground">Servicio:</span>{' '}
                  <span className="font-medium">{state.selectedService.name}</span>
                </div>
              )}
              {state.selectedProfessional && (
                <div>
                  <span className="text-muted-foreground">Profesional:</span>{' '}
                  <span className="font-medium">{state.selectedProfessional.name}</span>
                </div>
              )}
              {state.selectedDate && (
                <div>
                  <span className="text-muted-foreground">Fecha:</span>{' '}
                  <span className="font-medium">{state.selectedDate}</span>
                </div>
              )}
              {state.selectedTime && (
                <div>
                  <span className="text-muted-foreground">Hora:</span>{' '}
                  <span className="font-medium">{state.selectedTime}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
