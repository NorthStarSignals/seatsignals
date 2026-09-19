import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

function calculateBaseScore(lead: {
  company_size: number;
  contact_email?: string;
  contact_phone?: string;
  company_name: string;
  previousOrderCount: number;
}): number {
  let score = 0;

  // Company size scoring
  if (lead.company_size >= 200) score += 50;
  else if (lead.company_size >= 50) score += 40;
  else if (lead.company_size >= 10) score += 25;
  else score += 10;

  // Contact info
  if (lead.contact_email) score += 10;
  if (lead.contact_phone) score += 10;

  // Industry match - food/hospitality keywords
  const foodKeywords = ['food', 'restaurant', 'hospitality', 'catering', 'dining', 'cafe', 'kitchen', 'culinary', 'bakery', 'bar', 'grill'];
  const nameLower = lead.company_name.toLowerCase();
  if (foodKeywords.some(kw => nameLower.includes(kw))) score += 15;

  // Previous orders (5pts each, max 25)
  score += Math.min(lead.previousOrderCount * 5, 25);

  // Normalize to 0-100
  return Math.min(score, 100);
}

function getPotentialLabel(score: number): string {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const { lead_id } = body;

  // Fetch leads to score
  let query = supabase
    .from('catering_leads')
    .select('*')
    .eq('restaurant_id', restaurant.restaurant_id);

  if (lead_id) {
    query = query.eq('lead_id', lead_id);
  }

  const { data: leads, error: leadsError } = await query;
  if (leadsError || !leads) {
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }

  // Get all catering orders for this restaurant to count per-company orders
  const { data: orders } = await supabase
    .from('catering_orders')
    .select('lead_id')
    .eq('restaurant_id', restaurant.restaurant_id);

  const orderCountByLead: Record<string, number> = {};
  for (const order of orders || []) {
    if (order.lead_id) {
      orderCountByLead[order.lead_id] = (orderCountByLead[order.lead_id] || 0) + 1;
    }
  }

  const scores: Array<{ lead_id: string; score: number; summary: string }> = [];

  for (const lead of leads) {
    const score = calculateBaseScore({
      company_size: lead.company_size || 0,
      contact_email: lead.contact_email,
      contact_phone: lead.contact_phone,
      company_name: lead.company_name,
      previousOrderCount: orderCountByLead[lead.lead_id] || 0,
    });

    const potential = getPotentialLabel(score);

    // Generate AI summary
    let summary = `Score ${score}/100. ${lead.company_name} with ${lead.company_size || 'unknown'} employees shows ${potential} potential for recurring catering.`;

    try {
      const anthropic = new Anthropic();
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: `You are a catering sales assistant. Generate a one-sentence qualification summary for this lead.
Company: ${lead.company_name}
Size: ${lead.company_size || 'unknown'} employees
Email: ${lead.contact_email || 'none'}
Contact: ${lead.contact_name || 'unknown'}
Distance: ${lead.distance_miles || 'unknown'} miles
Previous orders: ${orderCountByLead[lead.lead_id] || 0}
Lead score: ${score}/100 (${potential} potential)
Status: ${lead.sequence_status}

Respond with ONLY a single sentence summary starting with "Score ${score}/100." that qualifies this lead for catering outreach.`,
          },
        ],
      });

      const textBlock = message.content.find((b: { type: string }) => b.type === 'text');
      if (textBlock && 'text' in textBlock) {
        summary = textBlock.text;
      }
    } catch {
      // Fall back to computed summary if AI fails
    }

    // Store score in lead_value and summary in notes
    await supabase
      .from('catering_leads')
      .update({
        order_value: score,
        notes: summary,
      })
      .eq('lead_id', lead.lead_id);

    scores.push({ lead_id: lead.lead_id, score, summary });
  }

  return NextResponse.json({ scores });
}
