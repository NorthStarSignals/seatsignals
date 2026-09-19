import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/api-helpers';
import { listLocations, searchOrders, normalizeOrder } from '@/lib/square';

/**
 * POST /api/integrations/square/sync-orders?days=90
 *
 * Pulls every order for every Square location owned by this merchant, going
 * back `days` days (default 90, max 365). Upserts into pos_orders and rewrites
 * the line items for each order.
 *
 * Line items are deleted+reinserted per order rather than individually upserted
 * to keep the code simple — Square's Orders API doesn't give us stable line
 * item IDs across edits.
 */
export async function POST(request: Request) {
  const ctx = await resolveTenant();
  if (ctx instanceof NextResponse) return ctx;
  const { supabase, restaurantId } = ctx;

  const url = new URL(request.url);
  const daysParam = parseInt(url.searchParams.get('days') || '90', 10);
  const days = Math.min(Math.max(1, isNaN(daysParam) ? 90 : daysParam), 365);

  const { data: conn, error: connErr } = await supabase
    .from('pos_connections')
    .select('access_token, status')
    .eq('restaurant_id', restaurantId)
    .eq('provider', 'square')
    .single();

  if (connErr || !conn) {
    return NextResponse.json(
      { error: 'Square is not connected.' },
      { status: 400 }
    );
  }

  let locations;
  try {
    locations = await listLocations(conn.access_token);
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to list locations: ${e instanceof Error ? e.message : e}` },
      { status: 502 }
    );
  }
  const activeIds = locations.filter((l) => l.status !== 'INACTIVE').map((l) => l.id);
  if (activeIds.length === 0) {
    return NextResponse.json({ fetched: 0, inserted: 0, updated: 0, locations: 0 });
  }

  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  let orders;
  try {
    orders = await searchOrders(conn.access_token, activeIds, sinceIso);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    await supabase
      .from('pos_connections')
      .update({ last_error: msg })
      .eq('restaurant_id', restaurantId)
      .eq('provider', 'square');
    return NextResponse.json({ error: `Square API failed: ${msg}` }, { status: 502 });
  }

  if (orders.length === 0) {
    await supabase
      .from('pos_connections')
      .update({ last_synced_at: new Date().toISOString(), last_error: null })
      .eq('restaurant_id', restaurantId)
      .eq('provider', 'square');
    return NextResponse.json({ fetched: 0, inserted: 0, updated: 0, locations: activeIds.length });
  }

  // Split into new vs. existing for accurate counts
  const normalized = orders.map(normalizeOrder);
  const externalIds = normalized.map((n) => n.external_id);
  const { data: existing } = await supabase
    .from('pos_orders')
    .select('external_id, id')
    .eq('restaurant_id', restaurantId)
    .eq('provider', 'square')
    .in('external_id', externalIds);
  const existingByExternal = new Map(
    (existing || []).map((r) => [r.external_id, r.id as string])
  );

  // Upsert the headers — returning so we can get the new internal ids
  const headerRows = normalized.map((n) => ({
    restaurant_id: restaurantId,
    provider: 'square',
    external_id: n.external_id,
    location_id: n.location_id,
    state: n.state,
    source_name: n.source_name,
    employee_id: n.employee_id,
    customer_external_id: n.customer_external_id,
    total_cents: n.total_cents,
    tax_cents: n.tax_cents,
    tip_cents: n.tip_cents,
    discount_cents: n.discount_cents,
    currency: n.currency,
    item_count: n.item_count,
    opened_at: n.opened_at,
    closed_at: n.closed_at,
    raw: n.raw,
    synced_at: new Date().toISOString(),
  }));

  const { data: upserted, error: upsertErr } = await supabase
    .from('pos_orders')
    .upsert(headerRows, { onConflict: 'restaurant_id,provider,external_id' })
    .select('id, external_id');

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  // Map external_id -> internal id for line item inserts
  const idByExternal = new Map(
    (upserted || []).map((r) => [r.external_id, r.id as string])
  );

  // Rewrite line items: delete existing for these orders, then bulk insert.
  const orderInternalIds = Array.from(idByExternal.values());
  if (orderInternalIds.length > 0) {
    await supabase
      .from('pos_order_line_items')
      .delete()
      .in('order_id', orderInternalIds);
  }

  const lineRows: Array<Record<string, unknown>> = [];
  for (const n of normalized) {
    const internalId = idByExternal.get(n.external_id);
    if (!internalId) continue;
    for (const li of n.line_items) {
      lineRows.push({
        restaurant_id: restaurantId,
        order_id: internalId,
        catalog_external_id: li.catalog_external_id,
        variation_external_id: li.variation_external_id,
        name: li.name,
        quantity: li.quantity,
        base_price_cents: li.base_price_cents,
        total_price_cents: li.total_price_cents,
        raw: li.raw,
      });
    }
  }

  if (lineRows.length > 0) {
    // Supabase caps single-insert batches around 1000 rows; chunk to be safe.
    const chunkSize = 500;
    for (let i = 0; i < lineRows.length; i += chunkSize) {
      const chunk = lineRows.slice(i, i + chunkSize);
      const { error: linesErr } = await supabase.from('pos_order_line_items').insert(chunk);
      if (linesErr) {
        return NextResponse.json({ error: `Line items insert failed: ${linesErr.message}` }, { status: 500 });
      }
    }
  }

  const inserted = normalized.filter((n) => !existingByExternal.has(n.external_id)).length;
  const updated = normalized.length - inserted;

  await supabase
    .from('pos_connections')
    .update({ last_synced_at: new Date().toISOString(), last_error: null, status: 'active' })
    .eq('restaurant_id', restaurantId)
    .eq('provider', 'square');

  return NextResponse.json({
    days_window: days,
    locations: activeIds.length,
    fetched: orders.length,
    line_items: lineRows.length,
    inserted,
    updated,
  });
}
