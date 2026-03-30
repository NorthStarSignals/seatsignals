import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id, dead_hours_config')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: deadHours } = await supabase
    .from('dead_hours')
    .select('*')
    .eq('restaurant_id', restaurant.restaurant_id)
    .gte('triggered_at', startOfMonth.toISOString())
    .order('triggered_at', { ascending: false });

  const all = deadHours || [];
  const redeemed = all.filter(d => d.seats_filled > 0);
  const totalRevenue = redeemed.reduce((sum, d) => sum + (d.revenue || 0), 0);
  const redemptionRate = all.length > 0 ? Math.round((redeemed.length / all.length) * 100) : 0;

  // Find best performing window
  const windowPerf: Record<string, { redeemed: number; total: number }> = {};
  for (const d of all) {
    const key = `${d.day_of_week} ${d.time_start}-${d.time_end}`;
    if (!windowPerf[key]) windowPerf[key] = { redeemed: 0, total: 0 };
    windowPerf[key].total++;
    if (d.seats_filled > 0) windowPerf[key].redeemed++;
  }

  let bestWindow = '--';
  let bestRate = 0;
  for (const [key, perf] of Object.entries(windowPerf)) {
    const rate = perf.total > 0 ? perf.redeemed / perf.total : 0;
    if (rate > bestRate) { bestRate = rate; bestWindow = key; }
  }

  return NextResponse.json({
    dead_hours: all,
    config: restaurant.dead_hours_config || [],
    stats: {
      total_revenue: totalRevenue,
      redemption_rate: redemptionRate,
      messages_sent: all.length,
      best_window: bestWindow,
    },
  });
}
