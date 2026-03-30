import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { review_id, response_text } = await request.json();
  if (!review_id) return NextResponse.json({ error: 'review_id required' }, { status: 400 });

  const supabase = createServerSupabase();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const { error } = await supabase
    .from('reviews')
    .update({
      response_text: response_text,
      response_status: 'posted',
      responded_at: new Date().toISOString(),
    })
    .eq('review_id', review_id)
    .eq('restaurant_id', restaurant.restaurant_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
