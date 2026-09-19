import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const days = parseInt(request.nextUrl.searchParams.get('days') || '30', 10);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const { data: metrics } = await supabase
    .from('delivery_metrics')
    .select('*')
    .eq('restaurant_id', restaurant.restaurant_id)
    .gte('date', cutoffStr)
    .order('date', { ascending: true });

  const rows = metrics || [];

  // Aggregate per-platform summaries
  const platformMap: Record<string, {
    platform: string;
    orders: number;
    revenue: number;
    total_aov: number;
    aov_count: number;
    total_rating: number;
    rating_count: number;
  }> = {};

  for (const row of rows) {
    if (!platformMap[row.platform]) {
      platformMap[row.platform] = {
        platform: row.platform,
        orders: 0,
        revenue: 0,
        total_aov: 0,
        aov_count: 0,
        total_rating: 0,
        rating_count: 0,
      };
    }
    const p = platformMap[row.platform];
    p.orders += row.orders;
    p.revenue += row.revenue;
    p.total_aov += row.avg_order_value;
    p.aov_count += 1;
    if (row.rating > 0) {
      p.total_rating += row.rating;
      p.rating_count += 1;
    }
  }

  const platforms = Object.values(platformMap).map((p) => ({
    platform: p.platform,
    orders: p.orders,
    revenue: parseFloat(p.revenue.toFixed(2)),
    avg_order_value: p.aov_count > 0 ? parseFloat((p.total_aov / p.aov_count).toFixed(2)) : 0,
    rating: p.rating_count > 0 ? parseFloat((p.total_rating / p.rating_count).toFixed(1)) : 0,
    revenue_per_order: p.orders > 0 ? parseFloat((p.revenue / p.orders).toFixed(2)) : 0,
  }));

  const total_revenue = platforms.reduce((s, p) => s + p.revenue, 0);
  const total_orders = platforms.reduce((s, p) => s + p.orders, 0);
  const avg_order_value = total_orders > 0 ? parseFloat((total_revenue / total_orders).toFixed(2)) : 0;
  const platform_count = platforms.length;

  const best_platform = platforms.length > 0
    ? platforms.reduce((best, p) => (p.revenue > best.revenue ? p : best), platforms[0]).platform
    : '';

  // Daily trends for chart
  const daily_trends = rows.map((row) => ({
    date: row.date,
    platform: row.platform,
    revenue: row.revenue,
    orders: row.orders,
  }));

  return NextResponse.json({
    metrics: {
      total_revenue: parseFloat(total_revenue.toFixed(2)),
      avg_order_value,
      total_orders,
      platform_count,
    },
    platforms,
    daily_trends,
    best_platform,
  });
}

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const { error } = await supabase.from('delivery_metrics').insert({
    restaurant_id: restaurant.restaurant_id,
    platform: body.platform,
    date: body.date,
    orders: body.orders,
    revenue: body.revenue,
    avg_order_value: body.avg_order_value,
    rating: body.rating,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
