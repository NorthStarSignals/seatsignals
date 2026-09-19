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

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const rid = restaurant.restaurant_id;
  const { metrics, date_from, date_to, group_by } = await request.json();

  // Build report based on selected metrics
  const report: Record<string, unknown>[] = [];
  const availableMetrics = metrics as string[];

  // Fetch base data
  let visitQuery = supabase.from('visits').select('amount, party_size, visit_type, server_name, tips, created_at').eq('restaurant_id', rid);
  if (date_from) visitQuery = visitQuery.gte('created_at', date_from);
  if (date_to) visitQuery = visitQuery.lte('created_at', date_to);
  const { data: visits } = await visitQuery;
  const allVisits = visits || [];

  // Customer data if needed
  let customers: { total_spend: number; visit_count: number; source: string; created_at: string }[] = [];
  if (availableMetrics.some(m => ['customer_count', 'new_customers', 'avg_ltv'].includes(m))) {
    let custQuery = supabase.from('customers').select('total_spend, visit_count, source, created_at').eq('restaurant_id', rid);
    if (date_from) custQuery = custQuery.gte('created_at', date_from);
    if (date_to) custQuery = custQuery.lte('created_at', date_to);
    const { data: custs } = await custQuery;
    customers = custs || [];
  }

  // Group data
  const groupFn = (dateStr: string): string => {
    const d = new Date(dateStr);
    if (group_by === 'week') {
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      return weekStart.toISOString().split('T')[0];
    }
    if (group_by === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return d.toISOString().split('T')[0]; // daily
  };

  const groups = new Map<string, typeof allVisits>();
  for (const v of allVisits) {
    const key = groupFn(v.created_at);
    const existing = groups.get(key) || [];
    existing.push(v);
    groups.set(key, existing);
  }

  for (const [period, periodVisits] of Array.from(groups.entries())) {
    const row: Record<string, unknown> = { period };

    if (availableMetrics.includes('revenue')) {
      row.revenue = periodVisits.reduce((s, v) => s + (v.amount || 0), 0);
    }
    if (availableMetrics.includes('transactions')) {
      row.transactions = periodVisits.length;
    }
    if (availableMetrics.includes('avg_check')) {
      row.avg_check = periodVisits.length > 0
        ? Math.round(periodVisits.reduce((s, v) => s + (v.amount || 0), 0) / periodVisits.length)
        : 0;
    }
    if (availableMetrics.includes('covers')) {
      row.covers = periodVisits.reduce((s, v) => s + (v.party_size || 1), 0);
    }
    if (availableMetrics.includes('tips')) {
      row.tips = periodVisits.reduce((s, v) => s + (v.tips || 0), 0);
    }
    if (availableMetrics.includes('per_person')) {
      const covers = periodVisits.reduce((s, v) => s + (v.party_size || 1), 0);
      row.per_person = covers > 0
        ? Math.round(periodVisits.reduce((s, v) => s + (v.amount || 0), 0) / covers)
        : 0;
    }

    report.push(row);
  }

  // Add customer metrics at report level
  const summary: Record<string, unknown> = {};
  if (availableMetrics.includes('customer_count')) summary.customer_count = customers.length;
  if (availableMetrics.includes('new_customers')) summary.new_customers = customers.length;
  if (availableMetrics.includes('avg_ltv')) {
    summary.avg_ltv = customers.length > 0
      ? Math.round(customers.reduce((s, c) => s + (c.total_spend || 0), 0) / customers.length)
      : 0;
  }

  report.sort((a, b) => String(a.period).localeCompare(String(b.period)));

  return NextResponse.json({
    report,
    summary,
    config: { metrics: availableMetrics, date_from, date_to, group_by },
    row_count: report.length,
  });
}
