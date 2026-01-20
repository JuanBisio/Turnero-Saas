/**
 * Booking Reducer
 * Manages state transitions for the booking flow
 */

import { BookingState, BookingAction, initialBookingState } from './types'

export function bookingReducer(
  state: BookingState,
  action: BookingAction
): BookingState {
  switch (action.type) {
    case 'SELECT_SERVICE':
      return {
        ...state,
        selectedService: action.service,
      }

    case 'SELECT_PROFESSIONAL':
      return {
        ...state,
        selectedProfessional: action.professional,
      }

    case 'SELECT_DATE':
      return {
        ...state,
        selectedDate: action.date,
        selectedTime: null, // Reset time when date changes
      }

    case 'SELECT_TIME':
      return {
        ...state,
        selectedTime: action.time,
      }

    case 'UPDATE_CUSTOMER_DATA':
      return {
        ...state,
        ...action.data,
      }

    case 'SET_CAPTCHA_TOKEN':
      return {
        ...state,
        captchaToken: action.token,
      }

    case 'NEXT_STEP':
      if (state.currentStep < 5) {
        return {
          ...state,
          currentStep: (state.currentStep + 1) as typeof state.currentStep,
        }
      }
      return state

    case 'PREV_STEP':
      if (state.currentStep > 1) {
        return {
          ...state,
          currentStep: (state.currentStep - 1) as typeof state.currentStep,
        }
      }
      return state

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.isLoading,
      }

    case 'SET_ERROR':
      return {
        ...state,
        error: action.error,
        isLoading: false,
      }

    case 'RESET':
      return initialBookingState

    default:
      return state
  }
}
