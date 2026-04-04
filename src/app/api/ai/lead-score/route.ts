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

  // Fetch customers with visit data
  const { data: customers } = await supabase
    .from('customers')
    .select('customer_id, first_name, email, phone, visit_count, total_spend, first_seen, last_seen, birthday, source')
    .eq('restaurant_id', rid)
    .order('total_spend', { ascending: false })
    .limit(50);

  if (!customers || customers.length === 0) {
    return NextResponse.json({ leads: [], summary: 'No customer data available yet. Start capturing customers to generate lead scores.' });
  }

  // Fetch review data for sentiment context
  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating')
    .eq('restaurant_id', rid);

  const avgRating = reviews && reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : 'N/A';

  const now = new Date();
  const customerProfiles = customers.map(c => {
    const daysSinceLastVisit = c.last_seen
      ? Math.floor((now.getTime() - new Date(c.last_seen).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    const avgSpendPerVisit = c.visit_count > 0 ? (c.total_spend / c.visit_count).toFixed(2) : '0';
    const daysBirthdayProximity = c.birthday ? (() => {
      const bday = new Date(c.birthday);
      const thisYear = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
      if (thisYear < now) thisYear.setFullYear(thisYear.getFullYear() + 1);
      return Math.floor((thisYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    })() : null;

    return {
      id: c.customer_id,
      name: c.first_name || c.email || 'Unknown',
      email: c.email,
      phone: c.phone,
      visits: c.visit_count,
      totalSpend: c.total_spend,
      avgSpendPerVisit,
      daysSinceLastVisit,
      daysBirthdayProximity,
      source: c.source,
      firstSeen: c.first_seen,
    };
  });

  const anthropic = new Anthropic();

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: `You are an elite restaurant revenue intelligence engine for "${restaurant.name}" (${restaurant.cuisine_type}). Average review rating: ${avgRating}/5.

You are scoring leads for a restaurant owner who wants to maximize revenue per customer. You must return ONLY valid JSON, no other text.

Scoring criteria (each 0-20 points, max 100):
1. FREQUENCY: Visit regularity (20pts for weekly+, 15 for bi-weekly, 10 for monthly, 5 for quarterly, 0 for less)
2. SPEND: Average spend per visit relative to peers (20pts top quartile, 15 for above avg, 10 avg, 5 below)
3. RECENCY: Days since last visit (20pts <7 days, 15 <14, 10 <30, 5 <60, 0 for 60+)
4. REFERRAL POTENTIAL: Based on visit count + spend pattern — high-value regulars are best referrers
5. BIRTHDAY OPPORTUNITY: 20pts if birthday within 14 days, 15 within 30, 10 within 60, 5 within 90

For each customer, also estimate:
- revenuePotential: Projected 90-day revenue from this customer (USD)
- recommendation: One specific, actionable tactic (e.g., "Send a VIP tasting menu invite for this Friday", "Offer 15% off their next catering order")
- tier: "VIP" (80+), "High Value" (60-79), "Growth" (40-59), "Nurture" (20-39), "At Risk" (<20)`,
    messages: [{
      role: 'user',
      content: `Score these customers and return JSON array. Each object must have: id, name, score, tier, frequencyScore, spendScore, recencyScore, referralScore, birthdayScore, revenuePotential, recommendation.

Customer data:
${JSON.stringify(customerProfiles, null, 2)}`
    }],
  });

  const textBlock = message.content.find(b => b.type === 'text');
  const raw = textBlock?.text || '[]';

  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const leads = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    const vipCount = leads.filter((l: { tier: string }) => l.tier === 'VIP').length;
    const atRiskCount = leads.filter((l: { tier: string }) => l.tier === 'At Risk').length;
    const totalPotential = leads.reduce((s: number, l: { revenuePotential: number }) => s + (l.revenuePotential || 0), 0);

    return NextResponse.json({
      leads,
      summary: {
        totalScored: leads.length,
        vipCount,
        atRiskCount,
        totalRevenuePotential: totalPotential,
      },
    });
  } catch {
    return NextResponse.json({ leads: [], summary: 'AI analysis completed but response parsing failed. Please try again.' });
  }
}
