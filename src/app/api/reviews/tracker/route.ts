import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

/**
 * Review Response Tracker
 * Tracks which reviews have been responded to, response time, templates used
 */

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

  const rid = restaurant.restaurant_id;

  // Get all reviews with sentiment
  const { data: reviews } = await supabase
    .from('cortex_review_sentiment')
    .select('review_id, platform, author, rating, review_text, sentiment_score, sentiment_label, summary, analyzed_at')
    .eq('restaurant_id', rid)
    .order('analyzed_at', { ascending: false });

  // Get response records
  const { data: responses } = await supabase
    .from('review_responses')
    .select('*')
    .eq('restaurant_id', rid);

  const responseMap = new Map((responses || []).map(r => [r.review_id, r]));

  const allReviews = (reviews || []).map(r => ({
    ...r,
    response: responseMap.get(r.review_id) || null,
    responded: responseMap.has(r.review_id),
  }));

  const totalReviews = allReviews.length;
  const respondedCount = allReviews.filter(r => r.responded).length;
  const unreplied = allReviews.filter(r => !r.responded);
  const negativeUnreplied = unreplied.filter(r => r.sentiment_label === 'negative' || (r.rating && r.rating <= 2));

  // Average response time
  const responseTimes = (responses || [])
    .filter(r => r.responded_at)
    .map(r => {
      const review = allReviews.find(rv => rv.review_id === r.review_id);
      if (!review?.analyzed_at) return null;
      return (new Date(r.responded_at).getTime() - new Date(review.analyzed_at).getTime()) / (1000 * 60 * 60);
    })
    .filter(Boolean) as number[];

  const avgResponseHours = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((s, v) => s + v, 0) / responseTimes.length)
    : 0;

  // Platform breakdown
  const platformMap: Record<string, { total: number; responded: number }> = {};
  for (const r of allReviews) {
    const p = r.platform || 'unknown';
    if (!platformMap[p]) platformMap[p] = { total: 0, responded: 0 };
    platformMap[p].total++;
    if (r.responded) platformMap[p].responded++;
  }
  const platforms = Object.entries(platformMap).map(([platform, data]) => ({
    platform,
    ...data,
    response_rate: data.total > 0 ? Math.round((data.responded / data.total) * 100) : 0,
  }));

  return NextResponse.json({
    reviews: allReviews.slice(0, 50),
    stats: {
      total_reviews: totalReviews,
      responded: respondedCount,
      response_rate: totalReviews > 0 ? Math.round((respondedCount / totalReviews) * 100) : 0,
      unreplied_count: unreplied.length,
      negative_unreplied: negativeUnreplied.length,
      avg_response_hours: avgResponseHours,
    },
    platforms,
    priority_reviews: negativeUnreplied.slice(0, 10),
  });
}

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();
  const { review_id, response_text } = body;

  if (!review_id || !response_text) {
    return NextResponse.json({ error: 'review_id and response_text required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('review_responses')
    .upsert({
      review_id,
      restaurant_id: restaurant.restaurant_id,
      response_text,
      responded_at: new Date().toISOString(),
      responded_by: userId,
    }, { onConflict: 'review_id,restaurant_id' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
