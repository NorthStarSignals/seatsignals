CREATE TABLE IF NOT EXISTS competitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(restaurant_id),
  name TEXT NOT NULL,
  address TEXT,
  cuisine_type TEXT,
  google_rating NUMERIC,
  google_review_count INTEGER,
  yelp_rating NUMERIC,
  yelp_review_count INTEGER,
  price_level TEXT,
  notes TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_competitors_restaurant ON competitors(restaurant_id);
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON competitors FOR ALL USING (true) WITH CHECK (true);
