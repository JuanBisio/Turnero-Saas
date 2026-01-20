/**
 * Cancellation Page
 * Allows customers to cancel their appointment using the token
 */

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CancellationForm } from '@/components/widget/CancellationForm'

export default async function CancellationPage({
  params,
}: {
  params: Promise<{ shop_slug: string; token: string }>
}) {
  const { shop_slug, token } = await params
  const supabase = await createClient()

  // Find appointment by cancellation token
  const { data: appointment, error } = await supabase
    .from('appointments')
    .select(`
      *,
      professional:professionals(id, name),
      service:services(id, name, duration_minutes),
      shop:shops(id, name, slug, timezone, webhook_url, webhook_enabled)
    `)
    .eq('cancellation_token', token)
    .single()

  if (error || !appointment) {
    notFound()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <CancellationForm appointment={appointment} token={token} />
    </div>
  )
}
