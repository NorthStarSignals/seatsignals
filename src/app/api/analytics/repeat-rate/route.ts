import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

async function getRestaurant(supabase: ReturnType<typeof createServerSupabase>, userId: string) {
  const { data } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();
  return data;
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const rid = restaurant.restaurant_id;

  const { data: customers } = await supabase
    .from('customers')
    .select('id, visit_count, total_spend, first_seen, last_visit, created_at')
    .eq('restaurant_id', rid);

  const all = customers || [];
  const total = all.length || 1;

  const oneTimers = all.filter(c => (c.visit_count || 0) <= 1);
  const repeaters = all.filter(c => (c.visit_count || 0) >= 2);
  const loyalists = all.filter(c => (c.visit_count || 0) >= 5);
  const superLoyalists = all.filter(c => (c.visit_count || 0) >= 10);

  const repeatRate = Math.round((repeaters.length / total) * 100);
  const avgVisits = all.length > 0 ? Math.round(all.reduce((s, c) => s + (c.visit_count || 0), 0) / all.length * 10) / 10 : 0;

  // Visit frequency distribution
  const visitDist = [
    { range: '1 visit', count: oneTimers.length, pct: Math.round((oneTimers.length / total) * 100) },
    { range: '2-4 visits', count: repeaters.length - loyalists.length, pct: Math.round(((repeaters.length - loyalists.length) / total) * 100) },
    { range: '5-9 visits', count: loyalists.length - superLoyalists.length, pct: Math.round(((loyalists.length - superLoyalists.length) / total) * 100) },
    { range: '10+ visits', count: superLoyalists.length, pct: Math.round((superLoyalists.length / total) * 100) },
  ];

  // Monthly repeat rate trend
  const monthMap = new Map<string, { new: number; repeat: number }>();
  for (const c of all) {
    const month = (c.created_at || '').substring(0, 7);
    if (!month) continue;
    if (!monthMap.has(month)) monthMap.set(month, { new: 0, repeat: 0 });
    const entry = monthMap.get(month)!;
    if ((c.visit_count || 0) >= 2) entry.repeat++;
    else entry.new++;
  }

  const trend = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, data]) => ({
      month,
      repeat_rate: data.new + data.repeat > 0 ? Math.round((data.repeat / (data.new + data.repeat)) * 100) : 0,
      new_customers: data.new,
      repeat_customers: data.repeat,
    }));

  // Revenue from repeaters vs one-timers
  const repeaterRevenue = repeaters.reduce((s, c) => s + (c.total_spend || 0), 0);
  const oneTimeRevenue = oneTimers.reduce((s, c) => s + (c.total_spend || 0), 0);
  const totalRevenue = repeaterRevenue + oneTimeRevenue;

  return NextResponse.json({
    repeat_rate: repeatRate,
    avg_visits: avgVisits,
    total_customers: all.length,
    breakdown: {
      one_timers: oneTimers.length,
      repeaters: repeaters.length,
      loyalists: loyalists.length,
      super_loyalists: superLoyalists.length,
    },
    visit_distribution: visitDist,
    trend,
    revenue_split: {
      repeater_revenue: Math.round(repeaterRevenue),
      one_time_revenue: Math.round(oneTimeRevenue),
      repeater_pct: totalRevenue > 0 ? Math.round((repeaterRevenue / totalRevenue) * 100) : 0,
    },
  });
}
