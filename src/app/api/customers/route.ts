import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

async function getRestaurant(supabase: ReturnType<typeof createServerSupabase>, userId: string) {
  const { data } = await supabase.from('restaurants').select('restaurant_id').eq('clerk_user_id', userId).single();
  return data;
}

export async function GET(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const search = request.nextUrl.searchParams.get('search') || '';

  let query = supabase
    .from('customers')
    .select('*')
    .eq('restaurant_id', restaurant.restaurant_id)
    .order('last_seen', { ascending: false });

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error } = await query.limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get stats
  const { count: totalCount } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurant.restaurant_id);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { count: newThisWeek } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurant.restaurant_id)
    .gte('first_seen', weekAgo.toISOString());

  return NextResponse.json({
    customers: data,
    stats: {
      total: totalCount || 0,
      new_this_week: newThisWeek || 0,
    },
  });
}

export async function POST(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();
  const { data, error } = await supabase
    .from('customers')
    .insert({
      restaurant_id: restaurant.restaurant_id,
      first_name: body.first_name,
      email: body.email || null,
      phone: body.phone || null,
      source: 'manual',
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      visit_count: 0,
      total_spend: 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();
  const { customer_id, ...fields } = body;

  const { data: existing } = await supabase
    .from('customers')
    .select('customer_id')
    .eq('customer_id', customer_id)
    .eq('restaurant_id', restaurant.restaurant_id)
    .single();

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data, error } = await supabase
    .from('customers')
    .update(fields)
    .eq('customer_id', customer_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const customer_id = searchParams.get('id');

  const { data: existing } = await supabase
    .from('customers')
    .select('customer_id')
    .eq('customer_id', customer_id)
    .eq('restaurant_id', restaurant.restaurant_id)
    .single();

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { error } = await supabase.from('customers').delete().eq('customer_id', customer_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
