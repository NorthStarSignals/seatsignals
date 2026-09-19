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

  // Get revenue data for labor cost ratio
  const { data: visits } = await supabase
    .from('visits')
    .select('amount, created_at')
    .eq('restaurant_id', rid)
    .gte('created_at', new Date(Date.now() - 180 * 86400000).toISOString());

  const allVisits = visits || [];

  // Monthly revenue
  const monthlyRevenue = new Map<string, number>();
  for (const v of allVisits) {
    const month = new Date(v.created_at).toLocaleString('default', { month: 'short', year: '2-digit' });
    monthlyRevenue.set(month, (monthlyRevenue.get(month) || 0) + (v.amount || 0));
  }

  // Simulated labor costs (typically 25-35% of revenue)
  const monthly = Array.from(monthlyRevenue.entries()).map(([month, revenue]) => {
    const laborPct = 0.28 + Math.random() * 0.06;
    const laborCost = Math.round(revenue * laborPct);
    const foh = Math.round(laborCost * 0.45);
    const boh = Math.round(laborCost * 0.40);
    const mgmt = Math.round(laborCost * 0.15);

    return {
      month,
      revenue: Math.round(revenue),
      labor_cost: laborCost,
      labor_pct: Math.round(laborPct * 100),
      foh_cost: foh,
      boh_cost: boh,
      mgmt_cost: mgmt,
      overtime_cost: Math.round(laborCost * 0.05),
    };
  });

  // Forecast next 3 months
  const lastRevenue = monthly.length > 0 ? monthly[monthly.length - 1].revenue : 100000;
  const forecast = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() + i);
    const projected = Math.round(lastRevenue * (0.95 + Math.random() * 0.15));
    const laborPct = 0.30;
    forecast.push({
      month: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
      projected_revenue: projected,
      projected_labor: Math.round(projected * laborPct),
      labor_pct: Math.round(laborPct * 100),
      type: 'forecast',
    });
  }

  const totalRevenue = monthly.reduce((s, m) => s + m.revenue, 0);
  const totalLabor = monthly.reduce((s, m) => s + m.labor_cost, 0);
  const avgLaborPct = totalRevenue > 0 ? Math.round((totalLabor / totalRevenue) * 100) : 0;
  const totalOT = monthly.reduce((s, m) => s + m.overtime_cost, 0);

  // By role
  const by_role = [
    { role: 'Servers', cost: Math.round(totalLabor * 0.22), pct: 22, headcount: 6 },
    { role: 'Cooks', cost: Math.round(totalLabor * 0.28), pct: 28, headcount: 4 },
    { role: 'Bartenders', cost: Math.round(totalLabor * 0.12), pct: 12, headcount: 2 },
    { role: 'Hosts', cost: Math.round(totalLabor * 0.06), pct: 6, headcount: 2 },
    { role: 'Dishwashers', cost: Math.round(totalLabor * 0.08), pct: 8, headcount: 2 },
    { role: 'Management', cost: Math.round(totalLabor * 0.18), pct: 18, headcount: 2 },
    { role: 'Other', cost: Math.round(totalLabor * 0.06), pct: 6, headcount: 2 },
  ];

  return NextResponse.json({
    monthly,
    forecast,
    by_role,
    stats: {
      avg_labor_pct: avgLaborPct,
      total_labor_cost: totalLabor,
      total_revenue: totalRevenue,
      overtime_cost: totalOT,
      target_labor_pct: 30,
      headcount: 20,
    },
  });
}
