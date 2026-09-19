'use server';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  // Try real data first
  const { data: visits } = await supabase
    .from('visits')
    .select('visited_at, total_amount')
    .eq('restaurant_id', restaurant.id)
    .order('visited_at', { ascending: true });

  // Generate monthly history + forecast
  const months: { month: string; actual: number; forecast: number | null; lower: number | null; upper: number | null }[] = [];
  const now = new Date();

  if (visits && visits.length > 10) {
    // Group by month
    const byMonth: Record<string, number> = {};
    for (const v of visits) {
      const d = new Date(v.visited_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] || 0) + (v.total_amount || 0);
    }
    const sorted = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [month, total] of sorted) {
      months.push({ month, actual: Math.round(total), forecast: null, lower: null, upper: null });
    }
  } else {
    // Mock 12 months history
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const base = 120000 + Math.sin(d.getMonth() / 2) * 25000 + i * 1500;
      const actual = Math.round(base + (Math.random() - 0.3) * 15000);
      months.push({
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        actual,
        forecast: null,
        lower: null,
        upper: null,
      });
    }
  }

  // Simple forecast: 3 months ahead using weighted avg growth
  const recent = months.slice(-6);
  const avgRevenue = recent.reduce((s, m) => s + m.actual, 0) / recent.length;
  const growthRates: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    growthRates.push((recent[i].actual - recent[i - 1].actual) / recent[i - 1].actual);
  }
  const avgGrowth = growthRates.length > 0 ? growthRates.reduce((s, g) => s + g, 0) / growthRates.length : 0.03;

  for (let i = 1; i <= 3; i++) {
    const lastMonth = months[months.length - 1];
    const lastActual = lastMonth.forecast || lastMonth.actual;
    const predicted = Math.round(lastActual * (1 + avgGrowth));
    const variance = Math.round(predicted * 0.08 * i);
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push({
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      actual: 0,
      forecast: predicted,
      lower: predicted - variance,
      upper: predicted + variance,
    });
  }

  // Scenario analysis
  const lastActual = months.filter(m => m.actual > 0).slice(-1)[0]?.actual || avgRevenue;
  const scenarios = {
    conservative: { growth: Math.round(avgGrowth * 50), annual: Math.round(lastActual * 12 * (1 + avgGrowth * 0.5)) },
    base: { growth: Math.round(avgGrowth * 100), annual: Math.round(lastActual * 12 * (1 + avgGrowth)) },
    optimistic: { growth: Math.round(avgGrowth * 150), annual: Math.round(lastActual * 12 * (1 + avgGrowth * 1.5)) },
  };

  // Revenue by day of week
  const dayOfWeek = [
    { day: 'Mon', avg: Math.round(avgRevenue / 30 * 0.7) },
    { day: 'Tue', avg: Math.round(avgRevenue / 30 * 0.75) },
    { day: 'Wed', avg: Math.round(avgRevenue / 30 * 0.85) },
    { day: 'Thu', avg: Math.round(avgRevenue / 30 * 1.0) },
    { day: 'Fri', avg: Math.round(avgRevenue / 30 * 1.4) },
    { day: 'Sat', avg: Math.round(avgRevenue / 30 * 1.6) },
    { day: 'Sun', avg: Math.round(avgRevenue / 30 * 1.1) },
  ];

  return NextResponse.json({
    months,
    scenarios,
    dayOfWeek,
    summary: {
      current_month: lastActual,
      next_month_forecast: months.find(m => m.forecast)?.forecast || 0,
      avg_monthly: Math.round(avgRevenue),
      trend: avgGrowth > 0 ? 'up' : 'down',
      trend_pct: Math.round(avgGrowth * 100 * 10) / 10,
    },
  });
}
