import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();

  // Look up restaurant
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id, brand_voice')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  // Parse request body
  const { review_id, tone } = await request.json();
  if (!review_id) return NextResponse.json({ error: 'review_id is required' }, { status: 400 });

  // Look up the review (must belong to this restaurant)
  const { data: review } = await supabase
    .from('reviews')
    .select('*')
    .eq('review_id', review_id)
    .eq('restaurant_id', restaurant.restaurant_id)
    .single();

  if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

  // Generate AI response using Anthropic SDK
  const anthropic = new Anthropic();

  const brandVoice = restaurant.brand_voice || 'professional and friendly';
  const toneHint = tone
    ? `The reply should land in a ${tone} tone specifically.`
    : '';

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    system: `You are a restaurant reputation manager. Write a professional response to the following customer review. Match the restaurant's brand voice: ${brandVoice}. ${toneHint} Keep it under 100 words. Be genuine, not generic. If the review is negative, acknowledge concerns and offer to make it right. Never be defensive. Sign off naturally without a formal signature block.`,
    messages: [
      {
        role: 'user',
        content: `Review by ${review.author} (${review.rating}/5 stars): ${review.text}`,
      },
    ],
  });

  // Extract text from response
  const responseText =
    message.content[0].type === 'text' ? message.content[0].text : '';

  // Update review with generated response
  await supabase
    .from('reviews')
    .update({
      response_text: responseText,
      response_status: 'pending_approval',
    })
    .eq('review_id', review_id)
    .eq('restaurant_id', restaurant.restaurant_id);

  return NextResponse.json({ response_text: responseText, review_id });
}
