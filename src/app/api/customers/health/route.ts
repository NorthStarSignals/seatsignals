import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

/**
 * Customer Health Overview API
 * Aggregates key health metrics: active rate, churn rate, NPS proxy, growth rate
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
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: customers } = await supabase
    .from('customers')
    .select('customer_id, first_name, visit_count, total_spend, last_visit, first_seen')
    .eq('restaurant_id', rid);

  const all = customers || [];
  const total = all.length;

  if (total === 0) {
    return NextResponse.json({
      total_customers: 0,
      active_count: 0,
      active_rate: 0,
      churned_count: 0,
      churn_rate: 0,
      new_this_month: 0,
      growth_rate: 0,
      avg_visits: 0,
      avg_spend: 0,
      avg_lifetime_days: 0,
      retention_curve: [],
      health_score: 0,
      segments: [],
    });
  }

  // Active = visited in last 30 days
  const active = all.filter(c => c.last_visit && new Date(c.last_visit) >= thirtyDaysAgo);
  const cooling = all.filter(c => c.last_visit && new Date(c.last_visit) >= sixtyDaysAgo && new Date(c.last_visit) < thirtyDaysAgo);
  const atRisk = all.filter(c => c.last_visit && new Date(c.last_visit) >= ninetyDaysAgo && new Date(c.last_visit) < sixtyDaysAgo);
  const churned = all.filter(c => !c.last_visit || new Date(c.last_visit) < ninetyDaysAgo);

  // New this month
  const newThisMonth = all.filter(c => c.first_seen && new Date(c.first_seen) >= thirtyDaysAgo);
  const newLastMonth = all.filter(c => {
    if (!c.first_seen) return false;
    const d = new Date(c.first_seen);
    return d >= sixtyDaysAgo && d < thirtyDaysAgo;
  });

  const growthRate = newLastMonth.length > 0
    ? Math.round(((newThisMonth.length - newLastMonth.length) / newLastMonth.length) * 100)
    : newThisMonth.length > 0 ? 100 : 0;

  // Averages
  const avgVisits = Math.round(all.reduce((s, c) => s + (c.visit_count || 0), 0) / total * 10) / 10;
  const avgSpend = Math.round(all.reduce((s, c) => s + (c.total_spend || 0), 0) / total);
  const avgLifetimeDays = Math.round(
    all
      .filter(c => c.first_seen)
      .reduce((s, c) => s + (now.getTime() - new Date(c.first_seen).getTime()) / (1000 * 60 * 60 * 24), 0) /
    Math.max(1, all.filter(c => c.first_seen).length)
  );

  // Retention curve (% still active at 30, 60, 90, 120, 180, 365 days)
  const retentionDays = [30, 60, 90, 120, 180, 365];
  const retentionCurve = retentionDays.map(days => {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);
    const eligible = all.filter(c => c.first_seen && new Date(c.first_seen) <= cutoff);
    const retained = eligible.filter(c => {
      if (!c.last_visit) return false;
      const lastVisit = new Date(c.last_visit);
      return (now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24) <= days;
    });
    return {
      day: days,
      label: days >= 365 ? '1yr' : `${days}d`,
      rate: eligible.length > 0 ? Math.round((retained.length / eligible.length) * 100) : 0,
      count: retained.length,
      total: eligible.length,
    };
  });

  // Health score (0-100)
  const activeRate = total > 0 ? (active.length / total) * 100 : 0;
  const churnRate = total > 0 ? (churned.length / total) * 100 : 0;
  const healthScore = Math.round(
    Math.min(100, Math.max(0,
      (activeRate * 0.4) +
      ((100 - churnRate) * 0.3) +
      (Math.min(growthRate, 50) * 0.2) +
      (Math.min(avgVisits, 10) * 1 * 0.1)
    ))
  );

  const segments = [
    { name: 'Active', count: active.length, pct: Math.round((active.length / total) * 100), color: '#22c55e' },
    { name: 'Cooling', count: cooling.length, pct: Math.round((cooling.length / total) * 100), color: '#f59e0b' },
    { name: 'At Risk', count: atRisk.length, pct: Math.round((atRisk.length / total) * 100), color: '#f97316' },
    { name: 'Churned', count: churned.length, pct: Math.round((churned.length / total) * 100), color: '#ef4444' },
  ];

  // Reviews sentiment proxy
  const { data: sentimentRows } = await supabase
    .from('cortex_review_sentiment')
    .select('sentiment_score')
    .eq('restaurant_id', rid);

  const avgSentiment = sentimentRows && sentimentRows.length > 0
    ? Math.round((sentimentRows.reduce((s, r) => s + (r.sentiment_score ?? 0), 0) / sentimentRows.length) * 100) / 100
    : null;

  return NextResponse.json({
    total_customers: total,
    active_count: active.length,
    active_rate: Math.round(activeRate),
    churned_count: churned.length,
    churn_rate: Math.round(churnRate),
    new_this_month: newThisMonth.length,
    growth_rate: growthRate,
    avg_visits: avgVisits,
    avg_spend: avgSpend,
    avg_lifetime_days: avgLifetimeDays,
    avg_sentiment: avgSentiment,
    retention_curve: retentionCurve,
    health_score: healthScore,
    segments,
  });
}
