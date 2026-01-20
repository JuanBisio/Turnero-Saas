/**
 * Booking Context Provider
 * Manages state for the booking widget
 */

'use client'

import { createContext, useContext, useReducer } from 'react'
import { BookingState, BookingAction, initialBookingState } from './types'
import { bookingReducer } from './bookingReducer'

interface BookingContextType {
  state: BookingState
  dispatch: React.Dispatch<BookingAction>
}

const BookingContext = createContext<BookingContextType | undefined>(undefined)

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(bookingReducer, initialBookingState)

  return (
    <BookingContext.Provider value={{ state, dispatch }}>
      {children}
    </BookingContext.Provider>
  )
}

export function useBooking() {
  const context = useContext(BookingContext)
  if (context === undefined) {
    throw new Error('useBooking must be used within a BookingProvider')
  }
  return context
}
