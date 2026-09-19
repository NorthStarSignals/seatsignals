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

  // Get all customers
  const { data: customers } = await supabase
    .from('customers')
    .select('customer_id, email, source, company, first_seen')
    .eq('restaurant_id', rid);

  if (!customers || customers.length === 0) {
    return NextResponse.json({
      by_source: [],
      top_domains: [],
      total_customers: 0,
      capture_rate_trend: [],
    });
  }

  // Aggregate by source
  const sourceCounts: Record<string, number> = {};
  for (const c of customers) {
    const src = c.source || 'unknown';
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  }
  const bySource = Object.entries(sourceCounts)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  // Top 10 email domains (after @)
  const domainCounts: Record<string, number> = {};
  for (const c of customers) {
    if (!c.email || !c.email.includes('@')) continue;
    const domain = c.email.split('@')[1].toLowerCase();
    domainCounts[domain] = (domainCounts[domain] || 0) + 1;
  }
  const topDomains = Object.entries(domainCounts)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Capture rate trend: new customers per day over last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dailyCounts: Record<string, number> = {};

  // Initialize all 30 days
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split('T')[0];
    dailyCounts[key] = 0;
  }

  for (const c of customers) {
    if (!c.first_seen) continue;
    const dateKey = new Date(c.first_seen).toISOString().split('T')[0];
    if (dateKey in dailyCounts) {
      dailyCounts[dateKey]++;
    }
  }

  const captureRateTrend = Object.entries(dailyCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  return NextResponse.json({
    by_source: bySource,
    top_domains: topDomains,
    total_customers: customers.length,
    capture_rate_trend: captureRateTrend,
  });
}
