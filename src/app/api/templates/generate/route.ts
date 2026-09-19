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
    .select('restaurant_id, brand_voice, name')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });

  const { category, channel, brand_voice, context } = await request.json();

  if (!category || !channel) {
    return NextResponse.json({ error: 'category and channel are required' }, { status: 400 });
  }

  const voice = brand_voice || restaurant.brand_voice || 'professional and friendly';

  const anthropic = new Anthropic();

  const systemPrompt = `Generate a ${channel} message template for a restaurant. Category: ${category}. Brand voice: ${voice}. Include variable placeholders like {first_name}, {restaurant_name}, {offer_code}, {visit_count}, {birthday_date}, etc. For SMS keep under 160 chars. For email, include subject line and body. ${context ? `Additional context: ${context}` : ''}

Respond in valid JSON only, with this structure:
{
  "subject": "subject line here (email only, null for sms)",
  "body": "message body here",
  "variables": ["first_name", "restaurant_name"]
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Generate a ${channel} ${category} template for ${restaurant.name || 'the restaurant'}.`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    const template = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ template });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'AI generation failed';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
