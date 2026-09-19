CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(restaurant_id),
  customer_id UUID REFERENCES customers(customer_id),
  survey_type TEXT DEFAULT 'post_visit',
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  food_rating INTEGER CHECK (food_rating BETWEEN 1 AND 5),
  service_rating INTEGER CHECK (service_rating BETWEEN 1 AND 5),
  ambiance_rating INTEGER CHECK (ambiance_rating BETWEEN 1 AND 5),
  would_recommend BOOLEAN,
  feedback_text TEXT,
  visit_id UUID REFERENCES visits(visit_id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_survey_responses_restaurant ON survey_responses(restaurant_id);
CREATE INDEX idx_survey_responses_customer ON survey_responses(customer_id);
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON survey_responses FOR ALL USING (true) WITH CHECK (true);
