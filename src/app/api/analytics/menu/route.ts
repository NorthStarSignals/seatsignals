import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  times_ordered: number;
  total_revenue: number;
  avg_rating: number | null;
  created_at: string;
}

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

  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('id, name, category, price, cost, times_ordered, total_revenue, avg_rating, created_at')
    .eq('restaurant_id', rid)
    .order('total_revenue', { ascending: false });

  if (!menuItems || menuItems.length === 0) {
    return NextResponse.json({
      items: [],
      top_sellers: [],
      worst_performers: [],
      highest_margin: [],
      categories: [],
      price_suggestions: [],
      trends: [],
      summary: { total_items: 0, total_revenue: 0, avg_margin: 0, avg_rating: 0 },
    });
  }

  const items: MenuItem[] = menuItems;

  // Compute derived metrics per item
  const enriched = items.map(item => {
    const margin = item.price > 0 ? ((item.price - item.cost) / item.price) * 100 : 0;
    const profit = (item.price - item.cost) * item.times_ordered;
    return {
      ...item,
      margin: Math.round(margin * 100) / 100,
      profit: Math.round(profit * 100) / 100,
    };
  });

  // Top sellers by times_ordered
  const topSellers = [...enriched]
    .sort((a, b) => b.times_ordered - a.times_ordered)
    .slice(0, 10)
    .map((item, i) => ({ ...item, rank: i + 1 }));

  // Worst performers
  const worstPerformers = [...enriched]
    .filter(item => item.times_ordered > 0)
    .sort((a, b) => a.times_ordered - b.times_ordered)
    .slice(0, 10)
    .map((item, i) => ({ ...item, rank: i + 1 }));

  // Highest margin items
  const highestMargin = [...enriched]
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 10)
    .map((item, i) => ({ ...item, rank: i + 1 }));

  // Category breakdown
  const categoryMap: Record<string, { count: number; revenue: number; orders: number; cost: number }> = {};
  for (const item of enriched) {
    const cat = item.category || 'Uncategorized';
    if (!categoryMap[cat]) categoryMap[cat] = { count: 0, revenue: 0, orders: 0, cost: 0 };
    categoryMap[cat].count++;
    categoryMap[cat].revenue += item.total_revenue || 0;
    categoryMap[cat].orders += item.times_ordered || 0;
    categoryMap[cat].cost += item.cost * item.times_ordered;
  }

  const categories = Object.entries(categoryMap).map(([name, data]) => ({
    name,
    item_count: data.count,
    total_revenue: Math.round(data.revenue * 100) / 100,
    total_orders: data.orders,
    avg_margin: data.revenue > 0
      ? Math.round(((data.revenue - data.cost) / data.revenue) * 10000) / 100
      : 0,
  }));

  // Price optimization suggestions
  const priceSuggestions: Array<{
    item_name: string;
    current_price: number;
    suggested_price: number;
    reason: string;
    potential_impact: number;
  }> = [];

  for (const item of enriched) {
    // Low margin high-demand items: suggest price increase
    if (item.margin < 30 && item.times_ordered > (enriched.reduce((s, i) => s + i.times_ordered, 0) / enriched.length)) {
      const suggestedPrice = Math.round((item.cost / 0.6) * 100) / 100; // target 40% margin
      if (suggestedPrice > item.price) {
        const potentialGain = (suggestedPrice - item.price) * item.times_ordered;
        priceSuggestions.push({
          item_name: item.name,
          current_price: item.price,
          suggested_price: suggestedPrice,
          reason: 'High demand but low margin - price increase unlikely to hurt volume',
          potential_impact: Math.round(potentialGain * 100) / 100,
        });
      }
    }

    // High margin low-demand items: suggest price decrease to drive volume
    if (item.margin > 70 && item.times_ordered < (enriched.reduce((s, i) => s + i.times_ordered, 0) / enriched.length) * 0.5) {
      const suggestedPrice = Math.round((item.price * 0.85) * 100) / 100;
      const estimatedNewOrders = Math.ceil(item.times_ordered * 1.3);
      const currentProfit = (item.price - item.cost) * item.times_ordered;
      const newProfit = (suggestedPrice - item.cost) * estimatedNewOrders;
      if (newProfit > currentProfit) {
        priceSuggestions.push({
          item_name: item.name,
          current_price: item.price,
          suggested_price: suggestedPrice,
          reason: 'High margin but low demand - price reduction could drive volume',
          potential_impact: Math.round((newProfit - currentProfit) * 100) / 100,
        });
      }
    }

    // Low-rated items: flag for review
    if (item.avg_rating !== null && item.avg_rating < 3.0 && item.times_ordered > 5) {
      priceSuggestions.push({
        item_name: item.name,
        current_price: item.price,
        suggested_price: item.price,
        reason: `Low customer rating (${item.avg_rating}/5) - consider recipe improvement or removal`,
        potential_impact: 0,
      });
    }
  }

  priceSuggestions.sort((a, b) => b.potential_impact - a.potential_impact);

  // Trends: compare items created this month vs last month (simple proxy)
  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = lastMonthDate.toISOString().slice(0, 7);

  const thisMonthItems = enriched.filter(i => i.created_at && i.created_at.slice(0, 7) === thisMonth);
  const lastMonthItems = enriched.filter(i => i.created_at && i.created_at.slice(0, 7) === lastMonth);

  const totalRevenue = enriched.reduce((s, i) => s + (i.total_revenue || 0), 0);
  const totalCost = enriched.reduce((s, i) => s + (i.cost * i.times_ordered), 0);
  const avgMargin = totalRevenue > 0 ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 10000) / 100 : 0;
  const ratedItems = enriched.filter(i => i.avg_rating !== null);
  const avgRating = ratedItems.length > 0
    ? Math.round((ratedItems.reduce((s, i) => s + (i.avg_rating || 0), 0) / ratedItems.length) * 100) / 100
    : 0;

  // Build category revenue for trend chart
  const categoryTrends = categories.map(c => ({
    name: c.name,
    revenue: c.total_revenue,
    orders: c.total_orders,
    margin: c.avg_margin,
  }));

  return NextResponse.json({
    items: enriched,
    top_sellers: topSellers,
    worst_performers: worstPerformers,
    highest_margin: highestMargin,
    categories,
    category_trends: categoryTrends,
    price_suggestions: priceSuggestions.slice(0, 10),
    trends: {
      new_items_this_month: thisMonthItems.length,
      new_items_last_month: lastMonthItems.length,
    },
    summary: {
      total_items: enriched.length,
      total_revenue: Math.round(totalRevenue * 100) / 100,
      avg_margin: avgMargin,
      avg_rating: avgRating,
      total_orders: enriched.reduce((s, i) => s + i.times_ordered, 0),
    },
  });
}
