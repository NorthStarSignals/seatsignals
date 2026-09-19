import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/api-helpers';

/**
 * GET /api/integrations/square/catalog
 *
 * Returns the Square-synced catalog items for this tenant. Empty array if
 * Square isn't connected or the catalog hasn't been synced yet.
 */
export async function GET() {
  const ctx = await resolveTenant();
  if (ctx instanceof NextResponse) return ctx;

  const { data, error } = await ctx.supabase
    .from('pos_catalog_items')
    .select('id, external_id, name, description, category, price_cents, currency, sku, image_url, is_active, synced_at')
    .eq('restaurant_id', ctx.restaurantId)
    .eq('provider', 'square')
    .order('name', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data || [] });
}
