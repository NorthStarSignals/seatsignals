import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

interface Customer {
  customer_id: string;
  first_name: string;
  email: string;
  visit_count: number;
  total_spend: number;
  last_visit: string | null;
  first_seen: string | null;
  tags: string[] | null;
}

type Stage = 'new' | 'active' | 'cooling' | 'at_risk' | 'churned';

function classifyStage(customer: Customer, now: Date): Stage {
  const firstSeen = customer.first_seen ? new Date(customer.first_seen) : null;
  const lastVisit = customer.last_visit ? new Date(customer.last_visit) : null;

  // New: first_seen < 30 days ago
  if (firstSeen) {
    const daysSinceFirst = Math.floor((now.getTime() - firstSeen.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceFirst < 30) return 'new';
  }

  if (!lastVisit) return 'churned';

  const daysSinceLast = Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceLast <= 30) return 'active';
  if (daysSinceLast <= 60) return 'cooling';
  if (daysSinceLast <= 90) return 'at_risk';
  return 'churned';
}

function getMonthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
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

  const { data: customers } = await supabase
    .from('customers')
    .select('customer_id, first_name, email, visit_count, total_spend, last_visit, first_seen, tags')
    .eq('restaurant_id', rid);

  if (!customers || customers.length === 0) {
    return NextResponse.json({
      stages: [],
      stage_counts: {},
      avg_revenue_per_stage: {},
      transitions: [],
      funnel: [],
      trends: [],
      customers_by_stage: {},
    });
  }

  const now = new Date();

  // Classify each customer
  const classified = customers.map((c: Customer) => ({
    ...c,
    stage: classifyStage(c, now),
  }));

  // Stage counts
  const stageCounts: Record<Stage, number> = { new: 0, active: 0, cooling: 0, at_risk: 0, churned: 0 };
  const stageSpend: Record<Stage, number> = { new: 0, active: 0, cooling: 0, at_risk: 0, churned: 0 };

  for (const c of classified) {
    stageCounts[c.stage]++;
    stageSpend[c.stage] += c.total_spend || 0;
  }

  // Avg revenue per stage
  const avgRevenuePerStage: Record<Stage, number> = { new: 0, active: 0, cooling: 0, at_risk: 0, churned: 0 };
  const stages: Stage[] = ['new', 'active', 'cooling', 'at_risk', 'churned'];
  for (const s of stages) {
    avgRevenuePerStage[s] = stageCounts[s] > 0
      ? Math.round((stageSpend[s] / stageCounts[s]) * 100) / 100
      : 0;
  }

  // Stage detail array
  const stageDetails = stages.map(s => ({
    stage: s,
    count: stageCounts[s],
    total_spend: Math.round(stageSpend[s] * 100) / 100,
    avg_spend: avgRevenuePerStage[s],
    pct: customers.length > 0 ? Math.round((stageCounts[s] / customers.length) * 10000) / 100 : 0,
  }));

  // Transition rates: simulate by looking at 30-day-ago classification vs now
  // Use last_visit and first_seen to estimate prior stage
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const transitions: Array<{ from: Stage; to: Stage; count: number; pct: number }> = [];
  const transitionMap: Record<string, number> = {};

  for (const c of customers) {
    const currentStage = classifyStage(c, now);
    const priorStage = classifyStage(c, thirtyDaysAgo);
    if (currentStage !== priorStage) {
      const key = `${priorStage}>${currentStage}`;
      transitionMap[key] = (transitionMap[key] || 0) + 1;
    }
  }

  const totalCustomers = customers.length;
  for (const [key, count] of Object.entries(transitionMap)) {
    const [from, to] = key.split('>') as [Stage, Stage];
    transitions.push({
      from,
      to,
      count,
      pct: Math.round((count / totalCustomers) * 10000) / 100,
    });
  }
  transitions.sort((a, b) => b.count - a.count);

  // Lifecycle funnel: new -> active -> loyal (visit_count >= 5 among active)
  const newCount = stageCounts['new'];
  const activeCount = stageCounts['active'];
  const loyalCount = classified.filter(c => c.stage === 'active' && c.visit_count >= 5).length;

  const funnel = [
    { stage: 'New Customers', count: newCount + activeCount + stageCounts['cooling'] + stageCounts['at_risk'] + stageCounts['churned'], pct: 100 },
    { stage: 'Activated (visited again)', count: activeCount + stageCounts['cooling'] + loyalCount, pct: totalCustomers > 0 ? Math.round(((activeCount + stageCounts['cooling'] + loyalCount) / totalCustomers) * 10000) / 100 : 0 },
    { stage: 'Regular (3+ visits)', count: classified.filter(c => c.visit_count >= 3).length, pct: totalCustomers > 0 ? Math.round((classified.filter(c => c.visit_count >= 3).length / totalCustomers) * 10000) / 100 : 0 },
    { stage: 'Loyal (5+ visits)', count: loyalCount, pct: totalCustomers > 0 ? Math.round((loyalCount / totalCustomers) * 10000) / 100 : 0 },
  ];

  // Stage trends over the last 6 months
  const trends: Array<Record<string, string | number>> = [];
  for (let i = 5; i >= 0; i--) {
    const refDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = getMonthKey(refDate);
    const row: Record<string, string | number> = { month: monthKey };

    for (const s of stages) {
      // Count customers that would have been in this stage at that point in time
      let count = 0;
      for (const c of customers) {
        const stage = classifyStage(c, refDate);
        if (stage === s) count++;
      }
      row[s] = count;
    }
    trends.push(row);
  }

  // Customers by stage (top 20 per stage)
  const customersByStage: Record<Stage, Array<{
    customer_id: string;
    first_name: string;
    email: string;
    visit_count: number;
    total_spend: number;
    last_visit: string | null;
    stage: Stage;
  }>> = { new: [], active: [], cooling: [], at_risk: [], churned: [] };

  for (const c of classified) {
    if (customersByStage[c.stage].length < 20) {
      customersByStage[c.stage].push({
        customer_id: c.customer_id,
        first_name: c.first_name,
        email: c.email,
        visit_count: c.visit_count,
        total_spend: c.total_spend,
        last_visit: c.last_visit,
        stage: c.stage,
      });
    }
  }

  return NextResponse.json({
    stages: stageDetails,
    stage_counts: stageCounts,
    avg_revenue_per_stage: avgRevenuePerStage,
    transitions,
    funnel,
    trends,
    customers_by_stage: customersByStage,
    total_customers: totalCustomers,
  });
}
