import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

/**
 * Customer Engagement Scoring Engine
 * Computes a 0-100 engagement score based on recency, frequency, monetary value,
 * review activity, referral activity, and interaction patterns.
 */

interface EngagementFactors {
  recency_score: number;     // 0-25 based on days since last visit
  frequency_score: number;   // 0-25 based on visit frequency
  monetary_score: number;    // 0-25 based on spend
  interaction_score: number; // 0-25 based on reviews, referrals, survey responses
}

function computeRecencyScore(daysSinceLastVisit: number): number {
  if (daysSinceLastVisit <= 7) return 25;
  if (daysSinceLastVisit <= 14) return 22;
  if (daysSinceLastVisit <= 30) return 18;
  if (daysSinceLastVisit <= 60) return 12;
  if (daysSinceLastVisit <= 90) return 6;
  return Math.max(0, 3 - Math.floor((daysSinceLastVisit - 90) / 30));
}

function computeFrequencyScore(visitCount: number, daysSinceFirstSeen: number): number {
  if (daysSinceFirstSeen < 7) return visitCount > 0 ? 15 : 0;
  const visitsPerMonth = (visitCount / daysSinceFirstSeen) * 30;
  if (visitsPerMonth >= 8) return 25;
  if (visitsPerMonth >= 4) return 22;
  if (visitsPerMonth >= 2) return 18;
  if (visitsPerMonth >= 1) return 14;
  if (visitsPerMonth >= 0.5) return 10;
  return Math.max(0, Math.round(visitsPerMonth * 14));
}

function computeMonetaryScore(totalSpend: number, avgSpend: number): number {
  if (avgSpend === 0) return 0;
  const ratio = totalSpend / avgSpend;
  if (ratio >= 5) return 25;
  if (ratio >= 3) return 22;
  if (ratio >= 2) return 18;
  if (ratio >= 1) return 14;
  if (ratio >= 0.5) return 10;
  return Math.round(ratio * 14);
}

function computeInteractionScore(hasReviews: boolean, hasReferrals: boolean, hasSurveys: boolean): number {
  let score = 0;
  if (hasReviews) score += 10;
  if (hasReferrals) score += 8;
  if (hasSurveys) score += 7;
  return Math.min(25, score);
}

function getEngagementLevel(score: number): string {
  if (score >= 80) return 'Champion';
  if (score >= 60) return 'Highly Engaged';
  if (score >= 40) return 'Engaged';
  if (score >= 20) return 'Passive';
  return 'Disengaged';
}

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
  const now = new Date();

  // Fetch all customers
  const { data: customers } = await supabase
    .from('customers')
    .select('customer_id, first_name, email, visit_count, total_spend, last_visit, first_seen, tags')
    .eq('restaurant_id', rid);

  if (!customers || customers.length === 0) {
    return NextResponse.json({
      scores: [],
      distribution: [],
      averageScore: 0,
      topEngaged: [],
      disengaged: [],
    });
  }

  // Compute average spend across all customers
  const totalSpendAll = customers.reduce((s, c) => s + (c.total_spend || 0), 0);
  const avgSpend = customers.length > 0 ? totalSpendAll / customers.length : 1;

  // Fetch review/referral/survey activity per customer
  const { data: reviewAuthors } = await supabase
    .from('cortex_review_sentiment')
    .select('author')
    .eq('restaurant_id', rid);
  const reviewAuthorSet = new Set((reviewAuthors || []).map(r => r.author?.toLowerCase()));

  const { data: referralData } = await supabase
    .from('referrals')
    .select('referrer_id')
    .eq('restaurant_id', rid);
  const referrerSet = new Set((referralData || []).map(r => r.referrer_id));

  const { data: surveyData } = await supabase
    .from('survey_responses')
    .select('customer_id')
    .eq('restaurant_id', rid);
  const surveySet = new Set((surveyData || []).map(s => s.customer_id));

  // Score each customer
  const scores = customers.map(c => {
    const daysSinceLastVisit = c.last_visit
      ? Math.floor((now.getTime() - new Date(c.last_visit).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    const daysSinceFirstSeen = c.first_seen
      ? Math.max(1, Math.floor((now.getTime() - new Date(c.first_seen).getTime()) / (1000 * 60 * 60 * 24)))
      : 30;

    const hasReviews = reviewAuthorSet.has(c.first_name?.toLowerCase() || '') || reviewAuthorSet.has(c.email?.toLowerCase() || '');
    const hasReferrals = referrerSet.has(c.customer_id);
    const hasSurveys = surveySet.has(c.customer_id);

    const factors: EngagementFactors = {
      recency_score: computeRecencyScore(daysSinceLastVisit),
      frequency_score: computeFrequencyScore(c.visit_count || 0, daysSinceFirstSeen),
      monetary_score: computeMonetaryScore(c.total_spend || 0, avgSpend),
      interaction_score: computeInteractionScore(hasReviews, hasReferrals, hasSurveys),
    };

    const totalScore = factors.recency_score + factors.frequency_score + factors.monetary_score + factors.interaction_score;

    return {
      customer_id: c.customer_id,
      first_name: c.first_name,
      email: c.email,
      score: totalScore,
      level: getEngagementLevel(totalScore),
      factors,
      visit_count: c.visit_count || 0,
      total_spend: c.total_spend || 0,
      days_since_last_visit: daysSinceLastVisit,
    };
  });

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  // Distribution
  const levels = ['Champion', 'Highly Engaged', 'Engaged', 'Passive', 'Disengaged'];
  const distribution = levels.map(level => ({
    level,
    count: scores.filter(s => s.level === level).length,
    avg_spend: (() => {
      const group = scores.filter(s => s.level === level);
      return group.length > 0 ? Math.round(group.reduce((s, c) => s + c.total_spend, 0) / group.length) : 0;
    })(),
  }));

  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((s, c) => s + c.score, 0) / scores.length)
    : 0;

  return NextResponse.json({
    scores: scores.slice(0, 100),
    distribution,
    averageScore: avgScore,
    topEngaged: scores.slice(0, 10),
    disengaged: scores.filter(s => s.level === 'Disengaged').slice(0, 10),
  });
}
