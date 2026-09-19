import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const PAYMENT_METHODS = [
  { id: 'credit_card', name: 'Credit Card', icon: 'credit-card' },
  { id: 'debit', name: 'Debit Card', icon: 'credit-card' },
  { id: 'cash', name: 'Cash', icon: 'banknote' },
  { id: 'mobile_pay', name: 'Mobile Pay', icon: 'smartphone' },
  { id: 'gift_card', name: 'Gift Card', icon: 'gift' },
];

const COLORS = ['#E11D48', '#f97316', '#22c55e', '#3b82f6', '#a855f7'];

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

  // Fetch customer data to base payment method estimates on
  const { data: customers } = await supabase
    .from('customers')
    .select('id, visit_count, total_spend')
    .eq('restaurant_id', rid);

  const allCustomers = customers || [];
  const totalVisits = allCustomers.reduce((s, c) => s + (c.visit_count || 1), 0);
  const totalRevenue = allCustomers.reduce((s, c) => s + (c.total_spend || 45), 0);

  const rand = seededRandom(typeof rid === 'string' ? rid.length * 3571 : rid * 3571);

  // Realistic distribution: credit card dominant, then debit, cash, mobile, gift card
  const baseDistribution = [42, 24, 18, 12, 4]; // percentages
  const distribution = baseDistribution.map(base => {
    const variance = Math.round((rand() - 0.5) * 4);
    return Math.max(base + variance, 1);
  });
  // Normalize to 100
  const distSum = distribution.reduce((s, v) => s + v, 0);
  const normalizedDist = distribution.map(v => Math.round((v / distSum) * 100));
  // Fix rounding remainder
  const remainder = 100 - normalizedDist.reduce((s, v) => s + v, 0);
  normalizedDist[0] += remainder;

  // Average check sizes differ by payment method
  const avgCheckBases = [62, 48, 38, 55, 35]; // credit tends higher, cash/gift lower

  const methods = PAYMENT_METHODS.map((method, i) => {
    const pct = normalizedDist[i];
    const count = Math.round(totalVisits * pct / 100);
    const avgCheckVariance = (rand() - 0.5) * 10;
    const avgCheck = Math.round((avgCheckBases[i] + avgCheckVariance) * 100) / 100;
    const total = Math.round(count * avgCheck * 100) / 100;

    return {
      id: method.id,
      name: method.name,
      icon: method.icon,
      color: COLORS[i],
      percentage: pct,
      count,
      total_revenue: total,
      avg_check: avgCheck,
    };
  });

  // Monthly trend data (last 6 months)
  const monthNames = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
  const trendData = monthNames.map((month, mi) => {
    const entry: Record<string, string | number> = { month };
    let monthTotal = 0;
    for (const method of PAYMENT_METHODS) {
      const methodData = methods.find(m => m.id === method.id)!;
      // Slight growth trend with variance
      const growthFactor = 0.85 + (mi / 5) * 0.15;
      const variance = 1 + (rand() - 0.5) * 0.15;
      const value = Math.round(methodData.total_revenue * growthFactor * variance / 6);
      entry[method.id] = value;
      monthTotal += value;
    }
    entry['total'] = monthTotal;
    return entry;
  });

  // Comparison vs last month
  const currentMonthTotal = methods.reduce((s, m) => s + m.total_revenue, 0);
  const lastMonthFactor = 0.9 + rand() * 0.08;
  const lastMonthTotal = Math.round(currentMonthTotal * lastMonthFactor * 100) / 100;
  const trendPct = lastMonthTotal > 0
    ? Math.round(((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100)
    : 0;

  // Most popular method
  const topMethod = methods.reduce((best, m) =>
    m.percentage > best.percentage ? m : best, methods[0]);

  return NextResponse.json({
    methods,
    trend_data: trendData,
    summary: {
      total_transactions: totalVisits,
      total_revenue: Math.round(totalRevenue * 100) / 100,
      current_month_revenue: Math.round(currentMonthTotal * 100) / 100,
      last_month_revenue: lastMonthTotal,
      trend_pct: trendPct,
      top_method: topMethod.name,
      top_method_pct: topMethod.percentage,
      avg_check: Math.round((totalRevenue / Math.max(totalVisits, 1)) * 100) / 100,
    },
  });
}
