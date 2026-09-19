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

  // Get revenue from visits
  const { data: visits } = await supabase
    .from('visits')
    .select('amount, created_at')
    .eq('restaurant_id', rid)
    .order('created_at', { ascending: false })
    .limit(2000);

  const allVisits = visits || [];

  // Get menu items for cost data
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('price, cost, times_ordered')
    .eq('restaurant_id', rid);

  const items = menuItems || [];
  const avgFoodCostPct = items.length > 0
    ? items.reduce((s, i) => s + ((i.cost || 0) / Math.max(i.price || 1, 1)), 0) / items.length
    : 0.32; // default 32% food cost

  // Monthly P&L
  const monthMap = new Map<string, number>();
  for (const v of allVisits) {
    const month = (v.created_at || '').substring(0, 7);
    if (month) monthMap.set(month, (monthMap.get(month) || 0) + (v.amount || 0));
  }

  const monthlyPL = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, revenue]) => {
      const cogs = Math.round(revenue * avgFoodCostPct);
      const labor = Math.round(revenue * 0.30); // 30% labor
      const overhead = Math.round(revenue * 0.15); // 15% overhead
      const marketing = Math.round(revenue * 0.05); // 5% marketing
      const totalExpenses = cogs + labor + overhead + marketing;
      const profit = revenue - totalExpenses;
      return {
        month,
        revenue: Math.round(revenue),
        cogs,
        labor,
        overhead,
        marketing,
        total_expenses: totalExpenses,
        profit,
        margin: revenue > 0 ? Math.round((profit / revenue) * 100) : 0,
      };
    });

  // Current month totals
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonthKey = now.getMonth() === 0
    ? `${now.getFullYear() - 1}-12`
    : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;

  const current = monthlyPL.find(m => m.month === currentMonth) || {
    revenue: 0, cogs: 0, labor: 0, overhead: 0, marketing: 0, total_expenses: 0, profit: 0, margin: 0,
  };
  const last = monthlyPL.find(m => m.month === lastMonthKey);

  const revenueTrend = last && last.revenue > 0
    ? Math.round(((current.revenue - last.revenue) / last.revenue) * 100)
    : 0;

  // Expense breakdown for current month
  const expenseBreakdown = [
    { category: 'Cost of Goods', amount: current.cogs, pct: current.revenue > 0 ? Math.round((current.cogs / current.revenue) * 100) : 0, color: '#ef4444' },
    { category: 'Labor', amount: current.labor, pct: current.revenue > 0 ? Math.round((current.labor / current.revenue) * 100) : 0, color: '#f59e0b' },
    { category: 'Overhead', amount: current.overhead, pct: current.revenue > 0 ? Math.round((current.overhead / current.revenue) * 100) : 0, color: '#3b82f6' },
    { category: 'Marketing', amount: current.marketing, pct: current.revenue > 0 ? Math.round((current.marketing / current.revenue) * 100) : 0, color: '#a855f7' },
  ];

  return NextResponse.json({
    current_month: {
      ...current,
      month: currentMonth,
    },
    revenue_trend: revenueTrend,
    monthly_data: monthlyPL,
    expense_breakdown: expenseBreakdown,
    food_cost_pct: Math.round(avgFoodCostPct * 100),
  });
}
