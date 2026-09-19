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

  // Get all customers with source/channel info
  const { data: customers } = await supabase
    .from('customers')
    .select('id, created_at, source, total_spend, visit_count')
    .eq('restaurant_id', rid)
    .order('created_at', { ascending: false });

  const allCustomers = customers || [];
  const total = allCustomers.length;

  // Monthly acquisition
  const monthMap = new Map<string, number>();
  for (const c of allCustomers) {
    const month = (c.created_at || '').substring(0, 7);
    if (month) monthMap.set(month, (monthMap.get(month) || 0) + 1);
  }

  const monthlyAcquisition = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, count]) => ({ month, new_customers: count }));

  // Source breakdown
  const sourceMap = new Map<string, { count: number; total_spend: number }>();
  for (const c of allCustomers) {
    const src = c.source || 'Direct';
    const existing = sourceMap.get(src) || { count: 0, total_spend: 0 };
    existing.count++;
    existing.total_spend += c.total_spend || 0;
    sourceMap.set(src, existing);
  }

  const bySource = Array.from(sourceMap.entries())
    .map(([source, data]) => ({
      source,
      count: data.count,
      pct: Math.round((data.count / Math.max(total, 1)) * 100),
      avg_ltv: data.count > 0 ? Math.round(data.total_spend / data.count) : 0,
      color: source === 'QR Code' ? '#E11D48' : source === 'Referral' ? '#22c55e' : source === 'Walk-in' ? '#3b82f6' : source === 'Online' ? '#a855f7' : '#f59e0b',
    }))
    .sort((a, b) => b.count - a.count);

  // This month vs last month
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonth = now.getMonth() === 0
    ? `${now.getFullYear() - 1}-12`
    : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;

  const thisMonthCount = monthMap.get(thisMonth) || 0;
  const lastMonthCount = monthMap.get(lastMonth) || 0;
  const growthPct = lastMonthCount > 0 ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100) : 0;

  // Customer Acquisition Cost (estimated)
  const estimatedMonthlyMarketingSpend = 500; // placeholder
  const cac = thisMonthCount > 0 ? Math.round(estimatedMonthlyMarketingSpend / thisMonthCount) : 0;

  // Average LTV
  const avgLTV = total > 0 ? Math.round(allCustomers.reduce((s, c) => s + (c.total_spend || 0), 0) / total) : 0;
  const ltvCacRatio = cac > 0 ? Math.round((avgLTV / cac) * 10) / 10 : 0;

  return NextResponse.json({
    total_customers: total,
    this_month: thisMonthCount,
    last_month: lastMonthCount,
    growth_pct: growthPct,
    cac,
    avg_ltv: avgLTV,
    ltv_cac_ratio: ltvCacRatio,
    monthly_acquisition: monthlyAcquisition,
    by_source: bySource,
  });
}
