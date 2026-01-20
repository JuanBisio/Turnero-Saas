/**
 * Log webhook attempt to database
 */

import { createClient } from '@/lib/supabase/server'

export async function logWebhook(params: {
  shopId: string
  eventType: string
  payload: any
  url: string
  statusCode?: number
  success: boolean
  errorMessage?: string
  attempts: number
}) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('webhook_logs').insert({
    shop_id: params.shopId,
    event_type: params.eventType,
    payload: params.payload,
    url: params.url,
    status_code: params.statusCode,
    success: params.success,
    error_message: params.errorMessage,
    attempts: params.attempts,
  })

  if (error) {
    console.error('Failed to log webhook:', error)
  }
}
