-- FASE 5: n8n Integration and Webhooks
-- Migration to add webhook support

-- Add webhook fields to shops table
ALTER TABLE shops 
ADD COLUMN IF NOT EXISTS webhook_url TEXT,
ADD COLUMN IF NOT EXISTS webhook_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS webhook_secret TEXT;

-- Create webhook_logs table for auditing
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  url TEXT NOT NULL,
  status_code INTEGER,
  success BOOLEAN,
  error_message TEXT,
  attempts INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_webhook_logs_shop_id ON webhook_logs(shop_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);

-- Add cancellation_token to appointments if not exists
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS cancellation_token TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_appointments_cancellation_token ON appointments(cancellation_token);

-- Comments
COMMENT ON TABLE webhook_logs IS 'Logs all webhook attempts for debugging and auditing';
COMMENT ON COLUMN shops.webhook_url IS 'n8n webhook URL to send events to';
COMMENT ON COLUMN shops.webhook_enabled IS 'Whether webhooks are active for this shop';
COMMENT ON COLUMN shops.webhook_secret IS 'Secret for validating webhook authenticity';
COMMENT ON COLUMN appointments.cancellation_token IS 'Unique token for customer self-service cancellation';
