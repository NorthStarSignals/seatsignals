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

  // Get customers sorted by total spend
  const { data: customers } = await supabase
    .from('customers')
    .select('id, first_name, last_name, email, total_spend, visit_count, last_visit, created_at')
    .eq('restaurant_id', rid)
    .order('total_spend', { ascending: false })
    .limit(50);

  const topSpenders = (customers || []).map((c, i) => ({
    rank: i + 1,
    id: c.id,
    name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Anonymous',
    email: c.email,
    total_spend: c.total_spend || 0,
    visits: c.visit_count || 0,
    avg_spend: c.visit_count > 0 ? Math.round((c.total_spend || 0) / c.visit_count * 100) / 100 : 0,
    last_visit: c.last_visit,
    member_since: c.created_at,
    tier: i < 3 ? 'diamond' : i < 10 ? 'gold' : i < 25 ? 'silver' : 'bronze',
  }));

  // Top by visits
  const { data: frequentVisitors } = await supabase
    .from('customers')
    .select('id, first_name, last_name, visit_count, total_spend')
    .eq('restaurant_id', rid)
    .order('visit_count', { ascending: false })
    .limit(10);

  const topVisitors = (frequentVisitors || []).map((c, i) => ({
    rank: i + 1,
    name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Anonymous',
    visits: c.visit_count || 0,
    total_spend: c.total_spend || 0,
  }));

  // Top referrers
  const { data: referrals } = await supabase
    .from('referrals')
    .select('referrer_id, customers!referrals_referrer_id_fkey(first_name, last_name)')
    .eq('restaurant_id', rid);

  const referrerMap = new Map<string, { name: string; count: number }>();
  for (const ref of referrals || []) {
    const existing = referrerMap.get(ref.referrer_id);
    const cust = ref.customers as unknown as { first_name: string; last_name: string } | null;
    const name = cust ? `${cust.first_name || ''} ${cust.last_name || ''}`.trim() : 'Unknown';
    if (existing) {
      existing.count++;
    } else {
      referrerMap.set(ref.referrer_id, { name, count: 1 });
    }
  }

  const topReferrers = Array.from(referrerMap.entries())
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10)
    .map(([id, data], i) => ({
      rank: i + 1,
      id,
      name: data.name,
      referrals: data.count,
    }));

  // Achievements/milestones
  const achievements = [];
  const totalCustomers = topSpenders.length;
  if (totalCustomers >= 100) achievements.push({ icon: '🏆', title: '100 Club', desc: '100+ customers' });
  if (totalCustomers >= 500) achievements.push({ icon: '🌟', title: 'Rising Star', desc: '500+ customers' });
  if (topSpenders[0]?.total_spend > 5000) achievements.push({ icon: '💎', title: 'Diamond Whale', desc: 'Customer with $5K+ spend' });
  if (topVisitors[0]?.visits > 50) achievements.push({ icon: '🔥', title: 'On Fire', desc: 'Customer with 50+ visits' });
  if (topReferrers[0]?.referrals > 10) achievements.push({ icon: '📣', title: 'Super Advocate', desc: 'Customer with 10+ referrals' });
  achievements.push({ icon: '📊', title: 'Data Driven', desc: 'Using SeatSignals analytics' });
  achievements.push({ icon: '🎯', title: 'Retention Pro', desc: 'Active customer tracking' });

  return NextResponse.json({
    top_spenders: topSpenders,
    top_visitors: topVisitors,
    top_referrers: topReferrers,
    achievements,
    totals: {
      total_revenue: topSpenders.reduce((s, c) => s + c.total_spend, 0),
      total_visits: topSpenders.reduce((s, c) => s + c.visits, 0),
      total_referrals: topReferrers.reduce((s, r) => s + r.referrals, 0),
    },
  });
}
