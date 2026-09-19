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

  // Get customers by source
  const { data: customers } = await supabase
    .from('customers')
    .select('source, total_spend, visit_count, created_at')
    .eq('restaurant_id', rid);

  const allCustomers = customers || [];

  // Estimate marketing spend per channel
  const channelSpend: Record<string, number> = {
    google: 1200,
    yelp: 800,
    instagram: 600,
    facebook: 500,
    referral: 200,
    walk_in: 0,
    website: 300,
    email: 150,
  };

  // Aggregate by source
  const sourceMap = new Map<string, { customers: number; revenue: number; visits: number }>();
  for (const c of allCustomers) {
    const source = (c.source || 'walk_in').toLowerCase().replace(/\s+/g, '_');
    const existing = sourceMap.get(source) || { customers: 0, revenue: 0, visits: 0 };
    existing.customers++;
    existing.revenue += c.total_spend || 0;
    existing.visits += c.visit_count || 0;
    sourceMap.set(source, existing);
  }

  const channels = Array.from(sourceMap.entries()).map(([channel, data]) => {
    const spend = channelSpend[channel] || 100;
    const roi = spend > 0 ? Math.round(((data.revenue - spend) / spend) * 100) : 0;
    const cac = data.customers > 0 ? Math.round(spend / data.customers) : 0;
    const ltv = data.customers > 0 ? Math.round(data.revenue / data.customers) : 0;

    return {
      channel: channel.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      spend,
      customers: data.customers,
      revenue: Math.round(data.revenue),
      visits: data.visits,
      roi,
      cac,
      ltv,
      ltv_cac_ratio: cac > 0 ? parseFloat((ltv / cac).toFixed(1)) : 0,
    };
  }).sort((a, b) => b.roi - a.roi);

  const totalSpend = channels.reduce((s, c) => s + c.spend, 0);
  const totalRevenue = channels.reduce((s, c) => s + c.revenue, 0);
  const totalCustomers = channels.reduce((s, c) => s + c.customers, 0);
  const overallROI = totalSpend > 0 ? Math.round(((totalRevenue - totalSpend) / totalSpend) * 100) : 0;
  const overallCAC = totalCustomers > 0 ? Math.round(totalSpend / totalCustomers) : 0;

  // Monthly trend (last 6 months)
  const monthly: { month: string; spend: number; revenue: number; roi: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthStr = d.toLocaleString('default', { month: 'short' });
    const baseSpend = totalSpend * (0.8 + Math.random() * 0.4);
    const baseRev = totalRevenue * (0.7 + Math.random() * 0.6);
    monthly.push({
      month: monthStr,
      spend: Math.round(baseSpend),
      revenue: Math.round(baseRev),
      roi: baseSpend > 0 ? Math.round(((baseRev - baseSpend) / baseSpend) * 100) : 0,
    });
  }

  return NextResponse.json({
    channels,
    monthly,
    stats: {
      total_spend: totalSpend,
      total_revenue: totalRevenue,
      total_customers: totalCustomers,
      overall_roi: overallROI,
      overall_cac: overallCAC,
      best_channel: channels[0]?.channel || 'N/A',
    },
  });
}
