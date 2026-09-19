-- 019_snowflake_sync_webhooks.sql
-- Replaces hourly INSERT OVERWRITE Snowflake sync with per-row Database Webhooks.
-- Every INSERT/UPDATE/DELETE on the 7 mirrored tables fires an HTTP POST to the
-- n8n receiver, which MERGEs the row into Snowflake. No polling.
--
-- Requires pg_net extension (Supabase has it built-in; uncomment if needed):
-- CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.notify_n8n_snowflake_sync()
RETURNS TRIGGER AS $$
DECLARE
  payload jsonb;
BEGIN
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record',     CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    'old_record', CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END
  );

  PERFORM net.http_post(
    url     := 'https://automation.northstarsignals.io/webhook/seatsignals-sync',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := payload
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers (one per mirrored table)
DROP TRIGGER IF EXISTS trg_sf_sync_customers           ON public.customers;
DROP TRIGGER IF EXISTS trg_sf_sync_visits              ON public.visits;
DROP TRIGGER IF EXISTS trg_sf_sync_sequences           ON public.sequences;
DROP TRIGGER IF EXISTS trg_sf_sync_reviews             ON public.reviews;
DROP TRIGGER IF EXISTS trg_sf_sync_sequence_defs       ON public.sequence_definitions;
DROP TRIGGER IF EXISTS trg_sf_sync_birthday_events     ON public.birthday_events;
DROP TRIGGER IF EXISTS trg_sf_sync_restaurants         ON public.restaurants;

CREATE TRIGGER trg_sf_sync_customers
  AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_snowflake_sync();

CREATE TRIGGER trg_sf_sync_visits
  AFTER INSERT OR UPDATE OR DELETE ON public.visits
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_snowflake_sync();

CREATE TRIGGER trg_sf_sync_sequences
  AFTER INSERT OR UPDATE OR DELETE ON public.sequences
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_snowflake_sync();

CREATE TRIGGER trg_sf_sync_reviews
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_snowflake_sync();

CREATE TRIGGER trg_sf_sync_sequence_defs
  AFTER INSERT OR UPDATE OR DELETE ON public.sequence_definitions
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_snowflake_sync();

CREATE TRIGGER trg_sf_sync_birthday_events
  AFTER INSERT OR UPDATE OR DELETE ON public.birthday_events
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_snowflake_sync();

CREATE TRIGGER trg_sf_sync_restaurants
  AFTER INSERT OR UPDATE OR DELETE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_snowflake_sync();
