-- ============================================================
-- SeatSignals Demo Seed Data
-- ============================================================
-- Run this AFTER the user signs up via Clerk and onboarding
-- creates their restaurant row. It populates the demo restaurant
-- with realistic-looking customers, visits, reviews, and leads.
--
-- USAGE:
--   1. Sign up at /sign-up with clerk_user_id you control
--   2. Complete /onboarding to create the restaurant
--   3. Run: psql $DATABASE_URL -f supabase/seed_demo.sql -v clerk_id="'<your_clerk_id>'"
--
-- Or invoke via the /api/dev/seed endpoint (see route file).
-- ============================================================

DO $$
DECLARE
  v_restaurant_id UUID;
  v_clerk_id TEXT := current_setting('seed.clerk_id', true);
  v_customer_ids UUID[];
  v_cid UUID;
  i INT;
BEGIN
  -- Resolve restaurant by clerk_user_id
  IF v_clerk_id IS NULL OR v_clerk_id = '' THEN
    RAISE EXCEPTION 'Set seed.clerk_id with: SET seed.clerk_id = ''<clerk_user_id>'';';
  END IF;

  SELECT restaurant_id INTO v_restaurant_id FROM restaurants WHERE clerk_user_id = v_clerk_id;
  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'No restaurant found for clerk_user_id %', v_clerk_id;
  END IF;

  RAISE NOTICE 'Seeding demo data for restaurant_id %', v_restaurant_id;

  -- Wipe existing demo data for idempotency
  DELETE FROM visits WHERE restaurant_id = v_restaurant_id;
  DELETE FROM reviews WHERE restaurant_id = v_restaurant_id;
  DELETE FROM customers WHERE restaurant_id = v_restaurant_id;
  DELETE FROM catering_leads WHERE restaurant_id = v_restaurant_id;

  -- ----------------------------------------------------------
  -- Customers (75 with realistic distribution)
  -- ----------------------------------------------------------
  v_customer_ids := ARRAY[]::UUID[];
  FOR i IN 1..75 LOOP
    INSERT INTO customers (restaurant_id, first_name, email, phone, first_seen, last_seen, visit_count, total_spend, birthday, source)
    VALUES (
      v_restaurant_id,
      (ARRAY['Sarah','Marcus','Linda','David','Emma','James','Olivia','Liam','Sophia','Noah','Ava','Ethan','Mia','Lucas','Isabella','Mason','Charlotte','Logan','Amelia','Elijah'])[1 + (i % 20)],
      'demo' || i || '@example.com',
      '(415) 555-' || lpad((1000 + i)::text, 4, '0'),
      now() - ((i * 3 + 5) || ' days')::interval,
      now() - ((i % 14) || ' days')::interval,
      1 + (i % 12),
      round((45 + (i * 17) % 380)::numeric, 2),
      ('1970-01-01'::date + ((i * 113) % 18000) * '1 day'::interval)::date,
      (ARRAY['wifi','reservation','online_order','walk_in'])[1 + (i % 4)]
    )
    RETURNING customer_id INTO v_cid;
    v_customer_ids := array_append(v_customer_ids, v_cid);
  END LOOP;

  -- ----------------------------------------------------------
  -- Visits (~3 per customer, last 60 days)
  -- ----------------------------------------------------------
  FOR i IN 1..220 LOOP
    INSERT INTO visits (customer_id, restaurant_id, timestamp, source, spend_amount)
    VALUES (
      v_customer_ids[1 + (i % array_length(v_customer_ids, 1))],
      v_restaurant_id,
      now() - ((i * 7) % 60 || ' hours')::interval - ((i % 60) || ' days')::interval,
      (ARRAY['pos','reservation','online_order','wifi'])[1 + (i % 4)],
      round((28 + (i * 13) % 220)::numeric, 2)
    );
  END LOOP;

  -- ----------------------------------------------------------
  -- Reviews (mixed sentiment, multiple platforms)
  -- ----------------------------------------------------------
  INSERT INTO reviews (restaurant_id, platform, author, rating, text, response_status, created_at) VALUES
    (v_restaurant_id, 'google', 'Sarah M.', 5, 'Absolutely incredible experience! The sea bass was cooked to perfection and our server Marco was attentive without being intrusive.', 'responded', now() - interval '2 days'),
    (v_restaurant_id, 'yelp', 'David K.', 2, 'Waited 45 minutes for our table despite having a reservation. Food was decent but service was slow.', 'pending', now() - interval '3 days'),
    (v_restaurant_id, 'tripadvisor', 'Linda W.', 4, 'Lovely atmosphere and great cocktails. The truffle pasta was amazing.', 'responded', now() - interval '4 days'),
    (v_restaurant_id, 'google', 'Marcus T.', 5, 'Best Italian in town. The chef came out to greet our table — incredible touch.', 'responded', now() - interval '5 days'),
    (v_restaurant_id, 'google', 'Emma R.', 5, 'Date night perfection. Wine pairings were spot on.', 'responded', now() - interval '6 days'),
    (v_restaurant_id, 'yelp', 'James P.', 3, 'Food was good but it was very loud. Hard to have a conversation.', 'pending', now() - interval '7 days'),
    (v_restaurant_id, 'google', 'Olivia C.', 5, 'Brought my parents here for their anniversary. Staff went above and beyond.', 'responded', now() - interval '8 days'),
    (v_restaurant_id, 'google', 'Liam B.', 4, 'Solid spot. Will be back to try the tasting menu next time.', 'responded', now() - interval '10 days'),
    (v_restaurant_id, 'yelp', 'Sophia G.', 5, 'The bartender Sarah is a wizard. Best old fashioned I''ve ever had.', 'responded', now() - interval '12 days'),
    (v_restaurant_id, 'google', 'Noah F.', 1, 'Cold food, rude server. Will not return.', 'pending', now() - interval '14 days'),
    (v_restaurant_id, 'tripadvisor', 'Ava H.', 5, 'A hidden gem. The pasta is hand-rolled and you can taste the difference.', 'responded', now() - interval '15 days'),
    (v_restaurant_id, 'google', 'Ethan W.', 4, 'Great food, great service, fair prices. Three for three.', 'responded', now() - interval '17 days');

  -- ----------------------------------------------------------
  -- Catering leads
  -- ----------------------------------------------------------
  INSERT INTO catering_leads (restaurant_id, company_name, contact_name) VALUES
    (v_restaurant_id, 'Acme Tech Inc', 'Jordan Lee'),
    (v_restaurant_id, 'Northwest Legal LLP', 'Pat Rivera'),
    (v_restaurant_id, 'Bayside Marketing', 'Casey Chen'),
    (v_restaurant_id, 'Ridgeline Capital', 'Morgan Park'),
    (v_restaurant_id, 'Helix Biotech', 'Riley Thompson');

  RAISE NOTICE 'Demo seed complete: 75 customers, ~220 visits, 12 reviews, 5 catering leads';
END $$;
