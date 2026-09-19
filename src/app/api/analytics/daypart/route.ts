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
    .select('amount, created_at')
    .eq('restaurant_id', rid)
    .limit(2000);

  const allVisits = visits || [];

  // Daypart definitions
  const dayparts = [
    { name: 'Breakfast', start: 6, end: 11, color: '#f59e0b' },
    { name: 'Lunch', start: 11, end: 15, color: '#22c55e' },
    { name: 'Afternoon', start: 15, end: 17, color: '#3b82f6' },
    { name: 'Dinner', start: 17, end: 21, color: '#E11D48' },
    { name: 'Late Night', start: 21, end: 24, color: '#a855f7' },
  ];

  const daypartData = dayparts.map(dp => {
    const matching = allVisits.filter(v => {
      const hour = new Date(v.created_at).getHours();
      return hour >= dp.start && hour < dp.end;
    });
    const revenue = matching.reduce((s, v) => s + (v.amount || 0), 0);
    const count = matching.length;
    return {
      ...dp,
      visits: count,
      revenue: Math.round(revenue),
      avg_check: count > 0 ? Math.round(revenue / count) : 0,
      pct: allVisits.length > 0 ? Math.round((count / allVisits.length) * 100) : 0,
    };
  });

  // Day of week × daypart matrix
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const heatmapData = daysOfWeek.map(day => {
    const dayIndex = daysOfWeek.indexOf(day);
    const dayVisits = allVisits.filter(v => new Date(v.created_at).getDay() === dayIndex);

    const byDaypart: Record<string, number> = {};
    for (const dp of dayparts) {
      const count = dayVisits.filter(v => {
        const hour = new Date(v.created_at).getHours();
        return hour >= dp.start && hour < dp.end;
      }).length;
      byDaypart[dp.name] = count;
    }

    return { day, ...byDaypart };
  });

  // Best & worst daypart
  const sorted = [...daypartData].sort((a, b) => b.revenue - a.revenue);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  return NextResponse.json({
    dayparts: daypartData,
    heatmap: heatmapData,
    best_daypart: best?.name || 'N/A',
    worst_daypart: worst?.name || 'N/A',
    total_revenue: daypartData.reduce((s, d) => s + d.revenue, 0),
    total_visits: allVisits.length,
  });
}
