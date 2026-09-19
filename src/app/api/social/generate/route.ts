import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id, name, cuisine_type')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await req.json();
  const { purpose, platform } = body;

  if (!purpose) return NextResponse.json({ error: 'Purpose/topic is required' }, { status: 400 });
  if (!platform) return NextResponse.json({ error: 'Platform is required' }, { status: 400 });

  const validPlatforms = ['instagram', 'facebook', 'twitter', 'tiktok'];
  if (!validPlatforms.includes(platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  }

  const platformGuidelines: Record<string, string> = {
    instagram: 'Write for Instagram. Use a visual, aspirational tone. Include a compelling caption that tells a story. Suggest 5-8 relevant hashtags. Keep it under 300 characters for the main caption (before hashtags). Mention photo/visual suggestions in brackets.',
    facebook: 'Write for Facebook. Use a warm, community-oriented tone. Can be longer and more detailed. Include a clear call-to-action (visit, share, comment). Suggest 3-5 hashtags. Engage the audience with questions or invitations.',
    twitter: 'Write for Twitter/X. Keep it punchy and under 280 characters total (including hashtags). Use a witty, direct tone. Suggest 2-3 hashtags max. Make it shareable and conversation-starting.',
    tiktok: 'Write for TikTok. Use a trendy, energetic, Gen-Z friendly tone. Describe what the video content should show in brackets. Include trending-style hooks like "POV:", "Wait for it...", "Things that just hit different:". Suggest 4-6 hashtags including #FYP and #FoodTok.',
  };

  const anthropic = new Anthropic();

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: `You are a social media manager for a restaurant called "${restaurant.name}" (cuisine: ${restaurant.cuisine_type || 'various'}). Generate engaging social media content that drives engagement and foot traffic. Always stay on-brand: professional but approachable, food-focused, community-minded.`,
    messages: [
      {
        role: 'user',
        content: `Generate a social media post for the following:

**Topic/Purpose:** ${purpose}
**Platform:** ${platform}

${platformGuidelines[platform]}

Respond in this exact JSON format:
{
  "content": "The post content text (without hashtags)",
  "hashtags": ["#hashtag1", "#hashtag2", ...],
  "image_suggestion": "Brief description of what image/video would work well"
}

Only return the JSON, no other text.`,
      },
    ],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

  try {
    // Extract JSON from the response (handle potential markdown wrapping)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }
    const parsed = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      content: parsed.content || '',
      hashtags: parsed.hashtags || [],
      image_suggestion: parsed.image_suggestion || '',
    });
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
  }
}
