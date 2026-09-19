import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

function getRestaurantId(supabase: ReturnType<typeof createServerSupabase>, userId: string) {
  return supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();
}

// Deterministic pseudo-random from a seed string (member id + period)
function seededRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  // Return a function that produces successive pseudo-random numbers
  return () => {
    hash = (hash * 1664525 + 1013904223) | 0;
    return (hash >>> 0) / 4294967296;
  };
}

interface TeamMember {
  id: string;
  restaurant_id: string;
  name: string | null;
  email: string;
  role: string;
  created_at: string;
}

interface StaffMetrics {
  member_id: string;
  name: string;
  email: string;
  role: string;
  revenue_per_shift: number;
  avg_check_size: number;
  customer_satisfaction: number;
  upsell_rate: number;
  shifts_worked: number;
  composite_score: number;
  trend: number[];
  badges: string[];
}

function generateMetrics(
  member: TeamMember,
  period: string,
): StaffMetrics {
  const rand = seededRandom(`${member.id}-${period}`);

  // Role-based baselines — managers/admins trend higher
  const roleMultiplier = member.role === 'manager' ? 1.15
    : member.role === 'admin' ? 1.1
    : member.role === 'staff' ? 1.0
    : 0.95;

  const shiftsBase = period === 'week' ? 5 : period === 'month' ? 20 : 60;
  const shifts = Math.max(1, Math.round((shiftsBase + (rand() * 6 - 3)) * roleMultiplier));

  const revenuePerShift = Math.round((800 + rand() * 1200) * roleMultiplier);
  const avgCheck = Math.round((35 + rand() * 45) * 100) / 100;
  const satisfaction = Math.round((3.2 + rand() * 1.8) * 10) / 10; // 3.2 - 5.0
  const upsellRate = Math.round((15 + rand() * 35) * 10) / 10; // 15% - 50%

  // Composite: weighted blend (revenue 30%, check 20%, satisfaction 30%, upsell 20%)
  const revenueNorm = Math.min(revenuePerShift / 2000, 1);
  const checkNorm = Math.min(avgCheck / 80, 1);
  const satNorm = (satisfaction - 1) / 4;
  const upsellNorm = upsellRate / 50;
  const composite = Math.round(
    (revenueNorm * 0.3 + checkNorm * 0.2 + satNorm * 0.3 + upsellNorm * 0.2) * 100,
  );

  // Trend: 8 data points showing recent composite movement
  const trend: number[] = [];
  for (let i = 0; i < 8; i++) {
    const noise = (rand() - 0.5) * 16;
    trend.push(Math.max(0, Math.min(100, composite + noise)));
  }

  // Badges
  const badges: string[] = [];
  if (revenuePerShift > 1600) badges.push('Top Closer');
  if (satisfaction >= 4.5) badges.push('Best Reviews');
  if (upsellRate > 40) badges.push('Most Upsells');
  if (shifts >= shiftsBase * 1.1) badges.push('Iron Shift');
  if (composite >= 75) badges.push('Star Performer');

  return {
    member_id: member.id,
    name: member.name || member.email.split('@')[0],
    email: member.email,
    role: member.role,
    revenue_per_shift: revenuePerShift,
    avg_check_size: avgCheck,
    customer_satisfaction: satisfaction,
    upsell_rate: upsellRate,
    shifts_worked: shifts,
    composite_score: composite,
    trend,
    badges,
  };
}

export async function GET(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await getRestaurantId(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const rid = restaurant.restaurant_id;
  const period = req.nextUrl.searchParams.get('period') || 'month'; // week | month | quarter

  // Fetch team members
  const { data: members, error: membersErr } = await supabase
    .from('team_members')
    .select('id, restaurant_id, name, email, role, created_at')
    .eq('restaurant_id', rid)
    .order('created_at', { ascending: true });

  if (membersErr) return NextResponse.json({ error: membersErr.message }, { status: 500 });

  const teamMembers: TeamMember[] = members || [];

  // Generate performance metrics per member
  const staffMetrics = teamMembers.map((m) =>
    generateMetrics(m, period),
  );

  // Sort by composite score descending for leaderboard
  const leaderboard = [...staffMetrics].sort(
    (a, b) => b.composite_score - a.composite_score,
  );

  // Team averages
  const count = staffMetrics.length || 1;
  const teamAverages = {
    avg_revenue_per_shift: Math.round(
      staffMetrics.reduce((s, m) => s + m.revenue_per_shift, 0) / count,
    ),
    avg_check_size: Math.round(
      (staffMetrics.reduce((s, m) => s + m.avg_check_size, 0) / count) * 100,
    ) / 100,
    avg_satisfaction: Math.round(
      (staffMetrics.reduce((s, m) => s + m.customer_satisfaction, 0) / count) * 10,
    ) / 10,
    avg_upsell_rate: Math.round(
      (staffMetrics.reduce((s, m) => s + m.upsell_rate, 0) / count) * 10,
    ) / 10,
    avg_composite: Math.round(
      staffMetrics.reduce((s, m) => s + m.composite_score, 0) / count,
    ),
    total_staff: teamMembers.length,
  };

  // Radar chart data for team comparison (top 5 vs team avg)
  const top5 = leaderboard.slice(0, 5);
  const radarCategories = [
    'Revenue',
    'Check Size',
    'Satisfaction',
    'Upsell Rate',
    'Consistency',
  ];

  const radarData = radarCategories.map((category) => {
    const entry: Record<string, string | number> = { category };
    entry['Team Avg'] = category === 'Revenue'
      ? Math.round((teamAverages.avg_revenue_per_shift / 2000) * 100)
      : category === 'Check Size'
        ? Math.round((teamAverages.avg_check_size / 80) * 100)
        : category === 'Satisfaction'
          ? Math.round(((teamAverages.avg_satisfaction - 1) / 4) * 100)
          : category === 'Upsell Rate'
            ? Math.round((teamAverages.avg_upsell_rate / 50) * 100)
            : teamAverages.avg_composite;

    for (const member of top5) {
      const key = member.name;
      entry[key] = category === 'Revenue'
        ? Math.round((member.revenue_per_shift / 2000) * 100)
        : category === 'Check Size'
          ? Math.round((member.avg_check_size / 80) * 100)
          : category === 'Satisfaction'
            ? Math.round(((member.customer_satisfaction - 1) / 4) * 100)
            : category === 'Upsell Rate'
              ? Math.round((member.upsell_rate / 50) * 100)
              : member.composite_score;
    }
    return entry;
  });

  return NextResponse.json({
    leaderboard,
    team_averages: teamAverages,
    radar_data: radarData,
    period,
  });
}
