CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT false,
  rollout_pct INTEGER DEFAULT 0,
  tiers TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS changelog_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'feature',
  published_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE changelog_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON feature_flags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON changelog_entries FOR ALL USING (true) WITH CHECK (true);

-- Seed initial changelog entries
INSERT INTO changelog_entries (version, title, description, category, published_at) VALUES
('1.0.0', 'SeatSignals Launch', 'The Restaurant Revenue Operating System is live! Manage customers, reviews, sequences, and more from a single dashboard.', 'feature', '2026-01-15'),
('1.1.0', 'AI Analytics', 'AI-powered sentiment analysis, customer segmentation, and weekly business digests now available.', 'feature', '2026-02-01'),
('1.2.0', 'Visual Sequence Builder', 'Drag-and-drop multi-step message sequence editor with conditions, delays, and actions.', 'feature', '2026-02-15'),
('1.3.0', 'Catering & Corporate', 'Catering proposal PDFs, lead scoring, calendar view, and corporate account management.', 'feature', '2026-03-01'),
('1.4.0', 'Customer Intelligence', 'Customer merge/dedup, tagging, 360 profile view, spend velocity tracking, and cohort analysis.', 'feature', '2026-03-15'),
('1.5.0', 'Growth Engine', 'Referral program, loyalty rewards, flash deals, QR code capture, and customer surveys.', 'feature', '2026-04-01'),
('1.5.1', 'Smart Alerts & Compliance', 'Anomaly detection, do-not-contact management, consent logging, and CAN-SPAM compliance.', 'improvement', '2026-04-05');
