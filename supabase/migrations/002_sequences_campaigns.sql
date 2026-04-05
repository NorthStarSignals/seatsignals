-- Sequence definitions (campaign templates with on/off toggle)
CREATE TABLE IF NOT EXISTS sequence_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  channel TEXT DEFAULT 'sms',
  subject TEXT,
  message_template TEXT,
  trigger_event TEXT,
  delay_days INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(restaurant_id, type)
);
CREATE INDEX IF NOT EXISTS idx_seqdef_restaurant ON sequence_definitions(restaurant_id);

-- Add channel to sequences log
ALTER TABLE sequences ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'sms';

-- Add fields to customers for CRM features
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;

-- Email config per restaurant
CREATE TABLE IF NOT EXISTS restaurant_email_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(restaurant_id) ON DELETE CASCADE UNIQUE,
  provider TEXT NOT NULL DEFAULT 'sendgrid',
  from_name TEXT,
  from_email TEXT,
  smtp_host TEXT,
  smtp_port INT,
  smtp_user TEXT,
  smtp_pass_encrypted TEXT,
  connected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
