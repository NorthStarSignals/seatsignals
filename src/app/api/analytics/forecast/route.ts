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

  // Query visits for last 90 days grouped by date
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const startDate = ninetyDaysAgo.toISOString().split('T')[0];

  const { data: visits } = await supabase
    .from('visits')
    .select('timestamp, spend_amount')
    .eq('restaurant_id', rid)
    .gte('timestamp', startDate)
    .order('timestamp', { ascending: true });

  // Group by date and sum spend_amount
  const dailyRevenue: Record<string, number> = {};
  for (const v of visits || []) {
    const date = new Date(v.timestamp).toISOString().split('T')[0];
    dailyRevenue[date] = (dailyRevenue[date] || 0) + (v.spend_amount || 0);
  }

  // Build sorted array of all dates (fill gaps with 0)
  const today = new Date();
  const allDates: string[] = [];
  const cursor = new Date(ninetyDaysAgo);
  while (cursor <= today) {
    allDates.push(cursor.toISOString().split('T')[0]);
    cursor.setDate(cursor.getDate() + 1);
  }

  const dailyData = allDates.map(date => ({
    date,
    revenue: dailyRevenue[date] || 0,
  }));

  // Calculate 7-day moving average
  const historical = dailyData.map((d, i) => {
    const windowStart = Math.max(0, i - 6);
    const window = dailyData.slice(windowStart, i + 1);
    const movingAvg = window.reduce((sum, w) => sum + w.revenue, 0) / window.length;
    return {
      date: d.date,
      revenue: Math.round(d.revenue * 100) / 100,
      moving_avg: Math.round(movingAvg * 100) / 100,
    };
  });

  // Linear regression on last 30 days
  const last30 = dailyData.slice(-30);
  const n = last30.length;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    const x = i;
    const y = last30[i].revenue;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const denominator = n * sumX2 - sumX * sumX;
  const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
  const intercept = (sumY - slope * sumX) / n;

  // Project next 30 days
  const forecast: Array<{ date: string; predicted_revenue: number; lower_bound: number; upper_bound: number }> = [];
  const forecastStart = new Date(today);
  forecastStart.setDate(forecastStart.getDate() + 1);

  for (let i = 0; i < 30; i++) {
    const forecastDate = new Date(forecastStart);
    forecastDate.setDate(forecastDate.getDate() + i);
    const x = n + i; // continuing the x index from regression
    const predicted = Math.max(0, slope * x + intercept);
    const rounded = Math.round(predicted * 100) / 100;
    forecast.push({
      date: forecastDate.toISOString().split('T')[0],
      predicted_revenue: rounded,
      lower_bound: Math.round(rounded * 0.8 * 100) / 100,
      upper_bound: Math.round(rounded * 1.2 * 100) / 100,
    });
  }

  // Calculate trend
  const avgDailyRevenue = n > 0 ? sumY / n : 0;
  const firstPredicted = slope * 0 + intercept;
  const lastPredicted = slope * (n - 1) + intercept;
  const pctChange = firstPredicted !== 0
    ? Math.round(((lastPredicted - firstPredicted) / firstPredicted) * 100 * 100) / 100
    : 0;
  const direction = pctChange > 2 ? 'up' : pctChange < -2 ? 'down' : 'flat';

  return NextResponse.json({
    historical,
    forecast,
    trend: {
      direction,
      pct_change: pctChange,
      avg_daily_revenue: Math.round(avgDailyRevenue * 100) / 100,
    },
  });
}
