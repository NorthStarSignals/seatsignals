import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { customer_name, event_type, offer } = await request.json();

  if (!customer_name || !offer) {
    return NextResponse.json(
      { error: 'customer_name and offer are required' },
      { status: 400 }
    );
  }

  try {
    const client = new Anthropic();

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      system:
        'Write a warm, personal birthday/anniversary message from a restaurant to a valued customer. Keep under 160 chars for SMS. Include the offer naturally. Return only the message text, no quotes or extra formatting.',
      messages: [
        {
          role: 'user',
          content: `Write a ${event_type || 'birthday'} message for ${customer_name}. The offer is: ${offer}. Use template variables {first_name}, {birthday_date}, {offer}, and {code} so the restaurant can personalize it.`,
        },
      ],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    const message = textBlock ? textBlock.text.trim() : '';

    return NextResponse.json({ message });
  } catch (error) {
    console.error('AI message generation failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Failed to generate message' },
      { status: 500 }
    );
  }
}
