import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/api-helpers';
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

// ---------------------------------------------------------------------------
// POST /api/reviews/import
//   body: { platform: 'yelp' | 'google', url: string, maxReviews?: number }
//   returns: { importId, runId, status }
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  const ctx = await resolveTenant();
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json().catch(() => null);
  const platform = (body?.platform ?? '') as ApifyPlatform;
  const url = (body?.url ?? '').trim();
  const maxReviews = Math.min(Math.max(Number(body?.maxReviews) || 50, 1), 500);

  if (!['yelp', 'google'].includes(platform)) {
    return NextResponse.json({ error: 'platform must be yelp or google' }, { status: 400 });
  }
  if (!url.startsWith('http')) {
    return NextResponse.json({ error: 'url must be a full https URL' }, { status: 400 });
  }
  if (platform === 'yelp' && !url.includes('yelp.com/biz/')) {
    return NextResponse.json({ error: 'Yelp URL must look like https://www.yelp.com/biz/...' }, { status: 400 });
  }
  if (platform === 'google' && !url.includes('google.com/maps')) {
    return NextResponse.json({ error: 'Google URL must be a google.com/maps/place/... link' }, { status: 400 });
  }

  // Record the import attempt
  const { data: importRow, error: insertErr } = await ctx.supabase
    .from('review_imports')
    .insert({
      restaurant_id: ctx.restaurantId,
      platform,
      source_url: url,
      apify_actor: ACTORS[platform],
      status: 'pending',
    })
    .select('id')
    .single();
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  // Start Apify run
  try {
    const run = await startRun(platform, url, { maxReviews });
    await ctx.supabase
      .from('review_imports')
      .update({
        apify_run_id: run.runId,
        apify_dataset_id: run.datasetId,
        status: 'running',
      })
      .eq('id', importRow.id);

    // Also save the URL back to restaurants for future imports
    const urlField = platform === 'yelp' ? 'yelp_url' : 'google_maps_url';
    await ctx.supabase
      .from('restaurants')
      .update({ [urlField]: url })
      .eq('restaurant_id', ctx.restaurantId);

    return NextResponse.json({
      importId: importRow.id,
      runId: run.runId,
      status: 'running',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to start scrape';
    await ctx.supabase
      .from('review_imports')
      .update({ status: 'failed', error_message: msg, completed_at: new Date().toISOString() })
      .eq('id', importRow.id);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// GET /api/reviews/import?id=<importId>
//   Polls the Apify run. On completion, pulls dataset items, transforms them,
//   and upserts into the reviews table. Returns current status.
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  const ctx = await resolveTenant();
  if (ctx instanceof NextResponse) return ctx;

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { data: imp, error } = await ctx.supabase
    .from('review_imports')
    .select('*')
    .eq('id', id)
    .eq('restaurant_id', ctx.restaurantId)
    .single();
  if (error || !imp) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Terminal state — nothing to do
  if (imp.status === 'completed' || imp.status === 'failed') {
    return NextResponse.json(imp);
  }

  // Still running — poll Apify
  if (!imp.apify_run_id) {
    return NextResponse.json(imp);
  }

  let status;
  try {
    status = await getRunStatus(imp.apify_run_id);
  } catch (e) {
    return NextResponse.json({ ...imp, _pollError: String(e) });
  }

  if (status.status === 'RUNNING' || status.status === 'READY') {
    return NextResponse.json({ ...imp, apify_status: status.status });
  }

  if (status.status !== 'SUCCEEDED') {
    const errMsg = `Apify run ${status.status.toLowerCase()}`;
    await ctx.supabase
      .from('review_imports')
      .update({
        status: 'failed',
        error_message: errMsg,
        completed_at: new Date().toISOString(),
      })
      .eq('id', imp.id);
    return NextResponse.json({ ...imp, status: 'failed', error_message: errMsg });
  }

  // SUCCEEDED — pull items, transform, upsert
  let items: Record<string, unknown>[] = [];
  try {
    items = await getDatasetItems(status.datasetId);
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : 'dataset fetch failed';
    await ctx.supabase
      .from('review_imports')
      .update({ status: 'failed', error_message: errMsg, completed_at: new Date().toISOString() })
      .eq('id', imp.id);
    return NextResponse.json({ ...imp, status: 'failed', error_message: errMsg });
  }

  const normalizer =
    imp.platform === 'yelp' ? normalizeYelp : normalizeGoogle;

  const normalized: NormalizedReview[] = items
    .map((row) => normalizer(row, imp.source_url))
    .filter((r): r is NormalizedReview => r !== null);

  // Insert reviews with ON CONFLICT DO NOTHING for dedup on (restaurant_id, platform, external_id).
  // We check which external_ids already exist up front, then bulk insert only the new ones —
  // reliable and avoids per-row round trips.
  let imported = 0;
  let duplicate = 0;
  let errorCount = 0;
  const firstError: string | null = null;

  if (normalized.length > 0) {
    const externalIds = normalized.map((r) => r.external_id);
    const { data: existing } = await ctx.supabase
      .from('reviews')
      .select('external_id')
      .eq('restaurant_id', ctx.restaurantId)
      .eq('platform', imp.platform)
      .in('external_id', externalIds);
    const existingSet = new Set((existing || []).map((r) => r.external_id));

    const fresh = normalized.filter((r) => !existingSet.has(r.external_id));
    duplicate = normalized.length - fresh.length;

    if (fresh.length > 0) {
      const rows = fresh.map((r) => ({
        restaurant_id: ctx.restaurantId,
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
      const { error: insertErr, count } = await ctx.supabase
        .from('reviews')
        .insert(rows, { count: 'exact' });
      if (insertErr) {
        errorCount = fresh.length;
        console.error('[reviews/import] bulk insert error', insertErr.message);
      } else {
        imported = count ?? fresh.length;
      }
    }
  }

  void firstError; // currently unused; reserved for richer error reporting

  const { data: updated } = await ctx.supabase
    .from('review_imports')
    .update({
      status: errorCount > 0 && imported === 0 ? 'failed' : 'completed',
      reviews_imported: imported,
      reviews_duplicate: duplicate,
      error_message: errorCount > 0 ? `${errorCount} inserts failed` : null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', imp.id)
    .select('*')
    .single();

  return NextResponse.json(updated);
}
