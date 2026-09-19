CREATE TABLE IF NOT EXISTS webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(restaurant_id),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT,
  active BOOLEAN DEFAULT true,
  last_triggered TIMESTAMPTZ,
  last_status INTEGER,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_webhooks_restaurant ON webhooks(restaurant_id);
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON webhooks FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB,
  response_status INTEGER,
  response_body TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_webhook_logs_webhook ON webhook_logs(webhook_id);
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON webhook_logs FOR ALL USING (true) WITH CHECK (true);
