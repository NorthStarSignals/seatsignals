CREATE TABLE IF NOT EXISTS customer_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(restaurant_id),
  customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, tag)
);
CREATE INDEX IF NOT EXISTS idx_customer_tags_restaurant ON customer_tags(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_customer_tags_customer ON customer_tags(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_tags_tag ON customer_tags(restaurant_id, tag);
ALTER TABLE customer_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON customer_tags FOR ALL USING (true) WITH CHECK (true);
