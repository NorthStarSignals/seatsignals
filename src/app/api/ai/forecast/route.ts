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

  // Gather revenue data from all streams
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

  // Catering orders
  const { data: cateringOrders } = await supabase
    .from('catering_orders')
    .select('amount, date, recurring, corporate_account_id')
    .eq('restaurant_id', rid)
    .gte('date', threeMonthsAgo.toISOString())
    .order('date');

  // Dead hours data
  const { data: deadHoursData } = await supabase
    .from('dead_hours')
    .select('revenue, seats_filled, triggered_at')
    .eq('restaurant_id', rid)
    .gte('triggered_at', threeMonthsAgo.toISOString());

  // Birthday events
  const { data: birthdayEvents } = await supabase
    .from('birthday_events')
    .select('check_total, offer_sent_at, redeemed')
    .eq('restaurant_id', rid)
    .gte('offer_sent_at', threeMonthsAgo.toISOString());

  // Retention sequences
  const { data: sequences } = await supabase
    .from('sequences')
    .select('type, converted, sent_at')
    .eq('restaurant_id', rid)
    .gte('sent_at', threeMonthsAgo.toISOString());

  // Corporate accounts
  const { data: corpAccounts } = await supabase
    .from('corporate_accounts')
    .select('company_name, total_lifetime_value')
    .eq('restaurant_id', rid);

  // Customer stats
  const { count: totalCustomers } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', rid);

  const { count: newCustomersThisMonth } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', rid)
    .gte('first_seen', startOfMonth.toISOString());

  // Build monthly aggregates
  const monthlyData: Record<string, { catering: number; corporate: number; deadHours: number; birthdays: number; retention: number }> = {};
  for (let i = 0; i < 3; i++) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[key] = { catering: 0, corporate: 0, deadHours: 0, birthdays: 0, retention: 0 };
  }

  for (const o of cateringOrders || []) {
    const key = o.date.substring(0, 7);
    if (monthlyData[key]) {
      if (o.corporate_account_id) monthlyData[key].corporate += o.amount || 0;
      else monthlyData[key].catering += o.amount || 0;
    }
  }

  for (const d of deadHoursData || []) {
    const key = d.triggered_at.substring(0, 7);
    if (monthlyData[key]) monthlyData[key].deadHours += d.revenue || 0;
  }

  for (const b of birthdayEvents || []) {
    if (b.redeemed && b.offer_sent_at) {
      const key = b.offer_sent_at.substring(0, 7);
      if (monthlyData[key]) monthlyData[key].birthdays += b.check_total || 0;
    }
  }

  for (const s of sequences || []) {
    if (s.converted && s.sent_at) {
      const key = s.sent_at.substring(0, 7);
      if (monthlyData[key]) monthlyData[key].retention += 45;
    }
  }

  const corpMonthlyValue = (corpAccounts || []).reduce((s, a) => s + (a.total_lifetime_value || 0), 0);

  const anthropic = new Anthropic();

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: `You are a revenue forecasting engine for "${restaurant.name}" (${restaurant.cuisine_type}).

Analyze historical revenue streams and provide a 90-day forecast. Return ONLY valid JSON, no other text.

Consider:
- Seasonal trends for ${restaurant.cuisine_type} restaurants
- Day-of-week patterns (weekends typically stronger)
- Upcoming holidays and events in the next 90 days
- Growth trajectory from customer acquisition rate
- Corporate account pipeline value

Return a JSON object with this structure:
{
  "forecast": {
    "month1": { "label": "Month Name", "dineIn": number, "catering": number, "corporate": number, "deadHours": number, "birthdays": number, "total": number, "confidence": "high"|"medium"|"low" },
    "month2": { same structure },
    "month3": { same structure }
  },
  "totalForecast": number,
  "growthRate": number (percentage),
  "confidenceNote": "Brief explanation of confidence level",
  "keyDrivers": ["Top 3 factors driving the forecast"],
  "risks": ["Top 3 downside risks"],
  "whatIf": [
    { "scenario": "Add Sunday brunch service", "impact": "+$X,XXX/month", "confidence": "medium", "reasoning": "brief" },
    { "scenario": "Launch happy hour specials (3-5pm)", "impact": "+$X,XXX/month", "confidence": "medium", "reasoning": "brief" },
    { "scenario": "Add 2 more corporate accounts", "impact": "+$X,XXX/month", "confidence": "high", "reasoning": "brief" }
  ]
}`,
    messages: [{
      role: 'user',
      content: `Forecast revenue for the next 90 days based on this data:

Restaurant: ${restaurant.name} (${restaurant.cuisine_type})
Total customers: ${totalCustomers || 0}
New customers this month: ${newCustomersThisMonth || 0}
Corporate accounts monthly value: $${corpMonthlyValue}

Monthly revenue history (last 3 months):
${JSON.stringify(monthlyData, null, 2)}

Current month: ${now.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`
    }],
  });

  const textBlock = message.content.find(b => b.type === 'text');
  const raw = textBlock?.text || '{}';

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const forecast = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    return NextResponse.json(forecast);
  } catch {
    return NextResponse.json({ forecast: {}, totalForecast: 0, whatIf: [] });
  }
}
