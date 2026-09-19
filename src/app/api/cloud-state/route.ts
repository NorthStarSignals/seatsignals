import { resolveTenant } from '@/lib/api-helpers';
import { NextResponse } from 'next/server';

/**
 * Generic JSON key-value store, scoped to the caller's restaurant.
 *
 *   GET  /api/cloud-state?key=seatsignals_foo       → returns the JSON value (or null)
 *   PUT  /api/cloud-state?key=seatsignals_foo       → upserts { value } → stores it
 *   DELETE /api/cloud-state?key=seatsignals_foo     → deletes the row
 */

export async function GET(request: Request) {
  const ctx = await resolveTenant();
  if (ctx instanceof NextResponse) return ctx;

  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });

  const { data, error } = await ctx.supabase
    .from('cloud_state')
    .select('value')
    .eq('restaurant_id', ctx.restaurantId)
    .eq('key', key)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ value: data?.value ?? null });
}

export async function PUT(request: Request) {
  const ctx = await resolveTenant();
  if (ctx instanceof NextResponse) return ctx;

  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || !('value' in body)) {
    return NextResponse.json({ error: 'body must be { value: ... }' }, { status: 400 });
  }

  const { error } = await ctx.supabase
    .from('cloud_state')
    .upsert(
      { restaurant_id: ctx.restaurantId, key, value: (body as { value: unknown }).value },
      { onConflict: 'restaurant_id,key' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const ctx = await resolveTenant();
  if (ctx instanceof NextResponse) return ctx;

  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });

  const { error } = await ctx.supabase
    .from('cloud_state')
    .delete()
    .eq('restaurant_id', ctx.restaurantId)
    .eq('key', key);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
