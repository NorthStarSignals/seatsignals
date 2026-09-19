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

  // Get all customers with first_seen
  const { data: customers } = await supabase
    .from('customers')
    .select('customer_id, first_seen')
    .eq('restaurant_id', rid);

  // Get all visits
  const { data: visits } = await supabase
    .from('visits')
    .select('customer_id, timestamp')
    .eq('restaurant_id', rid);

  if (!customers || !visits) {
    return NextResponse.json({ cohorts: [] });
  }

  // Build a map of customer_id -> visit months (Set of "YYYY-MM")
  const customerVisitMonths: Record<string, Set<string>> = {};
  for (const v of visits) {
    const month = new Date(v.timestamp).toISOString().slice(0, 7);
    if (!customerVisitMonths[v.customer_id]) {
      customerVisitMonths[v.customer_id] = new Set();
    }
    customerVisitMonths[v.customer_id].add(month);
  }

  // Group customers into monthly cohorts by first_seen
  const cohortMap: Record<string, string[]> = {};
  for (const c of customers) {
    if (!c.first_seen) continue;
    const cohortMonth = new Date(c.first_seen).toISOString().slice(0, 7);
    if (!cohortMap[cohortMonth]) cohortMap[cohortMonth] = [];
    cohortMap[cohortMonth].push(c.customer_id);
  }

  // Get last 6 months of cohorts
  const allMonths = Object.keys(cohortMap).sort().slice(-6);

  // For each cohort, calculate retention for months 0-5
  const cohorts = allMonths.map(cohortMonth => {
    const customerIds = cohortMap[cohortMonth];
    const size = customerIds.length;
    const retention: number[] = [];

    for (let offset = 0; offset < 6; offset++) {
      // Calculate target month
      const [year, month] = cohortMonth.split('-').map(Number);
      const targetDate = new Date(year, month - 1 + offset, 1);
      const targetMonth = targetDate.toISOString().slice(0, 7);

      // Count how many cohort customers had visits in the target month
      let active = 0;
      for (const cid of customerIds) {
        if (customerVisitMonths[cid]?.has(targetMonth)) {
          active++;
        }
      }

      const pct = size > 0 ? Math.round((active / size) * 100 * 100) / 100 : 0;
      retention.push(pct);
    }

    return {
      month: cohortMonth,
      size,
      retention,
    };
  });

  return NextResponse.json({ cohorts });
}
