import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

/* ------------------------------------------------------------------ */
/*  Auth helper                                                        */
/* ------------------------------------------------------------------ */

async function getRestaurant(supabase: ReturnType<typeof createServerSupabase>, userId: string) {
  const { data } = await supabase
    .from('restaurants')
    .select('restaurant_id, name, cuisine_type, brand_voice')
    .eq('clerk_user_id', userId)
    .single();
  return data;
}

/* ------------------------------------------------------------------ */
/*  POST – generate email content with AI                              */
/* ------------------------------------------------------------------ */

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();
  const { prompt } = body;

  if (!prompt) {
    return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
  }

  const anthropic = new Anthropic();

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: `You are an expert email marketing copywriter for "${restaurant.name}" (${restaurant.cuisine_type || 'restaurant'}). Brand voice: ${restaurant.brand_voice || 'warm, inviting, and confident'}.

Generate a marketing email with a compelling subject line and HTML body. Return ONLY valid JSON with two fields: "subject" (string) and "body_html" (string).

HTML guidelines:
- Use inline styles only (no <style> tags or classes)
- Mobile-responsive: use max-width:600px on the container, width:100% on images
- Brand colors: primary red #E11D48, dark background #09090B, card background #1C1C21, border #27272A
- Use a clean, modern layout with clear hierarchy
- Include a prominent call-to-action button styled with background-color:#E11D48, color:white, padding:14px 28px, border-radius:8px, text-decoration:none, display:inline-block, font-weight:bold
- Use font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
- Keep the email concise and scannable
- Include a preheader text in a hidden div
- Add an unsubscribe placeholder link at the bottom`,
    messages: [
      {
        role: 'user',
        content: `Generate a restaurant marketing email for this purpose: ${prompt}`,
      },
    ],
  });

  const textBlock = message.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  );

  if (!textBlock) {
    return NextResponse.json({ error: 'No content generated' }, { status: 500 });
  }

  // Parse JSON from the response
  const raw = textBlock.text;
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json({ error: 'Failed to parse generated content' }, { status: 500 });
  }

  const parsed = JSON.parse(jsonMatch[0]) as { subject: string; body_html: string };

  return NextResponse.json({
    subject: parsed.subject,
    body_html: parsed.body_html,
  });
}
