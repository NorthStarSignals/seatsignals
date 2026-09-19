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

  const { data: visits } = await supabase
    .from('visits')
    .select('amount, party_size, created_at')
    .eq('restaurant_id', rid)
    .not('amount', 'is', null)
    .order('created_at', { ascending: false })
    .limit(2000);

  const allVisits = (visits || []).filter(v => v.amount > 0);
  const total = allVisits.length || 1;

  const avgCheck = Math.round(allVisits.reduce((s, v) => s + v.amount, 0) / total * 100) / 100;
  const medianCheck = allVisits.length > 0
    ? [...allVisits].sort((a, b) => a.amount - b.amount)[Math.floor(allVisits.length / 2)].amount
    : 0;

  // Avg check per person
  const withParty = allVisits.filter(v => v.party_size && v.party_size > 0);
  const avgPerPerson = withParty.length > 0
    ? Math.round(withParty.reduce((s, v) => s + v.amount / v.party_size, 0) / withParty.length * 100) / 100
    : 0;

  // Monthly trend
  const monthMap = new Map<string, { total: number; count: number }>();
  for (const v of allVisits) {
    const month = (v.created_at || '').substring(0, 7);
    if (!month) continue;
    if (!monthMap.has(month)) monthMap.set(month, { total: 0, count: 0 });
    const entry = monthMap.get(month)!;
    entry.total += v.amount;
    entry.count++;
  }

  const trend = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, data]) => ({
      month,
      avg_check: Math.round((data.total / data.count) * 100) / 100,
      total_revenue: Math.round(data.total),
      visits: data.count,
    }));

  // Distribution buckets
  const buckets = [
    { range: '$0-25', min: 0, max: 25 },
    { range: '$25-50', min: 25, max: 50 },
    { range: '$50-75', min: 50, max: 75 },
    { range: '$75-100', min: 75, max: 100 },
    { range: '$100-150', min: 100, max: 150 },
    { range: '$150+', min: 150, max: Infinity },
  ];

  const distribution = buckets.map(b => ({
    range: b.range,
    count: allVisits.filter(v => v.amount >= b.min && v.amount < b.max).length,
    pct: Math.round((allVisits.filter(v => v.amount >= b.min && v.amount < b.max).length / total) * 100),
  }));

  // Day of week averages
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayAvg = dayNames.map((day, i) => {
    const dayVisits = allVisits.filter(v => new Date(v.created_at).getDay() === i);
    return {
      day,
      avg_check: dayVisits.length > 0 ? Math.round(dayVisits.reduce((s, v) => s + v.amount, 0) / dayVisits.length * 100) / 100 : 0,
      visits: dayVisits.length,
    };
  });

  return NextResponse.json({
    avg_check: avgCheck,
    median_check: medianCheck,
    avg_per_person: avgPerPerson,
    total_visits: allVisits.length,
    trend,
    distribution,
    by_day: dayAvg,
  });
}
