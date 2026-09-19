import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

interface Anomaly {
  type: 'revenue_spike' | 'revenue_drop' | 'visit_drop' | 'review_spike' | 'churn_spike';
  date: string;
  value: number;
  expected_value: number;
  deviation_pct: number;
  severity: 'warning' | 'critical';
  description: string;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stddev(arr: number[], avg: number): number {
  if (arr.length < 2) return 0;
  const variance = arr.reduce((s, v) => s + (v - avg) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

export async function GET(request: Request) {
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

  // Parse sensitivity from query params (default 2 std devs)
  const url = new URL(request.url);
  const sensitivity = parseFloat(url.searchParams.get('sensitivity') || '2');

  const now = new Date();
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const anomalies: Anomaly[] = [];

  // ─── 1. Daily revenue from visits (last 90 days) ───
  const { data: visits } = await supabase
    .from('visits')
    .select('timestamp, spend_amount')
    .eq('restaurant_id', rid)
    .gte('timestamp', ninetyDaysAgo.toISOString());

  const dailyRevenue: Record<string, number> = {};
  const dailyVisits: Record<string, number> = {};

  for (const v of visits || []) {
    const day = v.timestamp.slice(0, 10);
    dailyRevenue[day] = (dailyRevenue[day] || 0) + (v.spend_amount || 0);
    dailyVisits[day] = (dailyVisits[day] || 0) + 1;
  }

  // Build sorted day list
  const allDays = Object.keys(dailyRevenue).sort();

  // ─── 2. Revenue anomalies via rolling 30-day stats ───
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDayStr = sevenDaysAgo.toISOString().slice(0, 10);

  for (const day of allDays) {
    if (day < sevenDayStr) continue;

    // Get prior 30 days of revenue for this day's baseline
    const dayDate = new Date(day);
    const windowStart = new Date(dayDate);
    windowStart.setDate(windowStart.getDate() - 30);
    const windowStartStr = windowStart.toISOString().slice(0, 10);

    const windowValues = allDays
      .filter(d => d >= windowStartStr && d < day)
      .map(d => dailyRevenue[d]);

    if (windowValues.length < 7) continue; // need enough data

    const avg = mean(windowValues);
    const sd = stddev(windowValues, avg);
    const todayRev = dailyRevenue[day];

    if (sd > 0 && Math.abs(todayRev - avg) > sensitivity * sd) {
      const deviationPct = Math.round(((todayRev - avg) / avg) * 100);
      const isSpike = todayRev > avg;
      const isCritical = Math.abs(todayRev - avg) > 3 * sd;

      anomalies.push({
        type: isSpike ? 'revenue_spike' : 'revenue_drop',
        date: day,
        value: Math.round(todayRev * 100) / 100,
        expected_value: Math.round(avg * 100) / 100,
        deviation_pct: deviationPct,
        severity: isCritical ? 'critical' : 'warning',
        description: isSpike
          ? `Revenue was $${todayRev.toFixed(0)}, expected ~$${avg.toFixed(0)} (${Math.abs(deviationPct)}% above normal)`
          : `Revenue dropped to $${todayRev.toFixed(0)}, expected ~$${avg.toFixed(0)} (${Math.abs(deviationPct)}% below normal)`,
      });
    }
  }

  // ─── 3. Visit drop detection (> 50% decrease day-over-day) ───
  const recentDays = allDays.filter(d => d >= sevenDayStr);
  for (let i = 1; i < recentDays.length; i++) {
    const prevDay = recentDays[i - 1];
    const currDay = recentDays[i];
    const prevVisits = dailyVisits[prevDay] || 0;
    const currVisits = dailyVisits[currDay] || 0;

    if (prevVisits > 0 && currVisits < prevVisits * 0.5) {
      const dropPct = Math.round(((prevVisits - currVisits) / prevVisits) * 100);
      anomalies.push({
        type: 'visit_drop',
        date: currDay,
        value: currVisits,
        expected_value: prevVisits,
        deviation_pct: -dropPct,
        severity: currVisits === 0 ? 'critical' : 'warning',
        description: `Daily visits dropped to ${currVisits} from ${prevVisits} the previous day (${dropPct}% decrease)`,
      });
    }
  }

  // ─── 4. Review spike detection (3+ reviews in a day when avg < 1/day) ───
  const { data: reviews } = await supabase
    .from('reviews')
    .select('created_at')
    .eq('restaurant_id', rid)
    .gte('created_at', ninetyDaysAgo.toISOString());

  const dailyReviews: Record<string, number> = {};
  for (const r of reviews || []) {
    const day = r.created_at.slice(0, 10);
    dailyReviews[day] = (dailyReviews[day] || 0) + 1;
  }

  const reviewDays = Object.keys(dailyReviews);
  const avgDailyReviews = reviewDays.length > 0
    ? mean(Object.values(dailyReviews))
    : 0;

  if (avgDailyReviews < 1) {
    for (const day of reviewDays) {
      if (day < sevenDayStr) continue;
      if (dailyReviews[day] >= 3) {
        anomalies.push({
          type: 'review_spike',
          date: day,
          value: dailyReviews[day],
          expected_value: Math.round(avgDailyReviews * 100) / 100,
          deviation_pct: Math.round(((dailyReviews[day] - avgDailyReviews) / Math.max(avgDailyReviews, 0.1)) * 100),
          severity: dailyReviews[day] >= 5 ? 'critical' : 'warning',
          description: `${dailyReviews[day]} reviews received in one day (average is ${avgDailyReviews.toFixed(1)}/day)`,
        });
      }
    }
  }

  // ─── 5. Churn spike (> 5 customers going stale in one day) ───
  const { data: customers } = await supabase
    .from('customers')
    .select('last_seen')
    .eq('restaurant_id', rid)
    .gte('last_seen', sevenDayStr);

  const staleByDay: Record<string, number> = {};
  const staleThreshold = 30; // days without visit = stale

  for (const c of customers || []) {
    const lastSeen = new Date(c.last_seen);
    const daysSince = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince >= staleThreshold) {
      const day = c.last_seen.slice(0, 10);
      staleByDay[day] = (staleByDay[day] || 0) + 1;
    }
  }

  for (const [day, count] of Object.entries(staleByDay)) {
    if (count > 5) {
      anomalies.push({
        type: 'churn_spike',
        date: day,
        value: count,
        expected_value: 2,
        deviation_pct: Math.round(((count - 2) / 2) * 100),
        severity: count > 10 ? 'critical' : 'warning',
        description: `${count} customers went stale on this day (last visited ${staleThreshold}+ days ago)`,
      });
    }
  }

  // Sort anomalies by date descending
  anomalies.sort((a, b) => b.date.localeCompare(a.date));

  const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
  const mostRecent = anomalies.length > 0 ? anomalies[0].date : null;

  return NextResponse.json({
    anomalies,
    summary: {
      total_anomalies: anomalies.length,
      critical_count: criticalCount,
      most_recent: mostRecent,
    },
  });
}
