CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(restaurant_id),
  clerk_user_id TEXT,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',
  permissions JSONB DEFAULT '{}',
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, email)
);
CREATE INDEX idx_team_members_restaurant ON team_members(restaurant_id);
CREATE INDEX idx_team_members_clerk ON team_members(clerk_user_id);
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON team_members FOR ALL USING (true) WITH CHECK (true);
