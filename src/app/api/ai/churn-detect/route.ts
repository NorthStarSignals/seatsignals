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
    .select('restaurant_id, name, cuisine_type')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const rid = restaurant.restaurant_id;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Customers who haven't visited recently but had previous activity
  const { data: customers } = await supabase
    .from('customers')
    .select('customer_id, first_name, email, phone, visit_count, total_spend, first_seen, last_seen, birthday, source')
    .eq('restaurant_id', rid)
    .lt('last_seen', thirtyDaysAgo.toISOString())
    .gt('visit_count', 0)
    .order('total_spend', { ascending: false })
    .limit(50);

  if (!customers || customers.length === 0) {
    return NextResponse.json({
      alerts: [],
      summary: { critical: 0, high: 0, medium: 0, totalRevenueAtRisk: 0 },
    });
  }

  const customerProfiles = customers.map(c => {
    const daysSinceLastVisit = Math.floor((now.getTime() - new Date(c.last_seen).getTime()) / (1000 * 60 * 60 * 24));
    const customerTenure = Math.floor((now.getTime() - new Date(c.first_seen).getTime()) / (1000 * 60 * 60 * 24));
    const avgVisitFrequency = customerTenure > 0 ? (c.visit_count / (customerTenure / 30)).toFixed(2) : '0';

    return {
      id: c.customer_id,
      name: c.first_name || c.email || 'Unknown',
      email: c.email,
      phone: c.phone,
      visits: c.visit_count,
      totalSpend: c.total_spend,
      daysSinceLastVisit,
      customerTenureDays: customerTenure,
      avgVisitsPerMonth: avgVisitFrequency,
      avgSpendPerVisit: c.visit_count > 0 ? (c.total_spend / c.visit_count).toFixed(2) : '0',
      source: c.source,
      hasBirthday: !!c.birthday,
    };
  });

  const anthropic = new Anthropic();

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: `You are a churn prediction engine for "${restaurant.name}" (${restaurant.cuisine_type}).

Analyze each customer's visit pattern and predict churn risk. You must return ONLY valid JSON, no other text.

Risk levels based on absence relative to their normal frequency:
- "Critical" (risk 90-100): Gone 3x+ longer than their typical visit interval, or 90+ days absent for any regular
- "High" (risk 70-89): Gone 2-3x longer than typical interval, or 60-90 days for regulars
- "Medium" (risk 40-69): Gone 1.5-2x longer than typical, or 30-60 days for regulars

For each customer, determine:
- riskLevel: "Critical", "High", or "Medium"
- riskScore: 0-100
- revenueAtRisk: Projected annual revenue loss if this customer churns (based on their spend pattern)
- pattern: Brief description of their visit pattern and what changed
- winBackStrategy: Specific, personalized win-back tactic. Reference their spend habits, visit frequency, or source. Example: "This was a $80/visit bi-weekly diner. Send a personal text: 'We miss you at [restaurant]. Your favorite table is waiting — enjoy a complimentary appetizer on us this week.'"
- urgency: "Immediate" (act today), "This Week", or "This Month"
- channelRecommendation: "sms", "email", or "phone" — based on what data is available and urgency`,
    messages: [{
      role: 'user',
      content: `Analyze churn risk for these customers. Return a JSON array where each object has: id, name, riskLevel, riskScore, revenueAtRisk, pattern, winBackStrategy, urgency, channelRecommendation.

${JSON.stringify(customerProfiles, null, 2)}`
    }],
  });

  const textBlock = message.content.find(b => b.type === 'text');
  const raw = textBlock?.text || '[]';

  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const alerts = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    const critical = alerts.filter((a: { riskLevel: string }) => a.riskLevel === 'Critical').length;
    const high = alerts.filter((a: { riskLevel: string }) => a.riskLevel === 'High').length;
    const medium = alerts.filter((a: { riskLevel: string }) => a.riskLevel === 'Medium').length;
    const totalRevenueAtRisk = alerts.reduce((s: number, a: { revenueAtRisk: number }) => s + (a.revenueAtRisk || 0), 0);

    return NextResponse.json({
      alerts,
      summary: { critical, high, medium, totalRevenueAtRisk },
    });
  } catch {
    return NextResponse.json({ alerts: [], summary: { critical: 0, high: 0, medium: 0, totalRevenueAtRisk: 0 } });
  }
}
