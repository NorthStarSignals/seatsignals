CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(restaurant_id),
  report_type TEXT NOT NULL DEFAULT 'weekly',
  frequency TEXT NOT NULL DEFAULT 'weekly',
  day_of_week INTEGER DEFAULT 1,
  recipients TEXT[] NOT NULL DEFAULT '{}',
  include_pdf BOOLEAN DEFAULT true,
  include_ai_digest BOOLEAN DEFAULT true,
  active BOOLEAN DEFAULT true,
  last_sent TIMESTAMPTZ,
  next_send TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_scheduled_reports_restaurant ON scheduled_reports(restaurant_id);
CREATE INDEX idx_scheduled_reports_next ON scheduled_reports(next_send) WHERE active = true;
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON scheduled_reports FOR ALL USING (true) WITH CHECK (true);
