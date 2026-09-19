-- 020_cortex_and_pos_backfill.sql
--
-- Backfill migration. These six tables already exist in the production database
-- (project ayoeqfjgsgkfxdmjrqvh) but were created by hand and never captured in a
-- migration, so a fresh clone or `supabase db reset` builds a schema the app cannot
-- run against. Every statement uses IF NOT EXISTS, so applying this against the
-- existing production DB is a safe no-op; on a clean database it reproduces the
-- schema the code already queries.
--
-- Column definitions below mirror the live schema exactly (verified via
-- information_schema on 2026-09-18), not the shapes inferred from code.
--
-- Population:
--   * review_imports, pos_orders, pos_order_line_items  -> written by the app
--     (Apify review import + Square order sync).
--   * cortex_review_sentiment, cortex_customer_segments, cortex_restaurant_digest
--     -> populated out-of-band by the Snowflake Cortex enrichment that is synced
--     back into Postgres (see 019_snowflake_sync_webhooks.sql). The app only reads
--     them. All three are currently EMPTY in production.

-- ---------------------------------------------------------------------------
-- Snowflake Cortex enrichment tables (read-only in the app)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cortex_review_sentiment (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id    uuid NOT NULL REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
  review_id        uuid,
  platform         text,
  author           text,
  rating           numeric,
  review_text      text,
  sentiment_score  numeric,
  sentiment_label  text,
  summary          text,
  analyzed_at      timestamptz DEFAULT now(),
  created_at       timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cortex_review_sentiment_restaurant_analyzed
  ON cortex_review_sentiment (restaurant_id, analyzed_at DESC);

CREATE TABLE IF NOT EXISTS cortex_customer_segments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id         uuid NOT NULL REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
  customer_id           uuid,
  customer_name         text,
  segment               text,
  visit_count           integer,
  total_spend           numeric,
  avg_spend_per_visit   numeric,
  days_since_last_visit integer,
  lifetime_value_score  numeric,
  churn_risk_score      numeric,
  ai_summary            text,
  analyzed_at           timestamptz DEFAULT now(),
  created_at            timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cortex_customer_segments_restaurant
  ON cortex_customer_segments (restaurant_id);

CREATE TABLE IF NOT EXISTS cortex_restaurant_digest (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id        uuid NOT NULL REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
  digest_type          text NOT NULL,
  period_start         date NOT NULL,
  period_end           date NOT NULL,
  total_revenue        numeric,
  total_visits         integer,
  new_customers        integer,
  avg_sentiment        numeric,
  top_positive_themes  text,
  top_negative_themes  text,
  ai_digest            text,
  recommendations      text,
  analyzed_at          timestamptz DEFAULT now(),
  created_at           timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cortex_restaurant_digest_restaurant_period
  ON cortex_restaurant_digest (restaurant_id, period_end DESC);

-- ---------------------------------------------------------------------------
-- POS order tables (written by the Square order sync)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pos_orders (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id        uuid NOT NULL REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
  provider             text NOT NULL DEFAULT 'square',
  external_id          text NOT NULL,
  location_id          text,
  state                text,
  source_name          text,
  employee_id          text,
  customer_external_id text,
  total_cents          integer DEFAULT 0,
  tax_cents            integer DEFAULT 0,
  tip_cents            integer DEFAULT 0,
  discount_cents       integer DEFAULT 0,
  currency             text DEFAULT 'USD',
  item_count           integer DEFAULT 0,
  opened_at            timestamptz,
  closed_at            timestamptz,
  raw                  jsonb,
  synced_at            timestamptz DEFAULT now(),
  UNIQUE (restaurant_id, provider, external_id)
);
CREATE INDEX IF NOT EXISTS idx_pos_orders_restaurant_closed
  ON pos_orders (restaurant_id, closed_at DESC);

CREATE TABLE IF NOT EXISTS pos_order_line_items (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id         uuid NOT NULL REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
  order_id              uuid NOT NULL REFERENCES pos_orders(id) ON DELETE CASCADE,
  catalog_external_id   text,
  variation_external_id text,
  name                  text,
  quantity              numeric DEFAULT 1,
  base_price_cents      integer,
  total_price_cents     integer DEFAULT 0,
  raw                   jsonb
);
CREATE INDEX IF NOT EXISTS idx_pos_order_line_items_order
  ON pos_order_line_items (order_id);

-- ---------------------------------------------------------------------------
-- Apify review import tracking (written by the app; already has rows in prod)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS review_imports (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id     uuid NOT NULL REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
  platform          text NOT NULL,
  source_url        text NOT NULL,
  apify_actor       text NOT NULL,
  apify_run_id      text,
  apify_dataset_id  text,
  status            text NOT NULL DEFAULT 'pending',
  reviews_imported  integer DEFAULT 0,
  reviews_duplicate integer DEFAULT 0,
  error_message     text,
  started_at        timestamptz DEFAULT now(),
  completed_at      timestamptz,
  created_at        timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_review_imports_restaurant
  ON review_imports (restaurant_id, created_at DESC);
