import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { promotion_type, discount, time_window, day } = body;

  if (!promotion_type) {
    return NextResponse.json({ error: 'Missing promotion_type' }, { status: 400 });
  }

  const client = new Anthropic();

  const promoLabel: Record<string, string> = {
    percentage_off: `${discount || '20'}% off`,
    bogo: 'Buy One Get One Free',
    free_item: `Free item${discount ? `: ${discount}` : ''}`,
    happy_hour: 'Happy Hour specials',
    flash_deal: `Flash deal: ${discount || 'special pricing'}`,
  };

  const promoDescription = promoLabel[promotion_type] || promotion_type;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 256,
    system:
      'You are a restaurant marketing copywriter. Write a short, compelling promotional SMS message (under 160 chars) for a restaurant dead hours promotion. Be casual, fun, and include a clear call-to-action.',
    messages: [
      {
        role: 'user',
        content: `Write an SMS promo for: ${promoDescription} on ${day || 'weekdays'} during ${time_window || 'afternoon'}. Include a placeholder {code} for the redemption code and {first_name} for personalization. Keep it under 160 characters.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  const message = textBlock ? textBlock.text.trim() : '';

  return NextResponse.json({ message });
}
