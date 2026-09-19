import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/api-helpers';

/**
 * GET /api/integrations/square
 *   Returns the current Square connection status for this tenant, or null.
 *
 * DELETE /api/integrations/square
 *   Disconnects (deletes the row). Does NOT revoke the token on Square's side
 *   — for that we'd hit /oauth2/revoke. Safe as a user-facing "disconnect".
 */
export async function GET() {
  const ctx = await resolveTenant();
  if (ctx instanceof NextResponse) return ctx;

  const { data } = await ctx.supabase
    .from('pos_connections')
    .select('merchant_id, environment, scopes, connected_at, last_synced_at, status, last_error')
    .eq('restaurant_id', ctx.restaurantId)
    .eq('provider', 'square')
    .maybeSingle();

  // Also report how many catalog items have been synced
  let catalogCount = 0;
  if (data) {
    const { count } = await ctx.supabase
      .from('pos_catalog_items')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', ctx.restaurantId)
      .eq('provider', 'square');
    catalogCount = count || 0;
  }

  return NextResponse.json({ connection: data || null, catalog_count: catalogCount });
}

export async function DELETE() {
  const ctx = await resolveTenant();
  if (ctx instanceof NextResponse) return ctx;

  const { error } = await ctx.supabase
    .from('pos_connections')
    .delete()
    .eq('restaurant_id', ctx.restaurantId)
    .eq('provider', 'square');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
