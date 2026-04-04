import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id, name, cuisine_type, brand_voice, address')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const rid = restaurant.restaurant_id;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Pull ALL data across pillars
  const [
    { count: totalCustomers },
    { count: newCustomers30d },
    { data: reviews },
    { data: cateringOrders },
    { data: corpAccounts },
    { data: deadHours },
    { data: birthdayEvents },
    { data: sequences },
    { data: customers },
    { data: deliveryData },
  ] = await Promise.all([
    supabase.from('customers').select('*', { count: 'exact', head: true }).eq('restaurant_id', rid),
    supabase.from('customers').select('*', { count: 'exact', head: true }).eq('restaurant_id', rid).gte('first_seen', thirtyDaysAgo.toISOString()),
    supabase.from('reviews').select('rating, text, author, platform, created_at, response_status').eq('restaurant_id', rid).order('created_at', { ascending: false }).limit(50),
    supabase.from('catering_orders').select('amount, date, recurring, corporate_account_id').eq('restaurant_id', rid).gte('date', sixtyDaysAgo.toISOString()),
    supabase.from('corporate_accounts').select('company_name, total_lifetime_value, primary_contact').eq('restaurant_id', rid),
    supabase.from('dead_hours').select('revenue, seats_filled, triggered_at, time_start, time_end').eq('restaurant_id', rid).gte('triggered_at', thirtyDaysAgo.toISOString()),
    supabase.from('birthday_events').select('check_total, redeemed, offer_sent_at').eq('restaurant_id', rid).gte('offer_sent_at', sixtyDaysAgo.toISOString()),
    supabase.from('sequences').select('type, converted, sent_at, message').eq('restaurant_id', rid).gte('sent_at', thirtyDaysAgo.toISOString()),
    supabase.from('customers').select('visit_count, total_spend, last_seen, source').eq('restaurant_id', rid).order('total_spend', { ascending: false }).limit(100),
    supabase.from('delivery_metrics').select('platform, orders, revenue, avg_order_value, rating').eq('restaurant_id', rid),
  ]);

  // Compute aggregates
  const avgRating = reviews && reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : 'N/A';
  const reviewCount = reviews?.length || 0;
  const responseRate = reviews && reviews.length > 0
    ? Math.round(reviews.filter(r => r.response_status === 'posted').length / reviews.length * 100) : 0;

  const cateringRevenue = (cateringOrders || []).reduce((s, o) => s + (o.amount || 0), 0);
  const corpMonthly = (corpAccounts || []).reduce((s, a) => s + (a.total_lifetime_value || 0), 0);
  const deadHoursRevenue = (deadHours || []).reduce((s, d) => s + (d.revenue || 0), 0);
  const birthdayRevenue = (birthdayEvents || []).filter(b => b.redeemed).reduce((s, b) => s + (b.check_total || 0), 0);
  const birthdayRedemptionRate = birthdayEvents && birthdayEvents.length > 0
    ? Math.round(birthdayEvents.filter(b => b.redeemed).length / birthdayEvents.length * 100) : 0;

  const retentionConverted = (sequences || []).filter(s => s.converted).length;
  const retentionTotal = (sequences || []).length;

  const topCustomers = (customers || []).slice(0, 10).map(c => ({
    visits: c.visit_count,
    spend: c.total_spend,
    lastSeen: c.last_seen,
    source: c.source,
  }));

  const deliverySummary = (deliveryData || []).map(d => ({
    platform: d.platform,
    orders: d.orders,
    revenue: d.revenue,
    avgOrderValue: d.avg_order_value,
    rating: d.rating,
  }));

  const anthropic = new Anthropic();

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: `You are the chief intelligence officer for "${restaurant.name}" (${restaurant.cuisine_type}). Brand voice: ${restaurant.brand_voice || 'professional'}.

Generate a comprehensive "State of the Business" intelligence report. Return ONLY valid JSON, no other text.

You are combining data across ALL revenue pillars: customer capture, reviews, catering, corporate accounts, dead hours, birthdays, delivery, and retention sequences.

Be specific, data-driven, and actionable. Every recommendation should include an expected revenue impact where possible.

Return this JSON structure:
{
  "overallGrade": "A+" to "F" (overall business health),
  "headline": "One-sentence state of the business",
  "sections": [
    {
      "title": "Section title",
      "icon": "one of: customers, reviews, revenue, catering, corporate, deadhours, birthday, delivery, retention, marketing, menu, staff",
      "status": "strong" | "needs_attention" | "critical",
      "findings": ["Key finding 1", "Key finding 2"],
      "recommendations": [
        { "action": "Specific action", "impact": "Expected revenue impact", "priority": "high" | "medium" | "low", "timeframe": "This week / This month / This quarter" }
      ]
    }
  ],
  "quickWins": [
    { "action": "Something they can do today", "expectedImpact": "$X revenue or Y% improvement" }
  ],
  "strategicPriorities": [
    { "priority": "Strategic initiative", "reasoning": "Why this matters", "timeline": "When to start" }
  ],
  "revenueOpportunities": [
    { "opportunity": "Specific revenue opportunity", "estimatedValue": "$X/month", "effort": "low" | "medium" | "high" }
  ]
}`,
    messages: [{
      role: 'user',
      content: `Generate the intelligence report based on this data:

CUSTOMERS: ${totalCustomers || 0} total, ${newCustomers30d || 0} new in last 30 days
Top 10 customers by spend: ${JSON.stringify(topCustomers)}

REVIEWS: ${reviewCount} total, Avg rating: ${avgRating}, Response rate: ${responseRate}%
Recent review themes: ${reviews?.slice(0, 10).map(r => `${r.rating}★: "${r.text?.substring(0, 80)}"`).join(' | ') || 'None'}

CATERING: $${cateringRevenue} revenue (60 days), ${(cateringOrders || []).length} orders
CORPORATE: ${(corpAccounts || []).length} accounts, $${corpMonthly}/month recurring
DEAD HOURS: $${deadHoursRevenue} recovered (30 days), ${(deadHours || []).length} promotions triggered
BIRTHDAYS: $${birthdayRevenue} revenue, ${birthdayRedemptionRate}% redemption rate
RETENTION: ${retentionConverted}/${retentionTotal} sequences converted (30 days)
DELIVERY: ${JSON.stringify(deliverySummary)}

Current date: ${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
    }],
  });

  const textBlock = message.content.find(b => b.type === 'text');
  const raw = textBlock?.text || '{}';

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const report = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    return NextResponse.json(report);
  } catch {
    return NextResponse.json({ overallGrade: '?', headline: 'Report generation failed. Please try again.', sections: [], quickWins: [], strategicPriorities: [], revenueOpportunities: [] });
  }
}
