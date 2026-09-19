-- Do Not Contact list for messaging compliance
CREATE TABLE IF NOT EXISTS do_not_contact (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(restaurant_id),
  contact_type TEXT NOT NULL, -- email, phone, both
  contact_value TEXT NOT NULL, -- the email or phone
  reason TEXT, -- unsubscribed, bounced, complained, manual
  customer_id UUID REFERENCES customers(customer_id),
  added_by TEXT, -- user_id or 'system'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, contact_value)
);

-- Consent log for audit trail
CREATE TABLE IF NOT EXISTS consent_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(restaurant_id),
  customer_id UUID REFERENCES customers(customer_id),
  consent_type TEXT NOT NULL, -- sms_opt_in, email_opt_in, data_processing
  consented BOOLEAN NOT NULL,
  source TEXT, -- qr_code, wifi, manual, api, survey
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dnc_restaurant ON do_not_contact(restaurant_id);
CREATE INDEX idx_dnc_value ON do_not_contact(restaurant_id, contact_value);
CREATE INDEX idx_consent_customer ON consent_log(customer_id);

ALTER TABLE do_not_contact ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON do_not_contact FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON consent_log FOR ALL USING (true) WITH CHECK (true);
