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

  // Get all customers with 3+ visits
  const { data: customers } = await supabase
    .from('customers')
    .select('customer_id, first_name, email, visit_count')
    .eq('restaurant_id', rid)
    .gte('visit_count', 3);

  if (!customers || customers.length === 0) {
    return NextResponse.json({
      customers: [],
      summary: { accelerating_count: 0, stable_count: 0, decelerating_count: 0, avg_velocity: 100 },
    });
  }

  // Get all visits for these customers
  const customerIds = customers.map(c => c.customer_id);
  const { data: visits } = await supabase
    .from('visits')
    .select('customer_id, timestamp, spend_amount')
    .eq('restaurant_id', rid)
    .in('customer_id', customerIds)
    .order('timestamp', { ascending: true });

  if (!visits) {
    return NextResponse.json({
      customers: [],
      summary: { accelerating_count: 0, stable_count: 0, decelerating_count: 0, avg_velocity: 100 },
    });
  }

  // Group visits by customer
  const visitsByCustomer: Record<string, Array<{ timestamp: string; spend_amount: number }>> = {};
  for (const v of visits) {
    if (!visitsByCustomer[v.customer_id]) visitsByCustomer[v.customer_id] = [];
    visitsByCustomer[v.customer_id].push(v);
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const results: Array<{
    customer_id: string;
    name: string;
    velocity_category: 'accelerating' | 'stable' | 'decelerating';
    velocity_score: number;
    recent_avg: number;
    previous_avg: number;
    visit_count: number;
  }> = [];

  for (const customer of customers) {
    const cVisits = visitsByCustomer[customer.customer_id] || [];

    // Recent 30 days
    const recentVisits = cVisits.filter(v => new Date(v.timestamp) >= thirtyDaysAgo);
    // Previous 30 days (31-60 days ago)
    const previousVisits = cVisits.filter(v => {
      const d = new Date(v.timestamp);
      return d >= sixtyDaysAgo && d < thirtyDaysAgo;
    });

    const recentAvg = recentVisits.length > 0
      ? recentVisits.reduce((s, v) => s + v.spend_amount, 0) / recentVisits.length
      : 0;
    const previousAvg = previousVisits.length > 0
      ? previousVisits.reduce((s, v) => s + v.spend_amount, 0) / previousVisits.length
      : 0;

    // Calculate velocity score
    let velocityScore: number;
    if (previousAvg === 0 && recentAvg === 0) {
      velocityScore = 100;
    } else if (previousAvg === 0) {
      velocityScore = 200; // New spending = strong acceleration
    } else {
      velocityScore = Math.round((recentAvg / previousAvg) * 100);
    }

    // Classify
    let category: 'accelerating' | 'stable' | 'decelerating';
    if (velocityScore > 110) {
      category = 'accelerating';
    } else if (velocityScore < 90) {
      category = 'decelerating';
    } else {
      category = 'stable';
    }

    results.push({
      customer_id: customer.customer_id,
      name: customer.first_name || customer.email,
      velocity_category: category,
      velocity_score: velocityScore,
      recent_avg: Math.round(recentAvg * 100) / 100,
      previous_avg: Math.round(previousAvg * 100) / 100,
      visit_count: customer.visit_count,
    });
  }

  // Sort by velocity_score descending
  results.sort((a, b) => b.velocity_score - a.velocity_score);

  const acceleratingCount = results.filter(r => r.velocity_category === 'accelerating').length;
  const stableCount = results.filter(r => r.velocity_category === 'stable').length;
  const deceleratingCount = results.filter(r => r.velocity_category === 'decelerating').length;
  const avgVelocity = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.velocity_score, 0) / results.length)
    : 100;

  return NextResponse.json({
    customers: results,
    summary: {
      accelerating_count: acceleratingCount,
      stable_count: stableCount,
      decelerating_count: deceleratingCount,
      avg_velocity: avgVelocity,
    },
  });
}
