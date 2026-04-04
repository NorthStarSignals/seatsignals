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
  const campaignType = body.type || 'all'; // 'social', 'email', 'sms', or 'all'

  // Get context for content generation
  const [
    { count: totalCustomers },
    { data: reviews },
    { data: recentOrders },
  ] = await Promise.all([
    supabase.from('customers').select('*', { count: 'exact', head: true }).eq('restaurant_id', rid),
    supabase.from('reviews').select('rating, text').eq('restaurant_id', rid).gte('rating', 4).order('created_at', { ascending: false }).limit(5),
    supabase.from('catering_orders').select('amount, date').eq('restaurant_id', rid).order('date', { ascending: false }).limit(5),
  ]);

  const positiveQuotes = (reviews || []).map(r => r.text?.substring(0, 80)).filter(Boolean);
  const now = new Date();
  const currentMonth = now.toLocaleString('en-US', { month: 'long' });
  const currentSeason = (() => {
    const m = now.getMonth();
    if (m >= 2 && m <= 4) return 'Spring';
    if (m >= 5 && m <= 7) return 'Summer';
    if (m >= 8 && m <= 10) return 'Fall';
    return 'Winter';
  })();

  const anthropic = new Anthropic();

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: `You are an elite restaurant marketing copywriter for "${restaurant.name}" (${restaurant.cuisine_type}). Brand voice: ${restaurant.brand_voice || 'warm, inviting, and confident'}.

Generate marketing content that drives reservations and orders. Return ONLY valid JSON.

Guidelines:
- Social posts should be scroll-stopping and authentic (not corporate)
- Email campaigns should have compelling subject lines (aim for 40%+ open rate)
- SMS should be urgent and personal (under 160 chars)
- Use seasonal themes, current events, and food trends
- Include hashtag suggestions for social
- Each piece should have a clear call-to-action
- Generate multiple variants so the owner can pick their favorite

Return this JSON structure:
{
  "socialMedia": [
    {
      "platform": "instagram" | "facebook" | "tiktok",
      "type": "post" | "story" | "reel_caption",
      "content": "The post copy",
      "hashtags": ["relevant", "hashtags"],
      "bestTimeToPost": "Day and time",
      "hook": "Why this will perform well"
    }
  ],
  "emailCampaigns": [
    {
      "name": "Campaign name",
      "subject": "Email subject line",
      "previewText": "Preview text (50 chars)",
      "body": "Full email body (HTML-friendly, with sections)",
      "cta": "Call to action button text",
      "audience": "Who to send this to",
      "sendTime": "Recommended send time"
    }
  ],
  "smsCampaigns": [
    {
      "name": "Campaign name",
      "message": "SMS text (under 160 chars)",
      "variant": "A/B test variant",
      "audience": "Target segment",
      "expectedResponse": "Expected conversion"
    }
  ],
  "contentCalendar": [
    {
      "day": "Day of week",
      "theme": "Content theme",
      "platform": "Where to post",
      "idea": "Brief content idea"
    }
  ]
}`,
    messages: [{
      role: 'user',
      content: `Generate a complete marketing content package for ${currentMonth} (${currentSeason}).

Restaurant: ${restaurant.name} (${restaurant.cuisine_type})
Customer base: ${totalCustomers || 0}
Campaign type requested: ${campaignType}

Positive customer quotes to potentially reference:
${positiveQuotes.join('\n') || 'None yet'}

Recent catering activity: ${(recentOrders || []).length} orders recently

Generate compelling, on-brand content that will drive traffic and revenue.`
    }],
  });

  const textBlock = message.content.find(b => b.type === 'text');
  const raw = textBlock?.text || '{}';

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const content = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    return NextResponse.json(content);
  } catch {
    return NextResponse.json({ socialMedia: [], emailCampaigns: [], smsCampaigns: [], contentCalendar: [] });
  }
}
