import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/api-helpers';
import { listLists, getTotalProfileCount } from '@/lib/klaviyo';

/**
 * POST /api/integrations/klaviyo/sync-lists
 *
 * Pulls Klaviyo lists (audiences) for the connected account and stores them
 * in integration_connections.metadata.lists. Also updates a rough profile
 * count. Safe to re-run.
 */
export async function POST() {
  const ctx = await resolveTenant();
  if (ctx instanceof NextResponse) return ctx;

  const { data: conn, error: connErr } = await ctx.supabase
    .from('integration_connections')
    .select('access_token, metadata')
    .eq('restaurant_id', ctx.restaurantId)
    .eq('provider', 'klaviyo')
    .single();

  if (connErr || !conn || !conn.access_token) {
    return NextResponse.json({ error: 'Klaviyo is not connected' }, { status: 400 });
  }

  let lists;
  let profileSample: number | null = null;
  try {
    lists = await listLists(conn.access_token);
    profileSample = await getTotalProfileCount(conn.access_token);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    await ctx.supabase
      .from('integration_connections')
      .update({ last_error: msg, status: 'error' })
      .eq('restaurant_id', ctx.restaurantId)
      .eq('provider', 'klaviyo');
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const existingMetadata = (conn.metadata || {}) as Record<string, unknown>;
  await ctx.supabase
    .from('integration_connections')
    .update({
      metadata: {
        ...existingMetadata,
        lists: lists.map((l) => ({ id: l.id, name: l.name, updated: l.updated })),
        profile_sample: profileSample,
        synced_at: new Date().toISOString(),
      },
      last_synced_at: new Date().toISOString(),
      last_error: null,
      status: 'active',
    })
    .eq('restaurant_id', ctx.restaurantId)
    .eq('provider', 'klaviyo');

  return NextResponse.json({
    lists: lists.length,
    list_names: lists.slice(0, 10).map((l) => l.name),
    profile_sample: profileSample,
  });
}
