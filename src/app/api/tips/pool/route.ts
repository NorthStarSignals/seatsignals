import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// ── Types ──

interface ServerTipData {
  name: string;
  role: string;
  hours_worked: number;
  tips_collected: number;
  pool_share: number;
  final_tips: number;
}

type PoolMethod = 'equal' | 'hours' | 'points' | 'role';

// ── Mock enrichment helpers ──

const MOCK_ROLES: Record<string, string> = {
  default: 'Server',
};

const ROLE_POINTS: Record<string, number> = {
  'Head Server': 1.5,
  'Server': 1.0,
  'Busser': 0.7,
  'Host': 0.6,
  'Bartender': 1.3,
};

function assignMockRole(name: string, index: number): string {
  const roles = ['Server', 'Server', 'Bartender', 'Head Server', 'Busser', 'Host'];
  return MOCK_ROLES[name] || roles[index % roles.length];
}

function assignMockHours(index: number): number {
  const hours = [8, 6, 7, 5, 8, 6, 7, 4, 8, 5];
  return hours[index % hours.length];
}

// ── Pool calculation ──

function calculatePool(
  servers: ServerTipData[],
  method: PoolMethod,
  tipOutPct: number
): ServerTipData[] {
  const totalTips = servers.reduce((sum, s) => sum + s.tips_collected, 0);
  const poolAmount = totalTips * (tipOutPct / 100);
  const keptPct = 1 - tipOutPct / 100;

  return servers.map((server) => {
    let poolShare = 0;

    switch (method) {
      case 'equal': {
        poolShare = poolAmount / servers.length;
        break;
      }
      case 'hours': {
        const totalHours = servers.reduce((sum, s) => sum + s.hours_worked, 0);
        poolShare = totalHours > 0 ? (server.hours_worked / totalHours) * poolAmount : 0;
        break;
      }
      case 'points': {
        const serverPoints = ROLE_POINTS[server.role] || 1.0;
        const totalPoints = servers.reduce((sum, s) => sum + (ROLE_POINTS[s.role] || 1.0), 0);
        poolShare = totalPoints > 0 ? (serverPoints / totalPoints) * poolAmount : 0;
        break;
      }
      case 'role': {
        const serverPoints = (ROLE_POINTS[server.role] || 1.0) * server.hours_worked;
        const totalWeighted = servers.reduce(
          (sum, s) => sum + (ROLE_POINTS[s.role] || 1.0) * s.hours_worked,
          0
        );
        poolShare = totalWeighted > 0 ? (serverPoints / totalWeighted) * poolAmount : 0;
        break;
      }
    }

    const keptTips = server.tips_collected * keptPct;
    const finalTips = keptTips + poolShare;

    return {
      ...server,
      pool_share: Math.round(poolShare * 100) / 100,
      final_tips: Math.round(finalTips * 100) / 100,
    };
  });
}

// ── GET: Calculate tip pool ──

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

  const url = new URL(request.url);
  const poolMethod = (url.searchParams.get('pool_method') || 'equal') as PoolMethod;
  const tipOutPct = parseFloat(url.searchParams.get('tip_out_pct') || '100');

  // Query visits with spend data
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: visits } = await supabase
    .from('visits')
    .select('spend_amount, server_name')
    .eq('restaurant_id', restaurant.restaurant_id)
    .gte('timestamp', thirtyDaysAgo.toISOString());

  // Group by server_name and estimate tips as 18% of amount
  const serverMap: Record<string, number> = {};
  for (const v of visits || []) {
    const name = v.server_name || 'Unknown';
    const tip = (v.spend_amount || 0) * 0.18;
    serverMap[name] = (serverMap[name] || 0) + tip;
  }

  // Build server data with mock enrichment
  const serverNames = Object.keys(serverMap);
  const servers: ServerTipData[] = serverNames.map((name, i) => ({
    name,
    role: assignMockRole(name, i),
    hours_worked: assignMockHours(i),
    tips_collected: Math.round(serverMap[name] * 100) / 100,
    pool_share: 0,
    final_tips: 0,
  }));

  // Calculate pool distribution
  const result = calculatePool(servers, poolMethod, tipOutPct);
  const totalTips = result.reduce((sum, s) => sum + s.tips_collected, 0);

  return NextResponse.json({
    servers: result,
    total_tips: Math.round(totalTips * 100) / 100,
    pool_method: poolMethod,
    tip_out_percentage: tipOutPct,
  });
}

// ── POST: Save tip pool configuration ──

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();
  const { pool_method, tip_out_pct, excluded_roles } = body;

  const { data, error } = await supabase
    .from('tip_pool_configs')
    .upsert(
      {
        restaurant_id: restaurant.restaurant_id,
        pool_method: pool_method || 'equal',
        tip_out_pct: tip_out_pct ?? 100,
        excluded_roles: excluded_roles || [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'restaurant_id' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ config: data });
}
