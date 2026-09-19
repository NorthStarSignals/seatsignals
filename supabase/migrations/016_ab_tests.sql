CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(restaurant_id),
  name TEXT NOT NULL,
  sequence_type TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  variant_a_message TEXT NOT NULL,
  variant_a_subject TEXT,
  variant_b_message TEXT NOT NULL,
  variant_b_subject TEXT,
  split_pct INTEGER DEFAULT 50,
  total_sent_a INTEGER DEFAULT 0,
  total_sent_b INTEGER DEFAULT 0,
  opened_a INTEGER DEFAULT 0,
  opened_b INTEGER DEFAULT 0,
  clicked_a INTEGER DEFAULT 0,
  clicked_b INTEGER DEFAULT 0,
  converted_a INTEGER DEFAULT 0,
  converted_b INTEGER DEFAULT 0,
  winner TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ab_tests_restaurant ON ab_tests(restaurant_id);
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON ab_tests FOR ALL USING (true) WITH CHECK (true);
