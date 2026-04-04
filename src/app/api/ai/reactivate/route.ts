import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id, name, cuisine_type, brand_voice')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const rid = restaurant.restaurant_id;
  const body = await request.json().catch(() => ({}));
  const targetCustomerId = body.customer_id;

  // Get churned customers (60+ days absent)
  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  let query = supabase
    .from('customers')
    .select('customer_id, first_name, email, phone, visit_count, total_spend, first_seen, last_seen, birthday, source')
    .eq('restaurant_id', rid)
    .lt('last_seen', sixtyDaysAgo.toISOString())
    .gt('visit_count', 1)
    .order('total_spend', { ascending: false });

  if (targetCustomerId) {
    query = query.eq('customer_id', targetCustomerId);
  } else {
    query = query.limit(20);
  }

  const { data: customers } = await query;

  if (!customers || customers.length === 0) {
    return NextResponse.json({ campaigns: [], summary: 'No customers matching reactivation criteria.' });
  }

  const customerData = customers.map(c => ({
    id: c.customer_id,
    name: c.first_name || 'Valued Guest',
    email: c.email,
    phone: c.phone,
    visits: c.visit_count,
    totalSpend: c.total_spend,
    avgSpend: c.visit_count > 0 ? (c.total_spend / c.visit_count).toFixed(2) : '0',
    daysAbsent: Math.floor((now.getTime() - new Date(c.last_seen).getTime()) / (1000 * 60 * 60 * 24)),
    hasBirthday: !!c.birthday,
    source: c.source,
  }));

  const anthropic = new Anthropic();

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: `You are a win-back campaign specialist for "${restaurant.name}" (${restaurant.cuisine_type}). Brand voice: ${restaurant.brand_voice || 'warm and personal'}.

Generate personalized multi-channel reactivation campaigns. Return ONLY valid JSON.

For each customer, create:
1. An email message (subject + body, warm and personal, reference their history)
2. An SMS message (under 160 chars, compelling, includes an offer)
3. An alternative A/B variant for SMS (different angle/offer)
4. Recommended offer (discount, free item, VIP experience)
5. Best send time recommendation
6. Expected conversion probability (percentage)

Guidelines:
- Reference their visit history naturally ("We noticed it's been a while since your last visit")
- Include a specific offer with a deadline to create urgency
- SMS should feel personal, not corporate
- Email should tell a brief story or share what's new
- Higher-value customers get more premium offers (VIP tastings, chef's table)
- Lower-value customers get straightforward discounts

Return JSON array with: id, name, email (subject, body), sms (primary, variant), offer, sendTime, conversionProbability, estimatedRevenue`,
    messages: [{
      role: 'user',
      content: `Create reactivation campaigns for these lapsed customers:

${JSON.stringify(customerData, null, 2)}`
    }],
  });

  const textBlock = message.content.find(b => b.type === 'text');
  const raw = textBlock?.text || '[]';

  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const campaigns = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    const totalEstimatedRevenue = campaigns.reduce((s: number, c: { estimatedRevenue: number }) => s + (c.estimatedRevenue || 0), 0);
    const avgConversion = campaigns.length > 0
      ? Math.round(campaigns.reduce((s: number, c: { conversionProbability: number }) => s + (c.conversionProbability || 0), 0) / campaigns.length)
      : 0;

    return NextResponse.json({
      campaigns,
      summary: {
        totalCampaigns: campaigns.length,
        totalEstimatedRevenue,
        avgConversionRate: avgConversion,
      },
    });
  } catch {
    return NextResponse.json({ campaigns: [], summary: { totalCampaigns: 0, totalEstimatedRevenue: 0, avgConversionRate: 0 } });
  }
}
