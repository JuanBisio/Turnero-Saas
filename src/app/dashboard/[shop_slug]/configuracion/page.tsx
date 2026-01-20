/**
 * Configuración Page
 * Shop settings and integrations configuration
 */

'use client'

import { useState, useEffect } from 'react'
import { useShop } from '@/components/providers/ShopProvider'
import { createClient } from '@/lib/supabase/client'

export default function ConfiguracionPage() {
  const { shopId, shopData, refetchShop } = useShop()
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookEnabled, setWebhookEnabled] = useState(false)
  const [webhookSecret, setWebhookSecret] = useState('')
  const [loading, setLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [webhookLogs, setWebhookLogs] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (shopData) {
      setWebhookUrl(shopData.webhook_url || '')
      setWebhookEnabled(shopData.webhook_enabled || false)
      
      // Generate webhook secret for display
      if (shopId) {
        const secret = generateWebhookSecretClient(shopId)
        setWebhookSecret(secret)
      }
    }
  }, [shopData, shopId])

  useEffect(() => {
    if (shopId) {
      fetchWebhookLogs()
    }
  }, [shopId])

  // Simple client-side secret generation (matches server)
  function generateWebhookSecretClient(id: string): string {
    return id.substring(0, 16) + '...'  // Simplified for display
  }

  async function fetchWebhookLogs() {
    if (!shopId) return

    const { data } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (data) {
      setWebhookLogs(data)
    }
  }

  async function handleSave() {
    if (!shopId) return

    setLoading(true)
    setMessage(null)

    const { error } = await supabase
      .from('shops')
      .update({
        webhook_url: webhookUrl || null,
        webhook_enabled: webhookEnabled,
      })
      .eq('id', shopId)

    setLoading(false)

    if (error) {
      setMessage({ type: 'error', text: 'Error al guardar configuración' })
    } else {
      setMessage({ type: 'success', text: 'Configuración guardada exitosamente' })
      refetchShop()
    }
  }

  async function handleTestWebhook() {
    if (!shopId || !webhookUrl) return

    setTestLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/v1/admin/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Webhook de prueba enviado exitosamente' })
        fetchWebhookLogs()
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al enviar webhook' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setTestLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configuración</h2>
        <p className="text-muted-foreground">
          Administra la configuración de tu comercio
        </p>
      </div>

      {/* Integraciones con n8n */}
      <div className="rounded-lg border bg-card">
        <div className="border-b p-6">
          <h3 className="text-xl font-semibold">Integraciones con n8n</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configura webhooks y API para automatización externa
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* API Key para entrada */}
          <div>
            <label className="block text-sm font-medium mb-2">
              API Key (n8n → Turnero)
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={shopData?.api_key_n8n || ''}
                readOnly
                className="flex-1 rounded-lg border bg-muted px-4 py-2 font-mono text-sm"
              />
              <button className="rounded-lg border px-4 py-2 hover:bg-accent">
                Regenerar
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Usa esta clave en el header:{' '}
              <code className="bg-muted px-1 rounded">Authorization: Bearer {'{'}{'{'}API_KEY{'}'}{' '}</code>
            </p>
          </div>

          <div className="border-t pt-6" />

          {/* Webhook URL */}
          <div>
            <label className="block text-sm font-medium mb-2">
              URL del Webhook de n8n (Turnero → n8n)
            </label>
            <input
              type="url"
              placeholder="https://n8n.company.com/webhook/turnero"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full rounded-lg border bg-background px-4 py-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Recibirás eventos:{' '}
              <code className="bg-muted px-1 rounded">appointment.created</code>,{' '}
              <code className="bg-muted px-1 rounded">appointment.cancelled</code>
            </p>
          </div>

          {/* Webhook Secret */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Webhook Secret
            </label>
            <input
              type="password"
              value={webhookSecret}
              readOnly
              className="w-full rounded-lg border bg-muted px-4 py-2 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Valida este secret en el header{' '}
              <code className="bg-muted px-1 rounded">X-Webhook-Secret</code>
            </p>
          </div>

          {/* Enable/Disable */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setWebhookEnabled(!webhookEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                webhookEnabled ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  webhookEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <label className="text-sm font-medium">
              Webhooks activos
            </label>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`rounded-lg p-3 text-sm ${
                message.type === 'success'
                  ? 'bg-accent/20 text-accent-foreground'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={loading}
              className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar Configuración'}
            </button>
            
            <button
              onClick={handleTestWebhook}
              disabled={!webhookUrl || !webhookEnabled || testLoading}
              className="rounded-lg border px-4 py-2 font-medium hover:bg-accent disabled:opacity-50"
            >
              {testLoading ? 'Enviando...' : 'Enviar Prueba'}
            </button>
          </div>
        </div>
      </div>

      {/* Webhook Logs */}
      {webhookLogs.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="border-b p-6">
            <h3 className="text-xl font-semibold">Últimos Webhooks Enviados</h3>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              {webhookLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        log.success ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    />
                    <code className="font-mono">{log.event_type}</code>
                    <span className="text-muted-foreground">
                      {log.attempts} {log.attempts === 1 ? 'intento' : 'intentos'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {log.status_code && (
                      <span className="text-muted-foreground">
                        HTTP {log.status_code}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
