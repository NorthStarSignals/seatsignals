import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

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

  // Determine comparison window
  const now = new Date();
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() - now.getDay());
  currentWeekStart.setHours(0, 0, 0, 0);

  const lookbackDays = parseInt(req.nextUrl.searchParams.get('days') || '90', 10);
  const historicStart = new Date(now);
  historicStart.setDate(now.getDate() - lookbackDays);

  // Fetch all customers with visit data
  const { data: customers } = await supabase
    .from('customers')
    .select('id, first_name, last_name, last_seen, visit_count, total_spend')
    .eq('restaurant_id', rid);

  const allCustomers = customers || [];

  // Try to fetch from visits table for precise timestamps
  const { data: recentVisits } = await supabase
    .from('visits')
    .select('timestamp, spend_amount')
    .eq('restaurant_id', rid)
    .gte('timestamp', historicStart.toISOString())
    .order('timestamp', { ascending: true });

  const hasVisitsTable = recentVisits && recentVisits.length > 0;

  // ── Hourly distribution (0-23) ──
  const hourlyAll = new Array(24).fill(0);       // all-time average
  const hourlyCurrent = new Array(24).fill(0);   // current week
  const hourlyRevAll = new Array(24).fill(0);
  const hourlyRevCurrent = new Array(24).fill(0);

  // ── Day-of-week patterns ──
  const dowAll = new Array(7).fill(0);
  const dowCurrent = new Array(7).fill(0);
  const dowRevAll = new Array(7).fill(0);

  if (hasVisitsTable) {
    // Use real visit timestamps
    for (const visit of recentVisits!) {
      const dt = new Date(visit.timestamp);
      const hour = dt.getHours();
      const dow = dt.getDay();

      hourlyAll[hour]++;
      dowAll[dow]++;
      hourlyRevAll[hour] += visit.spend_amount || 0;
      dowRevAll[dow] += visit.spend_amount || 0;

      if (dt >= currentWeekStart) {
        hourlyCurrent[hour]++;
        hourlyRevCurrent[hour] += visit.spend_amount || 0;
        dowCurrent[dow]++;
      }
    }
  } else {
    // Approximate from customer last_seen timestamps
    // Distribute each customer's visits across typical restaurant hours weighted by last_seen
    for (const cust of allCustomers) {
      if (!cust.last_seen) continue;
      const dt = new Date(cust.last_seen);
      const hour = dt.getHours();
      const dow = dt.getDay();
      const visits = cust.visit_count || 1;
      const avgSpend = cust.total_spend && visits > 0 ? cust.total_spend / visits : 45;

      // Use last_seen as representative of preferred time
      hourlyAll[hour] += visits;
      dowAll[dow] += visits;
      hourlyRevAll[hour] += avgSpend * visits;
      dowRevAll[dow] += avgSpend * visits;

      if (dt >= currentWeekStart) {
        hourlyCurrent[hour]++;
        hourlyRevCurrent[hour] += avgSpend;
        dowCurrent[dow]++;
      }

      // Spread some visits to adjacent hours for realism
      const spreadVisits = Math.floor(visits * 0.3);
      if (hour > 0) {
        hourlyAll[hour - 1] += spreadVisits;
        hourlyRevAll[hour - 1] += avgSpend * spreadVisits;
      }
      if (hour < 23) {
        hourlyAll[hour + 1] += spreadVisits;
        hourlyRevAll[hour + 1] += avgSpend * spreadVisits;
      }
    }
  }

  // Normalize hourly data for weekly average
  const weeksInRange = Math.max(lookbackDays / 7, 1);
  const hourlyDistribution = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    label: formatHour(h),
    avg_visits: Math.round((hourlyAll[h] / weeksInRange) * 10) / 10,
    current_week_visits: hourlyCurrent[h],
    avg_revenue: Math.round((hourlyRevAll[h] / weeksInRange) * 100) / 100,
    current_week_revenue: Math.round(hourlyRevCurrent[h] * 100) / 100,
  }));

  const dowDistribution = DAY_NAMES.map((name, i) => ({
    day: name,
    short: name.slice(0, 3),
    avg_visits: Math.round((dowAll[i] / weeksInRange) * 10) / 10,
    current_week_visits: dowCurrent[i],
    avg_revenue: Math.round((dowRevAll[i] / weeksInRange) * 100) / 100,
  }));

  // ── Peak hours identification ──
  const sortedHours = [...hourlyDistribution].sort(
    (a, b) => b.avg_visits - a.avg_visits,
  );
  const peakHours = sortedHours.slice(0, 5).map((h) => ({
    hour: h.hour,
    label: h.label,
    avg_visits: h.avg_visits,
    avg_revenue: h.avg_revenue,
  }));
  const slowHours = sortedHours
    .filter((h) => h.avg_visits > 0)
    .slice(-5)
    .reverse()
    .map((h) => ({
      hour: h.hour,
      label: h.label,
      avg_visits: h.avg_visits,
      avg_revenue: h.avg_revenue,
    }));

  // ── Staffing recommendations ──
  const maxVisits = Math.max(...hourlyDistribution.map((h) => h.avg_visits), 1);
  const staffingRecommendations = Array.from({ length: 24 }, (_, h) => {
    const ratio = hourlyDistribution[h].avg_visits / maxVisits;
    let level: 'minimal' | 'low' | 'moderate' | 'high' | 'peak';
    let recommended: number;

    if (ratio < 0.1) { level = 'minimal'; recommended = 1; }
    else if (ratio < 0.3) { level = 'low'; recommended = 2; }
    else if (ratio < 0.55) { level = 'moderate'; recommended = 3; }
    else if (ratio < 0.8) { level = 'high'; recommended = 4; }
    else { level = 'peak'; recommended = 5; }

    return {
      hour: h,
      label: formatHour(h),
      level,
      recommended_staff: recommended,
      expected_visits: hourlyDistribution[h].avg_visits,
    };
  });

  // ── Current week vs average comparison ──
  const totalAvgVisits = hourlyDistribution.reduce((s, h) => s + h.avg_visits, 0);
  const totalCurrentVisits = hourlyDistribution.reduce((s, h) => s + h.current_week_visits, 0);
  const totalAvgRevenue = hourlyDistribution.reduce((s, h) => s + h.avg_revenue, 0);
  const totalCurrentRevenue = hourlyDistribution.reduce((s, h) => s + h.current_week_revenue, 0);

  const comparison = {
    avg_weekly_visits: Math.round(totalAvgVisits),
    current_week_visits: totalCurrentVisits,
    visits_change_pct: totalAvgVisits > 0
      ? Math.round(((totalCurrentVisits - totalAvgVisits) / totalAvgVisits) * 100)
      : 0,
    avg_weekly_revenue: Math.round(totalAvgRevenue * 100) / 100,
    current_week_revenue: Math.round(totalCurrentRevenue * 100) / 100,
    revenue_change_pct: totalAvgRevenue > 0
      ? Math.round(((totalCurrentRevenue - totalAvgRevenue) / totalAvgRevenue) * 100)
      : 0,
  };

  // Busiest day & hour
  const busiestDay = dowDistribution.reduce((best, d) =>
    d.avg_visits > best.avg_visits ? d : best, dowDistribution[0]);
  const busiestHour = peakHours[0] || null;

  return NextResponse.json({
    hourly_distribution: hourlyDistribution,
    day_of_week: dowDistribution,
    peak_hours: peakHours,
    slow_hours: slowHours,
    staffing_recommendations: staffingRecommendations,
    comparison,
    insights: {
      busiest_day: busiestDay?.day || 'N/A',
      busiest_hour: busiestHour?.label || 'N/A',
      data_source: hasVisitsTable ? 'visits' : 'customer_approximation',
      lookback_days: lookbackDays,
    },
  });
}
