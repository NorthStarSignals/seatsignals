import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { question } = await req.json();
  if (!question || typeof question !== 'string') {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id, name, cuisine_type, brand_voice')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const rid = restaurant.restaurant_id;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Fetch all data in parallel for rich context
  const [
    { count: customerCount },
    { count: newCustomers30d },
    { data: reviews },
    { data: allReviews },
    { data: visits },
    { data: recentVisits },
    { data: sequences },
    { data: topCustomers },
    { data: segments },
    { data: activePromos },
    { data: cateringLeads },
    { data: corpAccounts },
  ] = await Promise.all([
    supabase.from('customers').select('*', { count: 'exact', head: true }).eq('restaurant_id', rid),
    supabase.from('customers').select('*', { count: 'exact', head: true }).eq('restaurant_id', rid).gte('first_seen', thirtyDaysAgo.toISOString()),
    supabase.from('reviews').select('rating, text, author, platform, created_at').eq('restaurant_id', rid).order('created_at', { ascending: false }).limit(5),
    supabase.from('reviews').select('rating', { count: 'exact' }).eq('restaurant_id', rid),
    supabase.from('visits').select('spend_amount').eq('restaurant_id', rid),
    supabase.from('visits').select('spend_amount, timestamp').eq('restaurant_id', rid).gte('timestamp', thirtyDaysAgo.toISOString()),
    supabase.from('sequences').select('type, converted, sent_at').eq('restaurant_id', rid),
    supabase.from('customers').select('first_name, total_spend, visit_count, last_seen').eq('restaurant_id', rid).order('total_spend', { ascending: false }).limit(5),
    supabase.from('cortex_customer_segments').select('segment').eq('restaurant_id', rid),
    supabase.from('flash_deals').select('id').eq('restaurant_id', rid).eq('active', true),
    supabase.from('catering_leads').select('sequence_status, converted, order_value').eq('restaurant_id', rid),
    supabase.from('corporate_accounts').select('company_name, total_lifetime_value, churn_risk_flag').eq('restaurant_id', rid),
  ]);

  // Compute summaries
  const totalRevenue = (visits || []).reduce((s, v) => s + (v.spend_amount || 0), 0);
  const recentRevenue = (recentVisits || []).reduce((s, v) => s + (v.spend_amount || 0), 0);
  const reviewCount = allReviews?.length || 0;
  const avgRating = allReviews && allReviews.length > 0
    ? (allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length).toFixed(1)
    : 'N/A';
  const activeSequences = (sequences || []).filter(s => !s.converted).length;
  const recentReviewCount = (reviews || []).filter(r => new Date(r.created_at) >= thirtyDaysAgo).length;

  // Top customers
  const topCustomersList = (topCustomers || []).map(c => ({
    name: c.first_name,
    totalSpend: c.total_spend,
    visits: c.visit_count,
    lastSeen: c.last_seen,
  }));

  // Segment distribution
  const segmentCounts: Record<string, number> = {};
  for (const s of segments || []) {
    segmentCounts[s.segment] = (segmentCounts[s.segment] || 0) + 1;
  }
  const segmentData = Object.entries(segmentCounts).map(([segment, count]) => ({ segment, count }));

  // Recent reviews
  const recentReviews = (reviews || []).map(r => ({
    rating: r.rating,
    text: r.text?.substring(0, 120),
    author: r.author,
    platform: r.platform,
    date: r.created_at,
  }));

  // Catering summary
  const cateringConverted = (cateringLeads || []).filter(l => l.converted).length;
  const cateringTotal = (cateringLeads || []).length;
  const cateringRevenue = (cateringLeads || []).filter(l => l.converted).reduce((s, l) => s + (l.order_value || 0), 0);

  // Corporate summary
  const corpTotal = (corpAccounts || []).length;
  const corpValue = (corpAccounts || []).reduce((s, a) => s + (a.total_lifetime_value || 0), 0);
  const corpAtRisk = (corpAccounts || []).filter(a => a.churn_risk_flag).length;

  const dataContext = {
    restaurant: { name: restaurant.name, cuisine: restaurant.cuisine_type },
    overview: {
      totalCustomers: customerCount || 0,
      totalReviews: reviewCount,
      averageRating: avgRating,
      totalRevenue,
      activeSequences,
    },
    last30Days: {
      newCustomers: newCustomers30d || 0,
      revenue: recentRevenue,
      newReviews: recentReviewCount,
      visits: (recentVisits || []).length,
    },
    topCustomersBySpend: topCustomersList,
    segmentDistribution: segmentData,
    recentReviews,
    activePromotions: (activePromos || []).length,
    catering: {
      totalLeads: cateringTotal,
      converted: cateringConverted,
      revenue: cateringRevenue,
    },
    corporate: {
      totalAccounts: corpTotal,
      lifetimeValue: corpValue,
      atRiskAccounts: corpAtRisk,
    },
    currentDate: now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  };

  const anthropic = new Anthropic();

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: `You are SeatSignals AI, a restaurant analytics assistant. Answer the restaurant owner's question using the provided data context. Be specific with numbers. Keep answers concise (2-4 sentences). If you can't answer from the data, say so honestly. Format numbers nicely (currency, percentages). Don't reference the data structure, just give natural answers.

After your answer, on a new line write "SUGGESTIONS:" followed by exactly 3 follow-up questions the owner might want to ask, each on its own line prefixed with "- ". These should be relevant to the topic they asked about and naturally build on the answer.`,
    messages: [{
      role: 'user',
      content: `Question: ${question}

Restaurant data context:
${JSON.stringify(dataContext, null, 2)}`,
    }],
  });

  const textBlock = message.content.find(b => b.type === 'text');
  const raw = textBlock?.text || '';

  // Parse answer and suggestions
  const parts = raw.split('SUGGESTIONS:');
  const answer = parts[0].trim();
  const suggestionsRaw = parts[1] || '';
  const suggestions = suggestionsRaw
    .split('\n')
    .map(l => l.replace(/^-\s*/, '').trim())
    .filter(l => l.length > 0)
    .slice(0, 3);

  return NextResponse.json({ answer, suggestions });
}
