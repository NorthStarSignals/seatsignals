CREATE TABLE IF NOT EXISTS flash_deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(restaurant_id),
  title TEXT NOT NULL,
  description TEXT,
  deal_type TEXT NOT NULL DEFAULT 'flash',
  discount_value TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  max_redemptions INTEGER,
  current_redemptions INTEGER DEFAULT 0,
  redemption_code TEXT NOT NULL,
  target_audience TEXT DEFAULT 'all',
  channel TEXT DEFAULT 'sms',
  message_sent BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_flash_deals_restaurant ON flash_deals(restaurant_id);
CREATE INDEX idx_flash_deals_active ON flash_deals(restaurant_id, active, expires_at);
ALTER TABLE flash_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON flash_deals FOR ALL USING (true) WITH CHECK (true);
