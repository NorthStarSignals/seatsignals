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

  // Revenue channels: dine-in, delivery, catering, events, gift cards
  const { data: visits } = await supabase
    .from('visits')
    .select('amount, visit_type, created_at')
    .eq('restaurant_id', rid)
    .limit(2000);

  const allVisits = visits || [];
  const totalRevenue = allVisits.reduce((s, v) => s + (v.amount || 0), 0);

  // Group by visit_type/channel
  const channelMap = new Map<string, { revenue: number; count: number }>();
  for (const v of allVisits) {
    const channel = v.visit_type || 'dine-in';
    const existing = channelMap.get(channel) || { revenue: 0, count: 0 };
    existing.revenue += v.amount || 0;
    existing.count++;
    channelMap.set(channel, existing);
  }

  const channelColors: Record<string, string> = {
    'dine-in': '#E11D48',
    'delivery': '#3b82f6',
    'takeout': '#22c55e',
    'catering': '#f59e0b',
    'events': '#a855f7',
    'gift-card': '#ec4899',
  };

  const channels = Array.from(channelMap.entries())
    .map(([channel, data]) => ({
      channel: channel.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      revenue: Math.round(data.revenue),
      orders: data.count,
      avg_order: data.count > 0 ? Math.round(data.revenue / data.count) : 0,
      pct: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0,
      color: channelColors[channel] || '#71717a',
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Monthly trend by channel
  const monthChannelMap = new Map<string, Record<string, number>>();
  for (const v of allVisits) {
    const month = (v.created_at || '').substring(0, 7);
    const channel = v.visit_type || 'dine-in';
    if (!month) continue;
    if (!monthChannelMap.has(month)) monthChannelMap.set(month, {});
    const entry = monthChannelMap.get(month)!;
    entry[channel] = (entry[channel] || 0) + (v.amount || 0);
  }

  const monthlyTrend = Array.from(monthChannelMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, data]) => ({
      month,
      ...Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, Math.round(v)])
      ),
    }));

  const topChannel = channels[0];

  return NextResponse.json({
    channels,
    monthly_trend: monthlyTrend,
    total_revenue: Math.round(totalRevenue),
    top_channel: topChannel?.channel || 'N/A',
    top_channel_pct: topChannel?.pct || 0,
    channel_keys: Array.from(channelMap.keys()),
  });
}
