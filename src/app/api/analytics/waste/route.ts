import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

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

  // Fetch waste log entries
  const { data: wasteEntries } = await supabase
    .from('food_waste_log')
    .select('id, item_name, category, quantity, unit, cost, reason, logged_at')
    .eq('restaurant_id', rid)
    .order('logged_at', { ascending: false });

  const allEntries = wasteEntries || [];

  // Fetch purchase totals for waste percentage calculation
  const { data: purchaseData } = await supabase
    .from('inventory_purchases')
    .select('total_cost')
    .eq('restaurant_id', rid);

  const totalPurchases = (purchaseData || []).reduce((sum, p) => sum + (p.total_cost || 0), 0);

  // Total waste cost
  const totalWasteCost = allEntries.reduce((sum, e) => sum + (e.cost || 0), 0);

  // Waste percentage of purchases
  const wastePercentage = totalPurchases > 0
    ? Math.round((totalWasteCost / totalPurchases) * 10000) / 100
    : 0;

  // Waste by category
  const categoryMap: Record<string, number> = {};
  for (const entry of allEntries) {
    const cat = entry.category || 'Other';
    categoryMap[cat] = (categoryMap[cat] || 0) + (entry.cost || 0);
  }
  const wasteByCategory = Object.entries(categoryMap)
    .map(([category, cost]) => ({ category, cost: Math.round(cost * 100) / 100 }))
    .sort((a, b) => b.cost - a.cost);

  // Top waste items
  const itemMap: Record<string, { cost: number; quantity: number; count: number }> = {};
  for (const entry of allEntries) {
    const name = entry.item_name || 'Unknown';
    if (!itemMap[name]) itemMap[name] = { cost: 0, quantity: 0, count: 0 };
    itemMap[name].cost += entry.cost || 0;
    itemMap[name].quantity += entry.quantity || 0;
    itemMap[name].count += 1;
  }
  const topWasteItems = Object.entries(itemMap)
    .map(([name, data]) => ({
      name,
      total_cost: Math.round(data.cost * 100) / 100,
      total_quantity: Math.round(data.quantity * 100) / 100,
      occurrences: data.count,
    }))
    .sort((a, b) => b.total_cost - a.total_cost)
    .slice(0, 10);

  // Waste trend by day (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dailyMap: Record<string, number> = {};
  for (const entry of allEntries) {
    const date = entry.logged_at ? entry.logged_at.split('T')[0] : null;
    if (date && new Date(date) >= thirtyDaysAgo) {
      dailyMap[date] = (dailyMap[date] || 0) + (entry.cost || 0);
    }
  }
  const wasteTrend = Object.entries(dailyMap)
    .map(([date, cost]) => ({ date, cost: Math.round(cost * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Waste by reason
  const reasonMap: Record<string, number> = {};
  for (const entry of allEntries) {
    const reason = entry.reason || 'Unspecified';
    reasonMap[reason] = (reasonMap[reason] || 0) + (entry.cost || 0);
  }
  const wasteByReason = Object.entries(reasonMap)
    .map(([reason, cost]) => ({ reason, cost: Math.round(cost * 100) / 100 }))
    .sort((a, b) => b.cost - a.cost);

  // Estimated savings opportunity (industry benchmark: reduce waste by 30%)
  const savingsOpportunity = Math.round(totalWasteCost * 0.3 * 100) / 100;

  // Top waste item name
  const topWasteItemName = topWasteItems.length > 0 ? topWasteItems[0].name : 'N/A';

  // Recent log entries (last 20)
  const recentLog = allEntries.slice(0, 20).map(e => ({
    id: e.id,
    item_name: e.item_name,
    category: e.category,
    quantity: e.quantity,
    unit: e.unit,
    cost: e.cost,
    reason: e.reason,
    logged_at: e.logged_at,
  }));

  return NextResponse.json({
    summary: {
      total_waste_cost: Math.round(totalWasteCost * 100) / 100,
      waste_percentage: wastePercentage,
      top_waste_item: topWasteItemName,
      savings_opportunity: savingsOpportunity,
      total_entries: allEntries.length,
      total_purchases: Math.round(totalPurchases * 100) / 100,
    },
    waste_by_category: wasteByCategory,
    waste_trend: wasteTrend,
    top_waste_items: topWasteItems,
    waste_by_reason: wasteByReason,
    recent_log: recentLog,
  });
}
