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
        }
        Insert: {
          id?: string
          shop_id: string
          name: string
          buffer_time_minutes?: number
          is_active?: boolean
        }
        Update: {
          id?: string
          shop_id?: string
          name?: string
          buffer_time_minutes?: number
          is_active?: boolean
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
          created_at?: string
        }
      }
    }
  }
}
