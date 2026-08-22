export type Professional = {
  id: string
  name: string
}

export type Service = {
  id: string
  name: string
}

export type Appointment = {
  id: string
  start_time: string
  end_time: string
  customer_name: string
  customer_phone: string
  status: string
  professional_id: string
  professional: Professional | null
  service: Service | null
}

export type Exception = {
  id: string
  professional_id: string
  specific_date: string
  start_time: string | null
  end_time: string | null
  reason: string
  is_blocked: boolean
}

export type Schedule = {
  professional_id: string
  day_of_week: number
  start_time: string
  end_time: string
}

export type ViewMode = 'dia' | 'semana' | 'mes'

export type LayoutMode = 'timeline' | 'clasica'
