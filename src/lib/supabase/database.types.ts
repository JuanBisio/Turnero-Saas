export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      appointments: {
        Row: {
          id: string
          shop_id: string
          professional_id: string
          service_id: string | null
          start_time: string
          end_time: string
          customer_name: string
          customer_phone: string
          customer_email: string | null
          status: 'pendiente' | 'confirmado' | 'cancelado' | 'completado' | 'no_asistio'
          cancellation_token: string | null
          cancelled_by: 'customer' | 'admin' | null
          cancellation_reason: string | null
          cancelled_at: string | null
        }
        Insert: {
          id?: string
          shop_id: string
          professional_id: string
          service_id?: string | null
          start_time: string
          end_time: string
          customer_name: string
          customer_phone: string
          customer_email?: string | null
          status?: 'pendiente' | 'confirmado' | 'cancelado' | 'completado' | 'no_asistio'
          cancellation_token?: string | null
          cancelled_by?: 'customer' | 'admin' | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
        }
        Update: {
          id?: string
          shop_id?: string
          professional_id?: string
          service_id?: string | null
          start_time?: string
          end_time?: string
          customer_name?: string
          customer_phone?: string
          customer_email?: string | null
          status?: 'pendiente' | 'confirmado' | 'cancelado' | 'completado' | 'no_asistio'
          cancellation_token?: string | null
          cancelled_by?: 'customer' | 'admin' | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
        }
      }
      appointment_penalties: {
        Row: {
          id: string
          appointment_id: string
          shop_id: string
          penalty_percentage_applied: number
          penalty_amount: number
          payment_status: 'pendiente_pago' | 'pagado' | 'no_abonado'
          payment_link: string | null
          mp_preference_id: string | null
          reminders_sent: number
          last_reminder_at: string | null
          paid_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          appointment_id: string
          shop_id: string
          penalty_percentage_applied: number
          penalty_amount: number
          payment_status?: 'pendiente_pago' | 'pagado' | 'no_abonado'
          payment_link?: string | null
          mp_preference_id?: string | null
          reminders_sent?: number
          last_reminder_at?: string | null
          paid_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          appointment_id?: string
          shop_id?: string
          penalty_percentage_applied?: number
          penalty_amount?: number
          payment_status?: 'pendiente_pago' | 'pagado' | 'no_abonado'
          payment_link?: string | null
          mp_preference_id?: string | null
          reminders_sent?: number
          last_reminder_at?: string | null
          paid_at?: string | null
          created_at?: string
        }
      }
      exceptions: {
        Row: {
          id: string
          professional_id: string
          specific_date: string
          start_time: string | null
          end_time: string | null
          is_blocked: boolean
        }
        Insert: {
          id?: string
          professional_id: string
          specific_date: string
          start_time?: string | null
          end_time?: string | null
          is_blocked?: boolean
        }
        Update: {
          id?: string
          professional_id?: string
          specific_date?: string
          start_time?: string | null
          end_time?: string | null
          is_blocked?: boolean
        }
      }
      professionals: {
        Row: {
          id: string
          shop_id: string
          name: string
          buffer_time_minutes: number
          is_active: boolean
          inactive_reason: string | null
        }
        Insert: {
          id?: string
          shop_id: string
          name: string
          buffer_time_minutes?: number
          is_active?: boolean
          inactive_reason?: string | null
        }
        Update: {
          id?: string
          shop_id?: string
          name?: string
          buffer_time_minutes?: number
          is_active?: boolean
          inactive_reason?: string | null
        }
      }
      schedules: {
        Row: {
          id: string
          professional_id: string
          day_of_week: number
          start_time: string
          end_time: string
        }
        Insert: {
          id?: string
          professional_id: string
          day_of_week: number
          start_time: string
          end_time: string
        }
        Update: {
          id?: string
          professional_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
        }
      }
      services: {
        Row: {
          id: string
          shop_id: string
          name: string
          duration_minutes: number
          price: number | null
        }
        Insert: {
          id?: string
          shop_id: string
          name: string
          duration_minutes: number
          price?: number | null
        }
        Update: {
          id?: string
          shop_id?: string
          name?: string
          duration_minutes?: number
          price?: number | null
        }
      }
      shops: {
        Row: {
          id: string
          name: string
          slug: string
          domain: string | null
          api_key_n8n: string
          public_key: string
          theme: Json
          penalty_percentage: number
          free_cancellation_window_hours: number
          mp_access_token: string | null
          mp_user_id: string | null
          mp_connected_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          domain?: string | null
          api_key_n8n?: string
          public_key?: string
          theme?: Json
          penalty_percentage?: number
          free_cancellation_window_hours?: number
          mp_access_token?: string | null
          mp_user_id?: string | null
          mp_connected_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          domain?: string | null
          api_key_n8n?: string
          public_key?: string
          theme?: Json
          penalty_percentage?: number
          free_cancellation_window_hours?: number
          mp_access_token?: string | null
          mp_user_id?: string | null
          mp_connected_at?: string | null
          created_at?: string
        }
      }
    }
  }
}
