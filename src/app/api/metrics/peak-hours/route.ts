import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/api-helpers';

/**
 * GET /api/metrics/peak-hours?days=30
 *
 * Buckets the last N days of orders by hour-of-day (0–23), returning both
 * revenue and order count per hour. Used by /dashboard/analytics/peak-hours.
 */
export async function GET(request: Request) {
  const ctx = await resolveTenant();
  if (ctx instanceof NextResponse) return ctx;
  const { supabase, restaurantId } = ctx;

  const url = new URL(request.url);
  const daysParam = parseInt(url.searchParams.get('days') || '30', 10);
  const days = Math.min(Math.max(1, isNaN(daysParam) ? 30 : daysParam), 365);

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows, error } = await supabase
    .from('pos_orders')
    .select('total_cents, opened_at')
    .eq('restaurant_id', restaurantId)
    .gte('opened_at', since)
    .neq('state', 'CANCELED');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const hourly = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    revenue_cents: 0,
    orders: 0,
  }));
  const dow = Array.from({ length: 7 }, (_, d) => ({
    day: d, // 0 = Sun
    revenue_cents: 0,
    orders: 0,
  }));

  for (const r of rows || []) {
    if (!r.opened_at) continue;
    const d = new Date(r.opened_at);
    const h = d.getHours();
    hourly[h].revenue_cents += r.total_cents || 0;
    hourly[h].orders += 1;
    dow[d.getDay()].revenue_cents += r.total_cents || 0;
    dow[d.getDay()].orders += 1;
  }

  return NextResponse.json({
    has_data: (rows || []).length > 0,
    window_days: days,
    hourly,
    by_day_of_week: dow,
    total_orders: (rows || []).length,
  });
}
