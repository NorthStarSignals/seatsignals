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
    .select('restaurant_id, name, cuisine_type, brand_voice')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const rid = restaurant.restaurant_id;

  // Gather internal metrics for competitive positioning
  const [
    { count: totalCustomers },
    { data: reviews },
    { data: corpAccounts },
  ] = await Promise.all([
    supabase.from('customers').select('*', { count: 'exact', head: true }).eq('restaurant_id', rid),
    supabase.from('reviews').select('rating, platform').eq('restaurant_id', rid),
    supabase.from('corporate_accounts').select('company_name').eq('restaurant_id', rid),
  ]);

  const avgRating = reviews && reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : 'N/A';

  const anthropic = new Anthropic();

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: `You are a competitive intelligence analyst specializing in the restaurant industry. You provide sophisticated market analysis that would normally cost $10,000+ from a consulting firm.

Return ONLY valid JSON, no other text.

Based on the restaurant's cuisine type and profile, analyze the competitive landscape. Use your deep knowledge of restaurant industry trends, typical competitive dynamics for this cuisine type, and common market positioning strategies.

Return this JSON structure:
{
  "marketPosition": {
    "summary": "One paragraph positioning analysis",
    "strengths": ["3-4 likely competitive strengths based on their data"],
    "vulnerabilities": ["2-3 areas where competitors likely have an edge"]
  },
  "competitorProfiles": [
    {
      "type": "Direct competitor archetype (e.g., 'Established Fine Dining Italian')",
      "threatLevel": "high" | "medium" | "low",
      "likelyStrengths": ["What they do well"],
      "likelyWeaknesses": ["Where they fall short"],
      "howToBeat": "Specific strategy to win against this type"
    }
  ],
  "differentiationOpportunities": [
    {
      "opportunity": "Specific differentiation play",
      "description": "How to execute",
      "competitiveAdvantage": "Why this creates a moat",
      "investmentLevel": "low" | "medium" | "high"
    }
  ],
  "marketTrends": [
    {
      "trend": "Industry trend relevant to their cuisine",
      "impact": "How it affects their business",
      "actionItem": "What to do about it"
    }
  ],
  "pricingInsights": {
    "strategy": "Recommended pricing positioning",
    "tactics": ["Specific pricing tactics to implement"]
  },
  "digitalPresence": {
    "recommendations": ["Specific digital/online strategies to outcompete"],
    "quickWins": ["Things they can do this week"]
  }
}`,
    messages: [{
      role: 'user',
      content: `Analyze the competitive landscape for this restaurant:

Name: ${restaurant.name}
Cuisine: ${restaurant.cuisine_type}
Customer base: ${totalCustomers || 0} captured customers
Average review rating: ${avgRating}/5 (${reviews?.length || 0} reviews)
Corporate accounts: ${(corpAccounts || []).length}
Brand voice: ${restaurant.brand_voice || 'not defined'}

Provide a thorough competitive analysis as if you were a $500/hour restaurant consultant.`
    }],
  });

  const textBlock = message.content.find(b => b.type === 'text');
  const raw = textBlock?.text || '{}';

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    return NextResponse.json(analysis);
  } catch {
    return NextResponse.json({ marketPosition: { summary: 'Analysis failed. Please try again.' }, competitorProfiles: [], differentiationOpportunities: [], marketTrends: [] });
  }
}
