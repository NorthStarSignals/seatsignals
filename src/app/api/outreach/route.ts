import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

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

  // Get notifications as outreach log
  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, type, title, message, channel, recipient_email, recipient_phone, status, created_at')
    .eq('restaurant_id', rid)
    .order('created_at', { ascending: false })
    .limit(200);

  const items = notifications || [];

  // Stats
  const total = items.length;
  const sent = items.filter(n => n.status === 'sent' || n.status === 'delivered').length;
  const delivered = items.filter(n => n.status === 'delivered').length;
  const failed = items.filter(n => n.status === 'failed').length;

  // Channel breakdown
  const channels: Record<string, number> = {};
  for (const item of items) {
    const ch = item.channel || 'email';
    channels[ch] = (channels[ch] || 0) + 1;
  }

  const channelBreakdown = Object.entries(channels).map(([channel, count]) => ({
    channel,
    count,
    pct: Math.round((count / Math.max(total, 1)) * 100),
  }));

  // Type breakdown
  const types: Record<string, number> = {};
  for (const item of items) {
    const t = item.type || 'general';
    types[t] = (types[t] || 0) + 1;
  }

  const typeBreakdown = Object.entries(types).map(([type, count]) => ({
    type,
    count,
  }));

  // Daily volume (last 30 days)
  const dailyMap = new Map<string, number>();
  for (const item of items) {
    const day = (item.created_at || '').substring(0, 10);
    if (day) dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
  }

  const dailyVolume = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, count]) => ({ date, count }));

  return NextResponse.json({
    outreach: items.slice(0, 50).map(n => ({
      id: n.id,
      type: n.type || 'general',
      title: n.title,
      message: n.message,
      channel: n.channel || 'email',
      recipient: n.recipient_email || n.recipient_phone || 'Unknown',
      status: n.status || 'sent',
      created_at: n.created_at,
    })),
    stats: {
      total,
      sent,
      delivered,
      failed,
      delivery_rate: total > 0 ? Math.round((delivered / total) * 100) : 0,
    },
    channel_breakdown: channelBreakdown,
    type_breakdown: typeBreakdown,
    daily_volume: dailyVolume,
  });
}

export async function POST(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();
  const { type, title, message, channel, recipient_email, recipient_phone } = body;

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      restaurant_id: restaurant.restaurant_id,
      type: type || 'manual',
      title,
      message,
      channel: channel || 'email',
      recipient_email,
      recipient_phone,
      status: 'sent',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
