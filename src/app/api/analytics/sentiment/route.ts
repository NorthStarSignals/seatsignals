import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

async function getRestaurant(supabase: ReturnType<typeof createServerSupabase>, userId: string) {
  const { data } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();
  return data;
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const rid = restaurant.restaurant_id;

  // Get reviews with sentiment data
  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, customer_name, rating, review_text, sentiment, source, created_at')
    .eq('restaurant_id', rid)
    .order('created_at', { ascending: false })
    .limit(500);

  const allReviews = reviews || [];

  // Sentiment breakdown
  const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
  for (const r of allReviews) {
    const s = (r.sentiment || 'neutral').toLowerCase();
    if (s === 'positive') sentimentCounts.positive++;
    else if (s === 'negative') sentimentCounts.negative++;
    else sentimentCounts.neutral++;
  }
  const total = allReviews.length || 1;

  // Sentiment over time (group by month)
  const monthMap = new Map<string, { positive: number; neutral: number; negative: number; total: number }>();
  for (const r of allReviews) {
    const month = (r.created_at || '').substring(0, 7); // YYYY-MM
    if (!month) continue;
    if (!monthMap.has(month)) monthMap.set(month, { positive: 0, neutral: 0, negative: 0, total: 0 });
    const entry = monthMap.get(month)!;
    const s = (r.sentiment || 'neutral').toLowerCase();
    if (s === 'positive') entry.positive++;
    else if (s === 'negative') entry.negative++;
    else entry.neutral++;
    entry.total++;
  }

  const sentimentTrend = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, data]) => ({
      month,
      positive: Math.round((data.positive / data.total) * 100),
      neutral: Math.round((data.neutral / data.total) * 100),
      negative: Math.round((data.negative / data.total) * 100),
      total: data.total,
    }));

  // Source breakdown
  const sourceMap = new Map<string, { positive: number; negative: number; total: number }>();
  for (const r of allReviews) {
    const src = r.source || 'Direct';
    if (!sourceMap.has(src)) sourceMap.set(src, { positive: 0, negative: 0, total: 0 });
    const entry = sourceMap.get(src)!;
    entry.total++;
    if ((r.sentiment || '').toLowerCase() === 'positive') entry.positive++;
    if ((r.sentiment || '').toLowerCase() === 'negative') entry.negative++;
  }

  const bySource = Array.from(sourceMap.entries()).map(([source, data]) => ({
    source,
    positive_pct: Math.round((data.positive / data.total) * 100),
    negative_pct: Math.round((data.negative / data.total) * 100),
    total: data.total,
  }));

  // Rating distribution
  const ratingDist = [1, 2, 3, 4, 5].map(star => ({
    rating: star,
    count: allReviews.filter(r => r.rating === star).length,
    pct: Math.round((allReviews.filter(r => r.rating === star).length / total) * 100),
  }));

  // Extract common keywords from reviews (simple word frequency)
  const wordCounts = new Map<string, { count: number; sentiment: string }>();
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'was', 'are', 'were', 'it', 'we', 'i', 'my', 'our', 'this', 'that', 'very', 'so', 'too', 'just', 'not', 'no', 'had', 'have', 'has', 'been', 'be', 'will', 'would', 'could', 'should', 'can', 'do', 'did', 'get', 'got', 'here', 'there', 'they', 'them', 'their']);
  for (const r of allReviews) {
    if (!r.review_text) continue;
    const words = r.review_text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter((w: string) => w.length > 3 && !stopWords.has(w));
    for (const word of words) {
      const existing = wordCounts.get(word);
      if (existing) {
        existing.count++;
      } else {
        wordCounts.set(word, { count: 1, sentiment: r.sentiment || 'neutral' });
      }
    }
  }

  const topKeywords = Array.from(wordCounts.entries())
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 20)
    .map(([word, data]) => ({ word, count: data.count, sentiment: data.sentiment }));

  // Recent negative reviews (for attention)
  const negativeReviews = allReviews
    .filter(r => (r.sentiment || '').toLowerCase() === 'negative' || (r.rating && r.rating <= 2))
    .slice(0, 10)
    .map(r => ({
      id: r.id,
      customer_name: r.customer_name || 'Anonymous',
      rating: r.rating,
      text: r.review_text || '',
      source: r.source || 'Direct',
      created_at: r.created_at,
    }));

  // Overall sentiment score (0-100)
  const sentimentScore = Math.round(
    ((sentimentCounts.positive * 100 + sentimentCounts.neutral * 50 + sentimentCounts.negative * 0) / total)
  );

  // Avg rating
  const avgRating = allReviews.length > 0
    ? Math.round(allReviews.reduce((s, r) => s + (r.rating || 0), 0) / allReviews.length * 10) / 10
    : 0;

  return NextResponse.json({
    sentiment_score: sentimentScore,
    avg_rating: avgRating,
    total_reviews: allReviews.length,
    breakdown: {
      positive: sentimentCounts.positive,
      neutral: sentimentCounts.neutral,
      negative: sentimentCounts.negative,
      positive_pct: Math.round((sentimentCounts.positive / total) * 100),
      neutral_pct: Math.round((sentimentCounts.neutral / total) * 100),
      negative_pct: Math.round((sentimentCounts.negative / total) * 100),
    },
    trend: sentimentTrend,
    by_source: bySource,
    rating_distribution: ratingDist,
    top_keywords: topKeywords,
    negative_reviews: negativeReviews,
  });
}
