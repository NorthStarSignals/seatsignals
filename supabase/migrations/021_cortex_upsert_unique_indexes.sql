-- 021_cortex_upsert_unique_indexes.sql
--
-- The "SeatSignals: Cortex Analytics" n8n workflow (daily 6am) upserts Cortex results
-- back into Postgres with:
--   INSERT INTO cortex_review_sentiment (...) ON CONFLICT (review_id) DO UPDATE ...
--   INSERT INTO cortex_customer_segments (...) ON CONFLICT (customer_id) DO UPDATE ...
-- Those columns had no unique constraint, so every write failed with Postgres error
-- 42P10 ("no unique or exclusion constraint matching the ON CONFLICT specification")
-- and halted the run at the first write. Result: cortex_review_sentiment,
-- cortex_customer_segments, and cortex_restaurant_digest (chained downstream) all
-- stayed empty despite 32 reviews + 75 customers of source data.
--
-- Add the unique indexes the upserts assume (their intended idempotency keys).
-- Safe: the tables are empty at apply time, so no duplicate-value conflict.

CREATE UNIQUE INDEX IF NOT EXISTS uq_cortex_review_sentiment_review
  ON cortex_review_sentiment (review_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cortex_customer_segments_customer
  ON cortex_customer_segments (customer_id);
