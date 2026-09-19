import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/api-helpers';

/**
 * GET /api/metrics/pos-summary
 *
 * High-level revenue KPIs for the main dashboard. All computed from pos_orders.
 * Returns zeros (not nulls) when there's no data so the UI doesn't have to
 * special-case.
 */
export async function GET() {
  const ctx = await resolveTenant();
  if (ctx instanceof NextResponse) return ctx;
  const { supabase, restaurantId } = ctx;

  // Pull every order in the last 30 days — small enough to aggregate in JS,
  // big enough to cover all of our derived metrics (today, WTD, 7d trend).
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows, error } = await supabase
    .from('pos_orders')
    .select('total_cents, tip_cents, item_count, opened_at, state')
    .eq('restaurant_id', restaurantId)
    .gte('opened_at', since)
    .neq('state', 'CANCELED');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  let todayRevenue = 0;
  let todayCovers = 0;
  let todayOrders = 0;
  let weekRevenue = 0;
  let weekCovers = 0;
  let prevWeekRevenue = 0;
  let totalRevenue = 0;
  let totalOrders = 0;
  let totalTips = 0;
  const dailyRevenue = new Map<string, number>(); // yyyy-mm-dd

  for (const r of rows || []) {
    const opened = r.opened_at ? new Date(r.opened_at) : null;
    if (!opened) continue;
    const cents = r.total_cents || 0;
    const covers = r.item_count || 0;

    totalRevenue += cents;
    totalOrders += 1;
    totalTips += r.tip_cents || 0;

    const dayKey = opened.toISOString().slice(0, 10);
    dailyRevenue.set(dayKey, (dailyRevenue.get(dayKey) || 0) + cents);

    if (opened >= todayStart) {
      todayRevenue += cents;
      todayCovers += covers;
      todayOrders += 1;
    }
    if (opened >= weekStart) {
      weekRevenue += cents;
      weekCovers += covers;
    } else if (opened >= prevWeekStart) {
      prevWeekRevenue += cents;
    }
  }

  const avgCheckCents = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const wowPct =
    prevWeekRevenue > 0 ? Math.round(((weekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100) : null;

  // Flatten daily revenue into last-14-days series for mini sparkline
  const dailySeries: Array<{ date: string; cents: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailySeries.push({ date: key, cents: dailyRevenue.get(key) || 0 });
  }

  return NextResponse.json({
    has_data: totalOrders > 0,
    window_days: 30,
    today: { revenue_cents: todayRevenue, covers: todayCovers, orders: todayOrders },
    week: { revenue_cents: weekRevenue, covers: weekCovers, wow_pct: wowPct },
    totals: {
      orders: totalOrders,
      revenue_cents: totalRevenue,
      tips_cents: totalTips,
      avg_check_cents: avgCheckCents,
    },
    daily: dailySeries,
  });
}
