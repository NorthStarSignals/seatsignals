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

  const rid = restaurant.restaurant_id;

  // ─── Review Sentiment ───
  const { data: sentimentRows } = await supabase
    .from('cortex_review_sentiment')
    .select('review_id, platform, author, rating, review_text, sentiment_score, sentiment_label, summary, analyzed_at')
    .eq('restaurant_id', rid)
    .order('analyzed_at', { ascending: false });

  const allSentiment = sentimentRows || [];

  // Distribution by label
  const distributionMap: Record<string, number> = {};
  let sentimentSum = 0;
  for (const row of allSentiment) {
    const label = row.sentiment_label || 'neutral';
    distributionMap[label] = (distributionMap[label] || 0) + 1;
    sentimentSum += row.sentiment_score ?? 0;
  }
  const distribution = Object.entries(distributionMap).map(([label, count]) => ({ label, count }));
  const averageSentiment = allSentiment.length > 0
    ? Math.round((sentimentSum / allSentiment.length) * 100) / 100
    : 0;

  // Recent reviews (latest 20)
  const recentReviews = allSentiment.slice(0, 20).map(r => ({
    author: r.author,
    rating: r.rating,
    sentiment_score: r.sentiment_score,
    sentiment_label: r.sentiment_label,
    summary: r.summary,
    platform: r.platform,
  }));

  // ─── Customer Segments ───
  const { data: segmentRows } = await supabase
    .from('cortex_customer_segments')
    .select('customer_id, customer_name, segment, visit_count, total_spend, avg_spend_per_visit, days_since_last_visit, lifetime_value_score, churn_risk_score, ai_summary')
    .eq('restaurant_id', rid);

  const allSegments = segmentRows || [];

  // Distribution by segment
  const segDistMap: Record<string, number> = {};
  for (const row of allSegments) {
    const seg = row.segment || 'Unknown';
    segDistMap[seg] = (segDistMap[seg] || 0) + 1;
  }
  const segmentDistribution = Object.entries(segDistMap).map(([segment, count]) => ({ segment, count }));

  // Top VIPs
  const topVips = allSegments
    .filter(r => r.segment === 'VIP')
    .sort((a, b) => (b.lifetime_value_score ?? 0) - (a.lifetime_value_score ?? 0))
    .slice(0, 10)
    .map(r => ({
      customer_name: r.customer_name,
      visit_count: r.visit_count,
      total_spend: r.total_spend,
      ai_summary: r.ai_summary,
    }));

  // At-Risk customers
  const atRisk = allSegments
    .filter(r => r.segment === 'At-Risk')
    .sort((a, b) => (b.churn_risk_score ?? 0) - (a.churn_risk_score ?? 0))
    .slice(0, 10)
    .map(r => ({
      customer_name: r.customer_name,
      days_since_last_visit: r.days_since_last_visit,
      churn_risk_score: r.churn_risk_score,
      ai_summary: r.ai_summary,
    }));

  // ─── Restaurant Digest ───
  const { data: digest } = await supabase
    .from('cortex_restaurant_digest')
    .select('digest_type, period_start, period_end, total_revenue, total_visits, new_customers, avg_sentiment, ai_digest, recommendations, analyzed_at')
    .eq('restaurant_id', rid)
    .eq('digest_type', 'weekly')
    .order('analyzed_at', { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({
    sentiment: {
      average: averageSentiment,
      total_reviews: allSentiment.length,
      distribution,
      recent: recentReviews,
    },
    segments: {
      total_customers: allSegments.length,
      distribution: segmentDistribution,
      top_vips: topVips,
      at_risk: atRisk,
    },
    digest: digest || null,
  });
}
