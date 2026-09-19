import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export async function GET(req: NextRequest) {
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
  const days = parseInt(req.nextUrl.searchParams.get('days') || '30', 10);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: visits } = await supabase
    .from('visits')
    .select('timestamp, spend_amount')
    .eq('restaurant_id', rid)
    .gte('timestamp', since.toISOString())
    .order('timestamp', { ascending: true });

  const allVisits = visits || [];

  // Build 7x24 matrix
  type CellData = { revenue: number; visits: number; avg_spend: number };
  const matrix: Record<string, Record<string, CellData>> = {};

  for (let d = 0; d < 7; d++) {
    matrix[d.toString()] = {};
    for (let h = 0; h < 24; h++) {
      matrix[d.toString()][h.toString()] = { revenue: 0, visits: 0, avg_spend: 0 };
    }
  }

  // Accumulate raw totals
  for (const visit of allVisits) {
    const dt = new Date(visit.timestamp);
    const day = dt.getDay(); // 0=Sun, 6=Sat
    const hour = dt.getHours();
    const cell = matrix[day.toString()][hour.toString()];
    cell.revenue += visit.spend_amount || 0;
    cell.visits += 1;
  }

  // Compute avg_spend for each cell
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const cell = matrix[d.toString()][h.toString()];
      cell.avg_spend = cell.visits > 0 ? Math.round((cell.revenue / cell.visits) * 100) / 100 : 0;
      cell.revenue = Math.round(cell.revenue * 100) / 100;
    }
  }

  // Compute insights
  let busiestDay = 0;
  let busiestDayVisits = 0;
  let busiestHour = 0;
  let busiestHourVisits = 0;
  let peakSlotDay = 0;
  let peakSlotHour = 0;
  let peakSlotRevenue = 0;
  let quietestSlotDay = 0;
  let quietestSlotHour = 0;
  let quietestSlotRevenue = Infinity;

  const dayTotals: number[] = new Array(7).fill(0);
  const hourTotals: number[] = new Array(24).fill(0);
  const dayVisits: number[] = new Array(7).fill(0);

  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const cell = matrix[d.toString()][h.toString()];
      dayTotals[d] += cell.revenue;
      hourTotals[h] += cell.revenue;
      dayVisits[d] += cell.visits;

      if (cell.revenue > peakSlotRevenue) {
        peakSlotRevenue = cell.revenue;
        peakSlotDay = d;
        peakSlotHour = h;
      }
      if (cell.revenue < quietestSlotRevenue) {
        quietestSlotRevenue = cell.revenue;
        quietestSlotDay = d;
        quietestSlotHour = h;
      }
    }
  }

  for (let d = 0; d < 7; d++) {
    if (dayVisits[d] > busiestDayVisits) {
      busiestDayVisits = dayVisits[d];
      busiestDay = d;
    }
  }

  for (let h = 0; h < 24; h++) {
    const hourVisitTotal = Array.from({ length: 7 }, (_, d) => matrix[d.toString()][h.toString()].visits)
      .reduce((sum, v) => sum + v, 0);
    if (hourVisitTotal > busiestHourVisits) {
      busiestHourVisits = hourVisitTotal;
      busiestHour = h;
    }
  }

  const totalRevenue = dayTotals.reduce((a, b) => a + b, 0);
  const avgDailyRevenue = Math.round((totalRevenue / Math.max(days, 1)) * 100) / 100;

  // Revenue consistency score (based on std deviation of daily totals)
  const meanDayRevenue = totalRevenue / 7;
  const variance = dayTotals.reduce((sum, val) => sum + Math.pow(val - meanDayRevenue, 2), 0) / 7;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = meanDayRevenue > 0 ? stdDev / meanDayRevenue : 0;
  // Convert to 0-100 score where lower CV = higher consistency
  const consistencyScore = Math.round(Math.max(0, Math.min(100, (1 - coefficientOfVariation) * 100)));

  const formatHour = (h: number) => {
    if (h === 0) return '12AM';
    if (h < 12) return `${h}AM`;
    if (h === 12) return '12PM';
    return `${h - 12}PM`;
  };

  return NextResponse.json({
    matrix,
    insights: {
      busiest_day: DAY_NAMES[busiestDay],
      busiest_hour: formatHour(busiestHour),
      peak_slot: `${DAY_NAMES[peakSlotDay]} ${formatHour(peakSlotHour)}`,
      peak_slot_revenue: peakSlotRevenue,
      quietest_slot: `${DAY_NAMES[quietestSlotDay]} ${formatHour(quietestSlotHour)}`,
      avg_daily_revenue: avgDailyRevenue,
      consistency_score: consistencyScore,
    },
    daily_totals: DAY_NAMES.map((name, i) => ({
      day: name.slice(0, 3),
      revenue: Math.round(dayTotals[i] * 100) / 100,
      visits: dayVisits[i],
    })),
    hourly_totals: Array.from({ length: 24 }, (_, h) => ({
      hour: formatHour(h),
      revenue: Math.round(hourTotals[h] * 100) / 100,
    })),
  });
}
