import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id, name')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const rid = restaurant.restaurant_id;
  const now = new Date();
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  // Find lapsed customers (no visit in 60+ days with at least 3 visits)
  const { data: lapsed } = await supabase
    .from('customers')
    .select('customer_id, first_name, email, phone, visit_count, total_spend, last_visit, tags')
    .eq('restaurant_id', rid)
    .lt('last_visit', sixtyDaysAgo.toISOString())
    .gte('visit_count', 3)
    .order('total_spend', { ascending: false });

  const candidates = (lapsed || []).map(c => {
    const daysSince = Math.floor((now.getTime() - new Date(c.last_visit).getTime()) / (1000 * 60 * 60 * 24));
    const avgSpend = c.visit_count > 0 ? Math.round((c.total_spend || 0) / c.visit_count) : 0;
    return {
      ...c,
      days_since_last_visit: daysSince,
      avg_spend: avgSpend,
      estimated_lost_revenue: avgSpend * Math.floor(daysSince / 14), // est. visits missed
      priority: daysSince <= 90 ? 'high' : daysSince <= 120 ? 'medium' : 'low',
    };
  });

  const stats = {
    total_lapsed: candidates.length,
    high_priority: candidates.filter(c => c.priority === 'high').length,
    estimated_lost_revenue: candidates.reduce((s, c) => s + c.estimated_lost_revenue, 0),
    avg_lifetime_value: candidates.length > 0
      ? Math.round(candidates.reduce((s, c) => s + (c.total_spend || 0), 0) / candidates.length)
      : 0,
  };

  return NextResponse.json({ candidates, stats });
}

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id, name, cuisine_type')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();
  const { customer_name, visit_count, avg_spend, days_since, tone } = body;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `Write a short, warm win-back message (SMS-length, under 160 chars) for a restaurant called "${restaurant.name}" (${restaurant.cuisine_type || 'restaurant'}).

Customer: ${customer_name}
Previous visits: ${visit_count}
Average spend: $${avg_spend}
Days since last visit: ${days_since}
Tone: ${tone || 'friendly'}

Include a compelling reason to return (like a special offer). Be personal and genuine. Just the message text, no quotes.`,
        },
      ],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    const message = textBlock ? textBlock.text.trim() : '';

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Win-back message generation failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Failed to generate message' }, { status: 500 });
  }
}
