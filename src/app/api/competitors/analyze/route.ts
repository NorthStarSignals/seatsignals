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

  // Fetch restaurant's own review data
  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating, platform')
    .eq('restaurant_id', rid);

  const allReviews = reviews || [];
  const googleReviews = allReviews.filter(r => r.platform === 'google');
  const yelpReviews = allReviews.filter(r => r.platform === 'yelp');

  const avgRating = allReviews.length > 0
    ? (allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length).toFixed(1)
    : 'N/A';
  const avgGoogle = googleReviews.length > 0
    ? (googleReviews.reduce((s, r) => s + r.rating, 0) / googleReviews.length).toFixed(1)
    : 'N/A';
  const avgYelp = yelpReviews.length > 0
    ? (yelpReviews.reduce((s, r) => s + r.rating, 0) / yelpReviews.length).toFixed(1)
    : 'N/A';

  // Fetch all competitors
  const { data: competitors } = await supabase
    .from('competitors')
    .select('*')
    .eq('restaurant_id', rid);

  const competitorsList = (competitors || []).map(c => ({
    name: c.name,
    cuisine_type: c.cuisine_type,
    google_rating: c.google_rating,
    google_review_count: c.google_review_count,
    yelp_rating: c.yelp_rating,
    yelp_review_count: c.yelp_review_count,
    price_level: c.price_level,
  }));

  const anthropic = new Anthropic();

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: 'You are a restaurant competitive analyst. Given the restaurant\'s data and its competitors, provide: 1) Competitive positioning summary 2) Strengths vs competitors 3) Areas where competitors outperform 4) 5 specific actionable recommendations. Be data-driven and specific.',
    messages: [
      {
        role: 'user',
        content: `Analyze the competitive landscape for this restaurant:

**Your Restaurant:**
- Name: ${restaurant.name}
- Cuisine: ${restaurant.cuisine_type || 'Not specified'}
- Overall Avg Rating: ${avgRating} (${allReviews.length} total reviews)
- Google Avg Rating: ${avgGoogle} (${googleReviews.length} reviews)
- Yelp Avg Rating: ${avgYelp} (${yelpReviews.length} reviews)

**Competitors:**
${competitorsList.length > 0
  ? competitorsList.map((c, i) => `${i + 1}. ${c.name} - Cuisine: ${c.cuisine_type || 'N/A'}, Google: ${c.google_rating || 'N/A'} (${c.google_review_count || 0} reviews), Yelp: ${c.yelp_rating || 'N/A'} (${c.yelp_review_count || 0} reviews), Price: ${c.price_level || 'N/A'}`).join('\n')
  : 'No competitors added yet. Provide general competitive advice for this cuisine type.'}

Provide a thorough competitive analysis with actionable insights.`,
      },
    ],
  });

  const analysis = message.content[0].type === 'text' ? message.content[0].text : '';

  return NextResponse.json({ analysis });
}
