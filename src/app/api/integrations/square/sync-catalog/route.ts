import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/api-helpers';
import { listCatalog, normalizeCatalog } from '@/lib/square';

/**
 * POST /api/integrations/square/sync-catalog
 *
 * Pulls the full Square catalog for the authenticated merchant and upserts
 * normalized rows into pos_catalog_items. Safe to re-run — dedups via
 * UNIQUE (restaurant_id, provider, external_id).
 *
 * Returns counts: { fetched, inserted, updated }.
 */
export async function POST() {
  const ctx = await resolveTenant();
  if (ctx instanceof NextResponse) return ctx;
  const { supabase, restaurantId } = ctx;

  // 1. Find the active Square connection for this restaurant
  const { data: conn, error: connErr } = await supabase
    .from('pos_connections')
    .select('access_token, status')
    .eq('restaurant_id', restaurantId)
    .eq('provider', 'square')
    .single();

  if (connErr || !conn) {
    return NextResponse.json(
      { error: 'Square is not connected. Connect it from Settings → Integrations.' },
      { status: 400 }
    );
  }
  if (conn.status !== 'active') {
    return NextResponse.json(
      { error: `Square connection is ${conn.status}` },
      { status: 400 }
    );
  }

  // 2. Pull the catalog from Square (paginated)
  let objects;
  try {
    objects = await listCatalog(conn.access_token);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    await supabase
      .from('pos_connections')
      .update({ last_error: msg, status: 'error' })
      .eq('restaurant_id', restaurantId)
      .eq('provider', 'square');
    return NextResponse.json({ error: `Square API failed: ${msg}` }, { status: 502 });
  }

  // 3. Normalize → rows ready for upsert
  const items = normalizeCatalog(objects);

  if (items.length === 0) {
    await supabase
      .from('pos_connections')
      .update({ last_synced_at: new Date().toISOString(), last_error: null })
      .eq('restaurant_id', restaurantId)
      .eq('provider', 'square');
    return NextResponse.json({ fetched: objects.length, inserted: 0, updated: 0 });
  }

  // 4. Determine which are new vs. updates (for the response count only).
  //    The actual write is a single upsert.
  const externalIds = items.map((i) => i.external_id);
  const { data: existing } = await supabase
    .from('pos_catalog_items')
    .select('external_id')
    .eq('restaurant_id', restaurantId)
    .eq('provider', 'square')
    .in('external_id', externalIds);
  const existingSet = new Set((existing || []).map((r) => r.external_id));

  const rows = items.map((i) => ({
    restaurant_id: restaurantId,
    provider: 'square',
    external_id: i.external_id,
    name: i.name,
    description: i.description,
    category: i.category,
    price_cents: i.price_cents,
    currency: i.currency,
    sku: i.sku,
    image_url: i.image_url,
    is_active: i.is_active,
    raw: i.raw,
    synced_at: new Date().toISOString(),
  }));

  const { error: upsertErr } = await supabase
    .from('pos_catalog_items')
    .upsert(rows, { onConflict: 'restaurant_id,provider,external_id' });

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  const inserted = items.filter((i) => !existingSet.has(i.external_id)).length;
  const updated = items.length - inserted;

  await supabase
    .from('pos_connections')
    .update({ last_synced_at: new Date().toISOString(), last_error: null, status: 'active' })
    .eq('restaurant_id', restaurantId)
    .eq('provider', 'square');

  return NextResponse.json({
    fetched: objects.length,
    items: items.length,
    inserted,
    updated,
  });
}
