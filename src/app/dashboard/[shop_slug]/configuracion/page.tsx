/**
 * Configuración Page
 * Shop settings and integrations configuration
 */

'use client'

import { useState, useEffect } from 'react'
import { useShop } from '@/components/providers/ShopProvider'
import { createClient } from '@/lib/supabase/client'
import { AccordionSection } from './components/AccordionSection'

type SectionKey = 'canal' | 'whatsapp' | 'cuenta'

export default function ConfiguracionPage() {
  const { shopId, shopSlug, shopData, refetchShop } = useShop()

  const [openSection, setOpenSection] = useState<SectionKey | null>(null)

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

  // Cuenta
  const [userEmail, setUserEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  const supabase = createClient()

  useEffect(() => {
    if (shopData) {
      setWhatsappNumber(shopData.whatsapp_number || '')
      setYcloudApiKey(shopData.ycloud_api_key || '')
      setYcloudWebhookSecret(shopData.ycloud_webhook_secret || '')
      setNotifChannel((shopData.notification_channel as 'whatsapp' | 'email') ?? 'whatsapp')
      setEmailReplyTo(shopData.email_reply_to || '')
    }
  }, [shopData, shopId])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email || '')
    })
  }, [supabase])

  function toggleSection(section: SectionKey) {
    setOpenSection((current) => (current === section ? null : section))
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

  async function handleChangePassword() {
    setPasswordMessage(null)

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres' })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Las contraseñas no coinciden' })
      return
    }

    setPasswordLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordLoading(false)

    if (error) {
      setPasswordMessage({ type: 'error', text: error.message })
    } else {
      setPasswordMessage({ type: 'success', text: 'Contraseña actualizada correctamente' })
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  function copyWebhookUrl() {
    const url = `https://turnero-saas.vercel.app/api/v1/whatsapp/inbound/${shopSlug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
      <AccordionSection
        title="Canal de notificaciones"
        subtitle="Elegí cómo reciben la confirmación tus clientes al reservar un turno"
        isOpen={openSection === 'canal'}
        onToggle={() => toggleSection('canal')}
      >
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
      </AccordionSection>

      {/* WhatsApp / YCloud */}
      <AccordionSection
        title="WhatsApp con YCloud"
        subtitle="Conectá tu número de WhatsApp para enviar confirmaciones automáticas"
        isOpen={openSection === 'whatsapp'}
        onToggle={() => toggleSection('whatsapp')}
        badge={
          shopData?.whatsapp_number && shopData?.ycloud_api_key ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Conectado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-600">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
              No configurado
            </span>
          )
        }
      >
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
      </AccordionSection>

      {/* Cuenta */}
      <AccordionSection
        title="Cuenta"
        subtitle="Administrá tus datos de acceso"
        isOpen={openSection === 'cuenta'}
        onToggle={() => toggleSection('cuenta')}
      >
        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            value={userEmail}
            readOnly
            className="w-full rounded-lg border bg-muted px-4 py-2 text-sm"
          />
        </div>

        <div className="border-t pt-6 space-y-4">
          <h4 className="text-sm font-semibold">Cambiar contraseña</h4>

          <div>
            <label className="block text-sm font-medium mb-2">Nueva contraseña</label>
            <input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border bg-background px-4 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Confirmar contraseña</label>
            <input
              type="password"
              placeholder="Repetí la nueva contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border bg-background px-4 py-2"
            />
          </div>

          {passwordMessage && (
            <div
              className={`rounded-lg p-3 text-sm ${
                passwordMessage.type === 'success'
                  ? 'bg-accent/20 text-accent-foreground'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {passwordMessage.text}
            </div>
          )}

          <button
            type="button"
            onClick={handleChangePassword}
            disabled={passwordLoading || !newPassword || !confirmPassword}
            className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {passwordLoading ? 'Guardando...' : 'Cambiar contraseña'}
          </button>
        </div>
      </AccordionSection>

    </div>
  )
}
