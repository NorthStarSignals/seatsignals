import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

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

  const { data: metrics } = await supabase
    .from('delivery_metrics')
    .select('*')
    .eq('restaurant_id', restaurant.restaurant_id)
    .order('date', { ascending: false });

  return NextResponse.json({ metrics: metrics || [] });
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
