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
