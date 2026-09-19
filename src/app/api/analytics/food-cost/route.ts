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

  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('name, category, price, food_cost_pct, times_ordered')
    .eq('restaurant_id', rid);

  const items = menuItems || [];

  // Per-item analysis
  const itemAnalysis = items.map(item => {
    const costPct = item.food_cost_pct || 30;
    const price = item.price || 0;
    const foodCost = price * (costPct / 100);
    const margin = price - foodCost;
    const timesOrdered = item.times_ordered || 0;
    const totalRevenue = price * timesOrdered;
    const totalCost = foodCost * timesOrdered;
    const totalProfit = margin * timesOrdered;

    return {
      name: item.name,
      category: item.category || 'Other',
      price,
      food_cost: Math.round(foodCost * 100) / 100,
      food_cost_pct: costPct,
      margin: Math.round(margin * 100) / 100,
      margin_pct: Math.round((1 - costPct / 100) * 100),
      times_ordered: timesOrdered,
      total_revenue: Math.round(totalRevenue),
      total_cost: Math.round(totalCost),
      total_profit: Math.round(totalProfit),
    };
  }).sort((a, b) => b.total_profit - a.total_profit);

  // By category
  const catMap = new Map<string, { revenue: number; cost: number; count: number; items: number }>();
  for (const item of itemAnalysis) {
    const existing = catMap.get(item.category) || { revenue: 0, cost: 0, count: 0, items: 0 };
    existing.revenue += item.total_revenue;
    existing.cost += item.total_cost;
    existing.count += item.times_ordered;
    existing.items++;
    catMap.set(item.category, existing);
  }
  const by_category = Array.from(catMap.entries()).map(([category, data]) => ({
    category,
    ...data,
    profit: data.revenue - data.cost,
    cost_pct: data.revenue > 0 ? Math.round((data.cost / data.revenue) * 100) : 0,
  })).sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = itemAnalysis.reduce((s, i) => s + i.total_revenue, 0);
  const totalCost = itemAnalysis.reduce((s, i) => s + i.total_cost, 0);
  const avgFoodCostPct = totalRevenue > 0 ? Math.round((totalCost / totalRevenue) * 100) : 0;

  // Items needing attention (high food cost)
  const highCostItems = itemAnalysis
    .filter(i => i.food_cost_pct > 35 && i.times_ordered > 5)
    .sort((a, b) => b.food_cost_pct - a.food_cost_pct)
    .slice(0, 10);

  // Top profit drivers
  const topProfitItems = itemAnalysis.filter(i => i.times_ordered > 0).slice(0, 10);

  return NextResponse.json({
    items: itemAnalysis,
    by_category,
    high_cost_items: highCostItems,
    top_profit_items: topProfitItems,
    stats: {
      total_items: items.length,
      total_revenue: totalRevenue,
      total_food_cost: totalCost,
      total_profit: totalRevenue - totalCost,
      avg_food_cost_pct: avgFoodCostPct,
      avg_margin_pct: 100 - avgFoodCostPct,
    },
  });
}
