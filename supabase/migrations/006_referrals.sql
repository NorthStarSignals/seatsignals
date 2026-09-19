CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(restaurant_id),
  referrer_id UUID NOT NULL REFERENCES customers(customer_id),
  referred_email TEXT NOT NULL,
  referred_customer_id UUID REFERENCES customers(customer_id),
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, signed_up, visited, rewarded
  reward_type TEXT, -- discount_pct, free_item, credit
  reward_value TEXT,
  referrer_rewarded BOOLEAN DEFAULT false,
  referred_rewarded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  converted_at TIMESTAMPTZ
);
CREATE INDEX idx_referrals_restaurant ON referrals(restaurant_id);
CREATE INDEX idx_referrals_code ON referrals(referral_code);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON referrals FOR ALL USING (true) WITH CHECK (true);
