CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(restaurant_id),
  type TEXT NOT NULL DEFAULT 'alert',
  text TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_restaurant ON notifications(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(restaurant_id, read) WHERE read = false;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON notifications FOR ALL USING (true) WITH CHECK (true);
