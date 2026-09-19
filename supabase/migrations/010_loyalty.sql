CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(restaurant_id),
  name TEXT NOT NULL,
  description TEXT,
  milestone_type TEXT NOT NULL, -- visit_count, total_spend, referral_count, anniversary
  milestone_value INTEGER NOT NULL, -- e.g., 5 visits, $500 spend
  reward_type TEXT NOT NULL, -- discount_pct, free_item, credit, custom
  reward_value TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loyalty_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(restaurant_id),
  customer_id UUID NOT NULL REFERENCES customers(customer_id),
  reward_id UUID NOT NULL REFERENCES loyalty_rewards(id),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  redeemed BOOLEAN DEFAULT false,
  redeemed_at TIMESTAMPTZ,
  redemption_code TEXT
);

CREATE INDEX idx_loyalty_rewards_restaurant ON loyalty_rewards(restaurant_id);
CREATE INDEX idx_loyalty_achievements_customer ON loyalty_achievements(customer_id);
CREATE INDEX idx_loyalty_achievements_restaurant ON loyalty_achievements(restaurant_id);
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON loyalty_rewards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON loyalty_achievements FOR ALL USING (true) WITH CHECK (true);
