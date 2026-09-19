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

  // Get survey responses that have NPS-like data (rating 1-10)
  const { data: surveys } = await supabase
    .from('survey_responses')
    .select('id, rating, feedback, customer_name, created_at')
    .eq('restaurant_id', rid)
    .not('rating', 'is', null)
    .order('created_at', { ascending: false })
    .limit(500);

  const responses = (surveys || []).map(s => ({
    ...s,
    // Convert 1-5 rating to 1-10 NPS scale
    nps_score: Math.min(10, Math.round((s.rating || 3) * 2)),
  }));

  const total = responses.length || 1;

  // NPS categories
  const promoters = responses.filter(r => r.nps_score >= 9);
  const passives = responses.filter(r => r.nps_score >= 7 && r.nps_score <= 8);
  const detractors = responses.filter(r => r.nps_score <= 6);

  const npsScore = Math.round(
    ((promoters.length - detractors.length) / total) * 100
  );

  // NPS over time (monthly)
  const monthMap = new Map<string, { promoters: number; detractors: number; total: number }>();
  for (const r of responses) {
    const month = (r.created_at || '').substring(0, 7);
    if (!month) continue;
    if (!monthMap.has(month)) monthMap.set(month, { promoters: 0, detractors: 0, total: 0 });
    const entry = monthMap.get(month)!;
    entry.total++;
    if (r.nps_score >= 9) entry.promoters++;
    if (r.nps_score <= 6) entry.detractors++;
  }

  const npsTrend = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, data]) => ({
      month,
      nps: data.total > 0 ? Math.round(((data.promoters - data.detractors) / data.total) * 100) : 0,
      responses: data.total,
    }));

  // Score distribution
  const distribution = Array.from({ length: 11 }, (_, i) => ({
    score: i,
    count: responses.filter(r => r.nps_score === i).length,
    category: i >= 9 ? 'Promoter' : i >= 7 ? 'Passive' : 'Detractor',
    color: i >= 9 ? '#22c55e' : i >= 7 ? '#f59e0b' : '#ef4444',
  }));

  // CSAT (average rating as percentage)
  const avgRating = responses.length > 0
    ? responses.reduce((s, r) => s + (r.nps_score || 0), 0) / responses.length
    : 0;
  const csatScore = Math.round((avgRating / 10) * 100);

  // Recent detractor feedback
  const detractorFeedback = detractors
    .filter(d => d.feedback)
    .slice(0, 10)
    .map(d => ({
      id: d.id,
      name: d.customer_name || 'Anonymous',
      score: d.nps_score,
      feedback: d.feedback,
      date: d.created_at,
    }));

  return NextResponse.json({
    nps_score: npsScore,
    csat_score: csatScore,
    total_responses: responses.length,
    breakdown: {
      promoters: promoters.length,
      promoters_pct: Math.round((promoters.length / total) * 100),
      passives: passives.length,
      passives_pct: Math.round((passives.length / total) * 100),
      detractors: detractors.length,
      detractors_pct: Math.round((detractors.length / total) * 100),
    },
    trend: npsTrend,
    distribution,
    detractor_feedback: detractorFeedback,
    benchmarks: {
      industry_avg: 36,
      excellent: 70,
      good: 50,
    },
  });
}
