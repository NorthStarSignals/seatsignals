import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import {
  startRun,
  getRunStatus,
  getDatasetItems,
  normalizeYelp,
  normalizeGoogle,
  ACTORS,
  type ApifyPlatform,
  type NormalizedReview,
} from '@/lib/apify';

/**
 * Scheduled review sync. Invoked by Vercel Cron.
 *
 * Schedule (vercel.json):
 *   - Pro:    daily   (04:00 UTC)
 *   - Growth: weekly  (Monday 05:00 UTC)
 *
 * For each restaurant matching the tier that has a yelp_url or google_maps_url,
 * this kicks off Apify scraper runs. It does NOT wait for them to complete —
 * the poll-and-ingest happens on the next request to GET /api/reviews/import?id=...
 * OR via a finalizer we can add later. For now, the frontend's Reviews panel
 * will finalize runs when anyone next visits the page.
 *
 * Auth: Vercel Cron signs requests with `Authorization: Bearer ${CRON_SECRET}`.
 * When invoked manually (not by cron), we also accept a query `?secret=...`
 * for admin debugging.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  const url = new URL(request.url);
  const querySecret = url.searchParams.get('secret');
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  const authorized =
    authHeader === `Bearer ${expected}` || querySecret === expected;
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tier = url.searchParams.get('tier');
  if (!tier || !['pro', 'growth', 'enterprise'].includes(tier)) {
    return NextResponse.json(
      { error: 'tier query param must be pro, growth, or enterprise' },
      { status: 400 }
    );
  }

  const supabase = createServerSupabase();

  // Find all restaurants on this tier with at least one review source configured
  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('restaurant_id, name, yelp_url, google_maps_url')
    .eq('subscription_tier', tier);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const eligible = (restaurants || []).filter(
    (r) => r.yelp_url || r.google_maps_url
  );

  const results: Array<{
    restaurant_id: string;
    name: string;
    platform: ApifyPlatform;
    importId?: string;
    runId?: string;
    error?: string;
  }> = [];

  for (const r of eligible) {
    for (const platform of ['yelp', 'google'] as ApifyPlatform[]) {
      const sourceUrl =
        platform === 'yelp' ? r.yelp_url : r.google_maps_url;
      if (!sourceUrl) continue;

      try {
        // Record the import attempt
        const { data: importRow, error: insertErr } = await supabase
          .from('review_imports')
          .insert({
            restaurant_id: r.restaurant_id,
            platform,
            source_url: sourceUrl,
            apify_actor: ACTORS[platform],
            status: 'pending',
          })
          .select('id')
          .single();
        if (insertErr) throw new Error(insertErr.message);

        // Kick off Apify run (fire and forget — completion handled later)
        const run = await startRun(platform, sourceUrl, { maxReviews: 50 });
        await supabase
          .from('review_imports')
          .update({
            apify_run_id: run.runId,
            apify_dataset_id: run.datasetId,
            status: 'running',
          })
          .eq('id', importRow.id);

        results.push({
          restaurant_id: r.restaurant_id,
          name: r.name,
          platform,
          importId: importRow.id,
          runId: run.runId,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'unknown error';
        results.push({
          restaurant_id: r.restaurant_id,
          name: r.name,
          platform,
          error: msg,
        });
      }

      // Politeness delay so we don't hammer Apify with parallel starts
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // ---------------------------------------------------------------------------
  // Finalizer pass: ingest any `running` imports older than 10 min that Apify
  // has since completed. This catches runs that finished after a cron kickoff
  // but before anyone visited the Reviews page to trigger the GET-poll finalizer.
  // ---------------------------------------------------------------------------
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: pending } = await supabase
    .from('review_imports')
    .select('*')
    .eq('status', 'running')
    .lt('started_at', tenMinAgo);

  let finalized = 0;
  for (const imp of pending || []) {
    if (!imp.apify_run_id) continue;
    try {
      const st = await getRunStatus(imp.apify_run_id);
      if (st.status !== 'SUCCEEDED') continue;
      const items = await getDatasetItems(st.datasetId);
      const normalizer = imp.platform === 'yelp' ? normalizeYelp : normalizeGoogle;
      const normalized: NormalizedReview[] = items
        .map((row) => normalizer(row, imp.source_url))
        .filter((r): r is NormalizedReview => r !== null);

      if (normalized.length > 0) {
        const externalIds = normalized.map((r) => r.external_id);
        const { data: existing } = await supabase
          .from('reviews')
          .select('external_id')
          .eq('restaurant_id', imp.restaurant_id)
          .eq('platform', imp.platform)
          .in('external_id', externalIds);
        const existingSet = new Set((existing || []).map((r) => r.external_id));
        const fresh = normalized.filter((r) => !existingSet.has(r.external_id));

        if (fresh.length > 0) {
          const rows = fresh.map((r) => ({
            restaurant_id: imp.restaurant_id,
            platform: r.platform,
            author: r.author,
            rating: r.rating,
            text: r.text,
            external_id: r.external_id,
            review_date: r.review_date,
            reviewer_photo_url: r.reviewer_photo_url,
            review_url: r.review_url,
            source_url: r.source_url,
            response_status: 'none',
          }));
          await supabase.from('reviews').insert(rows);
        }

        await supabase
          .from('review_imports')
          .update({
            status: 'completed',
            reviews_imported: fresh.length,
            reviews_duplicate: normalized.length - fresh.length,
            completed_at: new Date().toISOString(),
          })
          .eq('id', imp.id);
        finalized++;
      }
    } catch (e) {
      console.error('[cron] finalize error for', imp.id, e);
    }
  }

  return NextResponse.json({
    tier,
    eligible_restaurants: eligible.length,
    total_runs_started: results.filter((r) => !r.error).length,
    finalized_prior_runs: finalized,
    results,
  });
}
