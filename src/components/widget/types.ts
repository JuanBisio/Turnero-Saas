/**
 * Booking State Types and Interfaces
 */

import { Database } from '@/lib/supabase/database.types'

type Service = Database['public']['Tables']['services']['Row']
type Professional = Database['public']['Tables']['professionals']['Row']

export interface BookingState {
  // Step 1: Service
  selectedService: Service | null
  
  // Step 2: Professional
  selectedProfessional: Professional | null
  
  // Step 3: Date
  selectedDate: string | null  // ISO date (YYYY-MM-DD)
  
  // Step 4: Time
  selectedTime: string | null  // HH:mm
  
  // Step 5: Customer Info
  customerName: string
  customerPhone: string
  customerEmail: string
  captchaToken: string | null
  
  // Control
  currentStep: 1 | 2 | 3 | 4 | 5
  isLoading: boolean
  error: string | null
}

export type BookingAction =
  | { type: 'SELECT_SERVICE'; service: Service }
  | { type: 'SELECT_PROFESSIONAL'; professional: Professional }
  | { type: 'SELECT_DATE'; date: string }
  | { type: 'SELECT_TIME'; time: string }
  | { type: 'UPDATE_CUSTOMER_DATA'; data: Partial<Pick<BookingState, 'customerName' | 'customerPhone' | 'customerEmail'>> }
  | { type: 'SET_CAPTCHA_TOKEN'; token: string }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'RESET' }

export const initialBookingState: BookingState = {
  selectedService: null,
  selectedProfessional: null,
  selectedDate: null,
  selectedTime: null,
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  captchaToken: null,
  currentStep: 1,
  isLoading: false,
  error: null,
}
