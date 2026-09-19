import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const { userId } = auth();
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
    .order('day_of_week', { ascending: true })
    .order('time_start', { ascending: true });

  const all = deadHours || [];

  // Compute stats from this month's data
  const thisMonth = all.filter(
    (d) => d.triggered_at && new Date(d.triggered_at) >= startOfMonth
  );
  const redeemed = thisMonth.filter((d) => d.seats_filled > 0);
  const totalRevenue = redeemed.reduce((sum, d) => sum + (d.revenue || 0), 0);
  const redemptionRate =
    thisMonth.length > 0 ? Math.round((redeemed.length / thisMonth.length) * 100) : 0;

  // Find best performing window
  const windowPerf: Record<string, { redeemed: number; total: number }> = {};
  for (const d of thisMonth) {
    const key = `${d.day_of_week} ${d.time_start}-${d.time_end}`;
    if (!windowPerf[key]) windowPerf[key] = { redeemed: 0, total: 0 };
    windowPerf[key].total++;
    if (d.seats_filled > 0) windowPerf[key].redeemed++;
  }

  let bestWindow = '--';
  let bestRate = 0;
  for (const [key, perf] of Object.entries(windowPerf)) {
    const rate = perf.total > 0 ? perf.redeemed / perf.total : 0;
    if (rate > bestRate) {
      bestRate = rate;
      bestWindow = key;
    }
  }

  return NextResponse.json({
    dead_hours: all,
    config: restaurant.dead_hours_config || [],
    stats: {
      total_revenue: totalRevenue,
      redemption_rate: redemptionRate,
      messages_sent: thisMonth.length,
      best_window: bestWindow,
    },
  });
}

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await req.json();
  const {
    day_of_week,
    time_start,
    time_end,
    promotion_type,
    channel,
    redemption_code,
    discount_value,
    target_audience,
    message_template,
  } = body;

  if (!day_of_week || !time_start || !time_end || !promotion_type || !channel) {
    return NextResponse.json(
      { error: 'Missing required fields: day_of_week, time_start, time_end, promotion_type, channel' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('dead_hours')
    .insert({
      restaurant_id: restaurant.restaurant_id,
      day_of_week,
      time_start,
      time_end,
      promotion_type,
      channel,
      redemption_code: redemption_code || Math.random().toString(36).substring(2, 8).toUpperCase(),
      discount_value: discount_value || null,
      target_audience: target_audience || 'all',
      message_template: message_template || null,
      seats_filled: 0,
      revenue: 0,
      cost: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Dead hours insert error:', error);
    return NextResponse.json({ error: 'Failed to create promotion' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
