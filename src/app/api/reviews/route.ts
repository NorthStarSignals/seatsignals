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

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*')
    .eq('restaurant_id', restaurant.restaurant_id)
    .order('created_at', { ascending: false })
    .limit(100);

  const allReviews = reviews || [];
  const responded = allReviews.filter(r => r.response_status === 'posted');
  const avgRating = allReviews.length > 0
    ? (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1)
    : '--';

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const thisMonth = allReviews.filter(r => new Date(r.created_at) >= startOfMonth);

  return NextResponse.json({
    reviews: allReviews,
    stats: {
      avg_rating: avgRating,
      total: allReviews.length,
      response_rate: allReviews.length > 0
        ? Math.round((responded.length / allReviews.length) * 100)
        : 0,
      this_month: thisMonth.length,
    },
  });
}
