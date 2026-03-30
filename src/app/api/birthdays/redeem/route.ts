import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code, party_size, check_total } = await request.json();
  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 });

  const supabase = createServerSupabase();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const { data: event, error } = await supabase
    .from('birthday_events')
    .update({
      redeemed: true,
      redemption_date: new Date().toISOString(),
      party_size: party_size || null,
      check_total: check_total || null,
    })
    .eq('redemption_code', code.toUpperCase())
    .eq('restaurant_id', restaurant.restaurant_id)
    .eq('redeemed', false)
    .select()
    .single();

  if (error || !event) {
    return NextResponse.json({ error: 'Invalid or already redeemed code' }, { status: 400 });
  }

  return NextResponse.json({ success: true, event });
}
