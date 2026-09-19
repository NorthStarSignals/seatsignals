-- Migration 018: POS integration (Square)
-- Stores OAuth tokens per restaurant + normalized catalog/orders/inventory/customers synced from the POS.
-- All tables tenant-isolated by restaurant_id. Service role has full access (MVP — tighten once RLS policies are per-user).

-- ============================================================
-- pos_connections — one row per (restaurant, provider) pair.
-- For Square OAuth we store merchant_id + access_token + refresh_token.
-- `provider` is lowercased vendor name ("square", "toast", etc.).
-- ============================================================
CREATE TABLE IF NOT EXISTS pos_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  merchant_id TEXT,                -- Square merchant id (public, safe-ish)
  access_token TEXT NOT NULL,      -- sensitive, treat like a password
  refresh_token TEXT,              -- present for OAuth flows, null for personal-access tokens
  token_expires_at TIMESTAMPTZ,    -- when access_token expires; null = never
  scopes TEXT,                     -- comma-joined list of granted OAuth scopes
  environment TEXT DEFAULT 'sandbox', -- sandbox | production
  connected_at TIMESTAMPTZ DEFAULT now(),
  last_synced_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',    -- active | disconnected | error
  last_error TEXT,
  UNIQUE (restaurant_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_pos_connections_restaurant ON pos_connections(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_pos_connections_merchant ON pos_connections(merchant_id);

ALTER TABLE pos_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON pos_connections FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- pos_catalog_items — normalized catalog entries from the POS.
-- `external_id` is the upstream item id (Square CatalogObject.id). Dedup via
-- UNIQUE (restaurant_id, provider, external_id).
-- price_cents uses integer cents to match Square's money objects; dollars are
-- derived in the UI layer.
-- ============================================================
CREATE TABLE IF NOT EXISTS pos_catalog_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'square',
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price_cents INTEGER,            -- null = variable price
  currency TEXT DEFAULT 'USD',
  sku TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  raw JSONB,                      -- stash the raw Square object for future fields
  synced_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (restaurant_id, provider, external_id)
);

CREATE INDEX IF NOT EXISTS idx_pos_catalog_items_restaurant ON pos_catalog_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_pos_catalog_items_category ON pos_catalog_items(restaurant_id, category);

ALTER TABLE pos_catalog_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON pos_catalog_items FOR ALL USING (true) WITH CHECK (true);
