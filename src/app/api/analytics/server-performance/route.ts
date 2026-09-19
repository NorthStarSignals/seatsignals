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

  // Get visits with server info
  const { data: visits } = await supabase
    .from('visits')
    .select('amount, party_size, server_name, created_at')
    .eq('restaurant_id', rid)
    .not('server_name', 'is', null)
    .limit(2000);

  const allVisits = visits || [];

  // Aggregate by server
  const serverMap = new Map<string, { revenue: number; covers: number; checks: number; tips: number }>();
  for (const v of allVisits) {
    const server = v.server_name || 'Unknown';
    const existing = serverMap.get(server) || { revenue: 0, covers: 0, checks: 0, tips: 0 };
    existing.revenue += v.amount || 0;
    existing.covers += v.party_size || 1;
    existing.checks++;
    existing.tips += (v.amount || 0) * 0.18; // estimated 18% avg tip
    serverMap.set(server, existing);
  }

  const servers = Array.from(serverMap.entries())
    .map(([name, data]) => ({
      name,
      revenue: Math.round(data.revenue),
      covers: data.covers,
      checks: data.checks,
      avg_check: data.checks > 0 ? Math.round(data.revenue / data.checks) : 0,
      avg_covers_per_shift: Math.round(data.covers / Math.max(data.checks / 5, 1)), // estimate ~5 tables per shift
      tips_earned: Math.round(data.tips),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = servers.reduce((s, sv) => s + sv.revenue, 0);
  const topServer = servers[0];
  const avgRevPerServer = servers.length > 0 ? Math.round(totalRevenue / servers.length) : 0;

  return NextResponse.json({
    servers,
    total_servers: servers.length,
    total_revenue: totalRevenue,
    top_server: topServer?.name || 'N/A',
    avg_revenue_per_server: avgRevPerServer,
  });
}
