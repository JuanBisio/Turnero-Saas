/**
 * Configuración Page
 * Shop settings and integrations configuration
 */

'use client'

import { useState, useEffect } from 'react'
import { useShop } from '@/components/providers/ShopProvider'
import { createClient } from '@/lib/supabase/client'

export default function ConfiguracionPage() {
  const { shopId, shopSlug, shopData, refetchShop } = useShop()
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookEnabled, setWebhookEnabled] = useState(false)
  const [webhookSecret, setWebhookSecret] = useState('')
  const [loading, setLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [webhookLogs, setWebhookLogs] = useState<any[]>([])

  // WhatsApp / YCloud
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [ycloudApiKey, setYcloudApiKey] = useState('')
  const [ycloudWebhookSecret, setYcloudWebhookSecret] = useState('')
  const [whatsappLoading, setWhatsappLoading] = useState(false)
  const [whatsappMessage, setWhatsappMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [copied, setCopied] = useState(false)

  // Canal de notificaciones
  const [notifChannel, setNotifChannel] = useState<'whatsapp' | 'email'>('whatsapp')
  const [emailReplyTo, setEmailReplyTo] = useState('')
  const [channelLoading, setChannelLoading] = useState(false)
  const [channelMessage, setChannelMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  const supabase = createClient()

  useEffect(() => {
    if (shopData) {
      setWebhookUrl(shopData.webhook_url || '')
      setWebhookEnabled(shopData.webhook_enabled || false)
      setWhatsappNumber(shopData.whatsapp_number || '')
      setYcloudApiKey(shopData.ycloud_api_key || '')
      setYcloudWebhookSecret(shopData.ycloud_webhook_secret || '')
      setNotifChannel((shopData.notification_channel as 'whatsapp' | 'email') ?? 'whatsapp')
      setEmailReplyTo(shopData.email_reply_to || '')

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

  async function handleSaveChannel() {
    if (!shopId) return
    setChannelLoading(true)
    setChannelMessage(null)

    const { error } = await supabase
      .from('shops')
      .update({
        notification_channel: notifChannel,
        email_reply_to: emailReplyTo || null,
      })
      .eq('id', shopId)

    setChannelLoading(false)

    if (error) {
      setChannelMessage({ type: 'error', text: 'Error al guardar' })
    } else {
      setChannelMessage({ type: 'success', text: 'Canal de notificaciones actualizado' })
      refetchShop()
    }
  }

  async function handleSaveWhatsApp() {
    if (!shopId) return

    setWhatsappLoading(true)
    setWhatsappMessage(null)

    const { error } = await supabase
      .from('shops')
      .update({
        whatsapp_number:      whatsappNumber || null,
        ycloud_api_key:       ycloudApiKey || null,
        ycloud_webhook_secret: ycloudWebhookSecret || null,
      })
      .eq('id', shopId)

    setWhatsappLoading(false)

    if (error) {
      setWhatsappMessage({ type: 'error', text: 'Error al guardar configuración de WhatsApp' })
    } else {
      setWhatsappMessage({ type: 'success', text: 'Configuración de WhatsApp guardada' })
      refetchShop()
    }
  }

  function copyWebhookUrl() {
    const url = `https://turnero-saas.vercel.app/api/v1/whatsapp/inbound/${shopSlug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

      {/* Canal de notificaciones */}
      <div className="rounded-lg border bg-card">
        <div className="border-b p-6">
          <h3 className="text-xl font-semibold">Canal de notificaciones</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Elegí cómo reciben la confirmación tus clientes al reservar un turno
          </p>
        </div>
        <div className="p-6 space-y-6">
          {/* Selector */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setNotifChannel('whatsapp')}
              className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                notifChannel === 'whatsapp'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              }`}
            >
              WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setNotifChannel('email')}
              className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                notifChannel === 'email'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              }`}
            >
              Email
            </button>
          </div>

          {/* Info contextual */}
          {notifChannel === 'whatsapp' && (
            <p className="text-sm text-muted-foreground">
              Los clientes ingresan su teléfono y reciben la confirmación por WhatsApp. Configurá las credenciales de YCloud en la sección de abajo.
            </p>
          )}

          {notifChannel === 'email' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Los clientes ingresan su email y reciben la confirmación por correo electrónico. El envío se hace desde la plataforma — no necesitás configurar credenciales adicionales.
              </p>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Email de respuesta del negocio (opcional)
                </label>
                <input
                  type="email"
                  placeholder="contacto@minegocio.com"
                  value={emailReplyTo}
                  onChange={(e) => setEmailReplyTo(e.target.value)}
                  className="w-full rounded-lg border bg-background px-4 py-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Si el cliente responde al correo de confirmación, el mensaje llegará a esta dirección.
                </p>
              </div>
            </div>
          )}

          {channelMessage && (
            <div
              className={`rounded-lg p-3 text-sm ${
                channelMessage.type === 'success'
                  ? 'bg-accent/20 text-accent-foreground'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {channelMessage.text}
            </div>
          )}

          <button
            type="button"
            onClick={handleSaveChannel}
            disabled={channelLoading}
            className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {channelLoading ? 'Guardando...' : 'Guardar canal'}
          </button>
        </div>
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
              <button type="button" className="rounded-lg border px-4 py-2 hover:bg-accent">
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
              type="button"
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
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar Configuración'}
            </button>

            <button
              type="button"
              onClick={handleTestWebhook}
              disabled={!webhookUrl || !webhookEnabled || testLoading}
              className="rounded-lg border px-4 py-2 font-medium hover:bg-accent disabled:opacity-50"
            >
              {testLoading ? 'Enviando...' : 'Enviar Prueba'}
            </button>
          </div>
        </div>
      </div>

      {/* WhatsApp / YCloud */}
      <div className="rounded-lg border bg-card">
        <div className="border-b p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">WhatsApp con YCloud</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Conectá tu número de WhatsApp para enviar confirmaciones automáticas
              </p>
            </div>
            {shopData?.whatsapp_number && shopData?.ycloud_api_key ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Conectado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-600">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                No configurado
              </span>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Webhook URL — solo lectura */}
          <div>
            <label className="block text-sm font-medium mb-2">
              URL del Webhook (configurar en YCloud)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={`https://turnero-saas.vercel.app/api/v1/whatsapp/inbound/${shopSlug}`}
                readOnly
                className="flex-1 rounded-lg border bg-muted px-4 py-2 font-mono text-sm"
              />
              <button
                type="button"
                onClick={copyWebhookUrl}
                className="rounded-lg border px-4 py-2 hover:bg-accent text-sm"
              >
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pegá esta URL en YCloud → Webhooks → Add Endpoint
            </p>
          </div>

          {/* Número de WhatsApp */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Número de WhatsApp
            </label>
            <input
              type="text"
              placeholder="5493513149693"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              className="w-full rounded-lg border bg-background px-4 py-2 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Formato internacional sin <code className="bg-muted px-1 rounded">+</code>. Para Argentina agregá el 9: <code className="bg-muted px-1 rounded">549 + código de área + número</code>
            </p>
          </div>

          {/* YCloud API Key */}
          <div>
            <label className="block text-sm font-medium mb-2">
              API Key de YCloud
            </label>
            <input
              type="password"
              placeholder="yk_live_..."
              value={ycloudApiKey}
              onChange={(e) => setYcloudApiKey(e.target.value)}
              className="w-full rounded-lg border bg-background px-4 py-2 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Encontrala en YCloud → API Keys
            </p>
          </div>

          {/* YCloud Webhook Secret */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Webhook Secret de YCloud
            </label>
            <input
              type="password"
              placeholder="whsec_..."
              value={ycloudWebhookSecret}
              onChange={(e) => setYcloudWebhookSecret(e.target.value)}
              className="w-full rounded-lg border bg-background px-4 py-2 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Encontralo en YCloud → Webhooks → Signing Secret del endpoint
            </p>
          </div>

          {/* Feedback */}
          {whatsappMessage && (
            <div
              className={`rounded-lg p-3 text-sm ${
                whatsappMessage.type === 'success'
                  ? 'bg-accent/20 text-accent-foreground'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {whatsappMessage.text}
            </div>
          )}

          <button
            type="button"
            onClick={handleSaveWhatsApp}
            disabled={whatsappLoading}
            className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {whatsappLoading ? 'Guardando...' : 'Guardar configuración de WhatsApp'}
          </button>
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
