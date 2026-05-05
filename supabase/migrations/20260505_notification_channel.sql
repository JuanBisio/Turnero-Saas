-- Canal de notificaciones por shop: 'whatsapp' (default) o 'email'
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS notification_channel TEXT NOT NULL DEFAULT 'whatsapp'
    CHECK (notification_channel IN ('whatsapp', 'email'));

-- Email reply-to opcional: cuando el canal es 'email', los clientes pueden
-- responder al correo y el reply va a esta dirección del negocio.
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS email_reply_to TEXT;
