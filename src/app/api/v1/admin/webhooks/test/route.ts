/**
 * API Route: Test Webhook
 * POST /api/v1/admin/webhooks/test
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWebhookSecret, buildTestPayload, sendWebhook } from '@/lib/webhooks/webhookUtils'
import { logWebhook } from '@/lib/webhooks/logWebhook'

export async function POST(request: NextRequest) {
  try {
    const { shopId } = await request.json()

    if (!shopId) {
      return NextResponse.json(
        { error: 'Missing shopId' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get shop
    const { data: shop, error } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single()

    if (error || !shop) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    if (!shop.webhook_url) {
      return NextResponse.json(
        { error: 'No webhook URL configured' },
        { status: 400 }
      )
    }

    // Build and send test payload
    const webhookPayload = buildTestPayload(shop)
    const webhookSecret = generateWebhookSecret(shop.id)
    const result = await sendWebhook(shop.webhook_url, webhookPayload, webhookSecret)

    // Log webhook
    await logWebhook({
      shopId: shop.id,
      eventType: 'webhook.test',
      payload: webhookPayload,
      url: shop.webhook_url,
      statusCode: result.statusCode,
      success: result.success,
      errorMessage: result.error,
      attempts: result.attempts,
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test webhook sent successfully',
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send webhook',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in test webhook API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
