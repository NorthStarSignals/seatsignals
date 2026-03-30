import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code, revenue } = await request.json();
  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const { data, error } = await supabase
    .from('dead_hours')
    .update({
      seats_filled: 1,
      revenue: revenue || 0,
    })
    .eq('redemption_code', code.toUpperCase())
    .eq('restaurant_id', restaurant.restaurant_id)
    .eq('seats_filled', 0)
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: 'Invalid or already redeemed code' }, { status: 400 });

  return NextResponse.json({ success: true });
}
