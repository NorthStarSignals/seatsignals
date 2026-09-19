import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Active deals + recently expired (last 30 days)
  const { data: deals, error } = await supabase
    .from('flash_deals')
    .select('*')
    .eq('restaurant_id', restaurant.restaurant_id)
    .or(`active.eq.true,expires_at.gte.${thirtyDaysAgo.toISOString()}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Flash deals fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 });
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const allDeals = deals || [];
  const activeDeals = allDeals.filter(
    (d) => d.active && new Date(d.expires_at) > now && new Date(d.starts_at) <= now
  );
  const monthDeals = allDeals.filter(
    (d) => new Date(d.created_at) >= startOfMonth
  );
  const totalRedemptions = monthDeals.reduce(
    (sum, d) => sum + (d.current_redemptions || 0),
    0
  );
  // Estimate $25 avg per redemption
  const estimatedRevenue = totalRedemptions * 25;

  return NextResponse.json({
    deals: allDeals,
    stats: {
      active_count: activeDeals.length,
      total_redemptions: totalRedemptions,
      estimated_revenue: estimatedRevenue,
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
    title,
    description,
    deal_type,
    discount_value,
    starts_at,
    expires_at,
    max_redemptions,
    target_audience,
    channel,
  } = body;

  if (!title || !deal_type || !discount_value || !starts_at || !expires_at) {
    return NextResponse.json(
      { error: 'Missing required fields: title, deal_type, discount_value, starts_at, expires_at' },
      { status: 400 }
    );
  }

  const redemption_code = `${deal_type.toUpperCase().slice(0, 2)}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const { data, error } = await supabase
    .from('flash_deals')
    .insert({
      restaurant_id: restaurant.restaurant_id,
      title,
      description: description || null,
      deal_type,
      discount_value,
      starts_at,
      expires_at,
      max_redemptions: max_redemptions || null,
      current_redemptions: 0,
      redemption_code,
      target_audience: target_audience || 'all',
      channel: channel || 'sms',
      message_sent: false,
      active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Flash deal insert error:', error);
    return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PUT(req: NextRequest) {
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
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing deal id' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('flash_deals')
    .update(updates)
    .eq('id', id)
    .eq('restaurant_id', restaurant.restaurant_id)
    .select()
    .single();

  if (error) {
    console.error('Flash deal update error:', error);
    return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 });
  }

  return NextResponse.json(data);
}
