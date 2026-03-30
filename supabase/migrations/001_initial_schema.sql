-- SeatSignals Initial Schema
-- Migration 001: Create all tables, indexes, and disable RLS for MVP

-- ============================================================
-- 1. restaurants
-- ============================================================
CREATE TABLE restaurants (
  restaurant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  cuisine_type TEXT,
  brand_voice TEXT,
  subscription_tier TEXT DEFAULT 'starter',
  setup_date TIMESTAMPTZ DEFAULT now(),
  dead_hours_config JSONB DEFAULT '[]',
  clerk_user_id TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT
);

-- ============================================================
-- 2. customers
-- ============================================================
CREATE TABLE customers (
  customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(restaurant_id),
  first_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  first_seen TIMESTAMPTZ DEFAULT now(),
  last_seen TIMESTAMPTZ DEFAULT now(),
  visit_count INT DEFAULT 1,
  total_spend NUMERIC DEFAULT 0,
  birthday DATE,
  source TEXT DEFAULT 'wifi',
  location_data JSONB,
  UNIQUE (restaurant_id, email)
);

-- ============================================================
-- 3. visits
-- ============================================================
CREATE TABLE visits (
  visit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(customer_id),
  restaurant_id UUID REFERENCES restaurants(restaurant_id),
  timestamp TIMESTAMPTZ DEFAULT now(),
  source TEXT,
  spend_amount NUMERIC DEFAULT 0
);

-- ============================================================
-- 4. reviews
-- ============================================================
CREATE TABLE reviews (
  review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(restaurant_id),
  platform TEXT DEFAULT 'google',
  author TEXT,
  rating INT,
  text TEXT,
  response_text TEXT,
  response_status TEXT DEFAULT 'none',
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. catering_leads
-- ============================================================
CREATE TABLE catering_leads (
  lead_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(restaurant_id),
  company_name TEXT,
  contact_name TEXT,
  contact_email TEXT,
  company_size INT,
  distance_miles NUMERIC,
  sequence_status TEXT DEFAULT 'discovered',
  last_contacted TIMESTAMPTZ,
  converted BOOLEAN DEFAULT false,
  order_value NUMERIC
);

-- ============================================================
-- 6. catering_orders
-- ============================================================
CREATE TABLE catering_orders (
  order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(restaurant_id),
  lead_id UUID REFERENCES catering_leads(lead_id),
  corporate_account_id UUID,
  date TIMESTAMPTZ DEFAULT now(),
  amount NUMERIC,
  recurring BOOLEAN DEFAULT false,
  frequency TEXT,
  items JSONB DEFAULT '[]'
);

-- ============================================================
-- 7. corporate_accounts
-- ============================================================
CREATE TABLE corporate_accounts (
  account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(restaurant_id),
  company_name TEXT,
  primary_contact TEXT,
  billing_info JSONB,
  dietary_preferences TEXT,
  delivery_address TEXT,
  recurring_schedule JSONB,
  last_order_date TIMESTAMPTZ,
  total_lifetime_value NUMERIC DEFAULT 0,
  churn_risk_flag BOOLEAN DEFAULT false,
  access_token TEXT UNIQUE DEFAULT gen_random_uuid()::text
);

-- Add FK from catering_orders to corporate_accounts (defined after corporate_accounts)
ALTER TABLE catering_orders
  ADD CONSTRAINT fk_catering_orders_corporate_account
  FOREIGN KEY (corporate_account_id) REFERENCES corporate_accounts(account_id);

-- ============================================================
-- 8. delivery_metrics
-- ============================================================
CREATE TABLE delivery_metrics (
  metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(restaurant_id),
  platform TEXT,
  date DATE,
  orders INT,
  revenue NUMERIC,
  avg_order_value NUMERIC,
  rating NUMERIC
);

-- ============================================================
-- 9. sequences
-- ============================================================
CREATE TABLE sequences (
  sequence_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(customer_id),
  restaurant_id UUID REFERENCES restaurants(restaurant_id),
  type TEXT,
  message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  opened BOOLEAN DEFAULT false,
  clicked BOOLEAN DEFAULT false,
  converted BOOLEAN DEFAULT false
);

-- ============================================================
-- 10. dead_hours
-- ============================================================
CREATE TABLE dead_hours (
  dead_hour_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(restaurant_id),
  day_of_week TEXT,
  time_start TIME,
  time_end TIME,
  promotion_type TEXT,
  channel TEXT DEFAULT 'sms',
  seats_filled INT DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  redemption_code TEXT,
  triggered_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 11. birthday_events
-- ============================================================
CREATE TABLE birthday_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(customer_id),
  restaurant_id UUID REFERENCES restaurants(restaurant_id),
  event_type TEXT,
  offer_sent_at TIMESTAMPTZ DEFAULT now(),
  redeemed BOOLEAN DEFAULT false,
  redemption_date TIMESTAMPTZ,
  party_size INT,
  check_total NUMERIC,
  redemption_code TEXT UNIQUE,
  year INT DEFAULT extract(year FROM now())
);

-- ============================================================
-- Indexes: restaurant_id on all child tables
-- ============================================================
CREATE INDEX idx_customers_restaurant_id ON customers(restaurant_id);
CREATE INDEX idx_visits_restaurant_id ON visits(restaurant_id);
CREATE INDEX idx_reviews_restaurant_id ON reviews(restaurant_id);
CREATE INDEX idx_catering_leads_restaurant_id ON catering_leads(restaurant_id);
CREATE INDEX idx_catering_orders_restaurant_id ON catering_orders(restaurant_id);
CREATE INDEX idx_corporate_accounts_restaurant_id ON corporate_accounts(restaurant_id);
CREATE INDEX idx_delivery_metrics_restaurant_id ON delivery_metrics(restaurant_id);
CREATE INDEX idx_sequences_restaurant_id ON sequences(restaurant_id);
CREATE INDEX idx_dead_hours_restaurant_id ON dead_hours(restaurant_id);
CREATE INDEX idx_birthday_events_restaurant_id ON birthday_events(restaurant_id);

-- Additional indexes
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_birthday ON customers(birthday);
CREATE INDEX idx_birthday_events_redemption_code ON birthday_events(redemption_code);
CREATE INDEX idx_dead_hours_redemption_code ON dead_hours(redemption_code);
CREATE INDEX idx_corporate_accounts_access_token ON corporate_accounts(access_token);

-- ============================================================
-- Disable RLS on all tables for MVP
-- ============================================================
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE catering_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE catering_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE dead_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE birthday_events ENABLE ROW LEVEL SECURITY;

-- RLS disabled for MVP: allow all operations
CREATE POLICY "Allow all" ON restaurants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON visits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON reviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON catering_leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON catering_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON corporate_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON delivery_metrics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON sequences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON dead_hours FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON birthday_events FOR ALL USING (true) WITH CHECK (true);
