import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

/**
 * Public API: Feedback Wall
 * Returns positive reviews for a public-facing testimonial wall
 * No auth required — this is a public endpoint
 */

export async function GET(
  _request: Request,
  { params }: { params: { restaurantId: string } }
) {
  const { restaurantId } = params;
  const supabase = createServerSupabase();

  // Verify restaurant exists
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id, name')
    .eq('restaurant_id', restaurantId)
    .single();

  if (!restaurant) {
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
  }

  // Fetch positive reviews (4+ stars or positive sentiment)
  const { data: reviews } = await supabase
    .from('cortex_review_sentiment')
    .select('author, rating, review_text, platform, sentiment_label, analyzed_at')
    .eq('restaurant_id', restaurantId)
    .or('rating.gte.4,sentiment_label.eq.positive')
    .order('analyzed_at', { ascending: false })
    .limit(50);

  return NextResponse.json({
    restaurant_name: restaurant.name,
    reviews: reviews || [],
  });
}
