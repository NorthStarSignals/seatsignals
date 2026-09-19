CREATE TABLE IF NOT EXISTS message_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(restaurant_id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'sms',
  subject TEXT,
  body TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_system BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_message_templates_restaurant ON message_templates(restaurant_id);
CREATE INDEX idx_message_templates_category ON message_templates(category);
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON message_templates FOR ALL USING (true) WITH CHECK (true);
