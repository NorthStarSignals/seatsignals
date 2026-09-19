import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

/**
 * Dashboard Overview API
 * Returns high-level KPIs for the main dashboard
 */

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id, name')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const rid = restaurant.restaurant_id;
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  // ── Customer metrics ──
  const { data: allCustomers } = await supabase
    .from('customers')
    .select('customer_id, visit_count, total_spend, first_seen, last_visit')
    .eq('restaurant_id', rid);

  const customers = allCustomers || [];
  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((s, c) => s + (c.total_spend || 0), 0);
  const totalVisits = customers.reduce((s, c) => s + (c.visit_count || 0), 0);
  const avgOrderValue = totalVisits > 0 ? Math.round(totalRevenue / totalVisits) : 0;

  const newThisMonth = customers.filter(c => c.first_seen && new Date(c.first_seen) >= thirtyDaysAgo).length;
  const newLastMonth = customers.filter(c => {
    if (!c.first_seen) return false;
    const d = new Date(c.first_seen);
    return d >= sixtyDaysAgo && d < thirtyDaysAgo;
  }).length;

  const activeThisMonth = customers.filter(c => c.last_visit && new Date(c.last_visit) >= thirtyDaysAgo).length;
  const activeLastMonth = customers.filter(c => {
    if (!c.last_visit) return false;
    const d = new Date(c.last_visit);
    return d >= sixtyDaysAgo && d < thirtyDaysAgo;
  }).length;

  // Revenue this month vs last
  const revenueThisMonth = customers
    .filter(c => c.last_visit && new Date(c.last_visit) >= thirtyDaysAgo)
    .reduce((s, c) => s + (c.total_spend || 0) * 0.3, 0); // Approximate recent revenue
  const revenueLastMonth = customers
    .filter(c => {
      if (!c.last_visit) return false;
      const d = new Date(c.last_visit);
      return d >= sixtyDaysAgo && d < thirtyDaysAgo;
    })
    .reduce((s, c) => s + (c.total_spend || 0) * 0.3, 0);

  // ── Review metrics ──
  const { data: reviews } = await supabase
    .from('cortex_review_sentiment')
    .select('rating, sentiment_label, analyzed_at')
    .eq('restaurant_id', rid);

  const allReviews = reviews || [];
  const avgRating = allReviews.length > 0
    ? Math.round((allReviews.reduce((s, r) => s + (r.rating || 0), 0) / allReviews.length) * 10) / 10
    : 0;
  const recentReviews = allReviews.filter(r => r.analyzed_at && new Date(r.analyzed_at) >= thirtyDaysAgo);
  const positiveReviews = recentReviews.filter(r => r.sentiment_label === 'positive').length;

  // ── Referral metrics ──
  const { count: referralCount } = await supabase
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', rid);

  // ── Trends (last 30 days, weekly) ──
  const weeks = [0, 7, 14, 21, 28].map(daysAgo => {
    const start = new Date(now);
    start.setDate(start.getDate() - daysAgo - 7);
    const end = new Date(now);
    end.setDate(end.getDate() - daysAgo);
    const weekCustomers = customers.filter(c =>
      c.last_visit && new Date(c.last_visit) >= start && new Date(c.last_visit) < end
    );
    return {
      week: `W${4 - Math.floor(daysAgo / 7)}`,
      customers: weekCustomers.length,
      revenue: weekCustomers.reduce((s, c) => s + (c.total_spend || 0) * 0.1, 0),
    };
  }).reverse();

  function calcTrend(current: number, previous: number): { value: number; positive: boolean } {
    if (previous === 0) return { value: current > 0 ? 100 : 0, positive: current > 0 };
    const pct = Math.round(((current - previous) / previous) * 100);
    return { value: Math.abs(pct), positive: pct >= 0 };
  }

  return NextResponse.json({
    restaurant_name: restaurant.name,
    kpis: {
      total_revenue: Math.round(totalRevenue),
      revenue_trend: calcTrend(revenueThisMonth, revenueLastMonth),
      total_customers: totalCustomers,
      new_customers: newThisMonth,
      new_trend: calcTrend(newThisMonth, newLastMonth),
      active_customers: activeThisMonth,
      active_trend: calcTrend(activeThisMonth, activeLastMonth),
      avg_order_value: avgOrderValue,
      total_visits: totalVisits,
      avg_rating: avgRating,
      review_count: allReviews.length,
      positive_reviews: positiveReviews,
      referrals: referralCount || 0,
    },
    trends: weeks,
  });
}
