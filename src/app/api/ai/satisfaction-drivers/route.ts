import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

interface ReviewRow {
  rating: number;
  text: string | null;
  author: string | null;
  created_at: string;
}

interface Driver {
  factor: string;
  impact_score: number;
  sentiment: 'positive' | 'negative' | 'mixed';
  mention_count: number;
  example_quotes: string[];
  trend: 'up' | 'down' | 'stable';
}

const FACTOR_KEYWORDS: Record<string, string[]> = {
  'Food Quality': ['food', 'dish', 'meal', 'taste', 'flavor', 'fresh', 'delicious', 'bland', 'cold', 'overcooked', 'undercooked', 'menu', 'ingredient', 'cook', 'chef'],
  'Service': ['service', 'server', 'waiter', 'waitress', 'staff', 'attentive', 'friendly', 'rude', 'slow service', 'helpful', 'polite', 'manager', 'hostess', 'host'],
  'Ambiance': ['ambiance', 'atmosphere', 'decor', 'music', 'lighting', 'vibe', 'cozy', 'noisy', 'loud', 'clean', 'dirty', 'beautiful', 'romantic', 'interior'],
  'Wait Time': ['wait', 'waiting', 'slow', 'fast', 'quick', 'long time', 'minutes', 'reservation', 'seated', 'prompt', 'delay', 'rushed'],
  'Value / Price': ['price', 'expensive', 'cheap', 'value', 'worth', 'overpriced', 'affordable', 'cost', 'bill', 'tip', 'money', 'reasonable', 'pricey'],
  'Portions': ['portion', 'size', 'small', 'large', 'generous', 'tiny', 'huge', 'enough', 'filling', 'amount', 'quantity'],
  'Cleanliness': ['clean', 'dirty', 'hygiene', 'sanitary', 'spotless', 'filthy', 'restroom', 'bathroom', 'tidy', 'mess'],
  'Location': ['location', 'parking', 'accessible', 'convenient', 'neighborhood', 'area', 'drive', 'downtown', 'patio', 'outdoor'],
};

const POSITIVE_WORDS = ['great', 'good', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'best', 'perfect', 'delicious', 'friendly', 'fresh', 'outstanding', 'recommend', 'awesome', 'enjoyed', 'pleasant', 'beautiful', 'cozy', 'attentive'];
const NEGATIVE_WORDS = ['bad', 'terrible', 'awful', 'worst', 'horrible', 'disgusting', 'rude', 'cold', 'slow', 'dirty', 'overpriced', 'bland', 'stale', 'disappointed', 'never', 'poor', 'mediocre', 'gross', 'uncomfortable', 'noisy'];

function analyzeSentimentForFactor(texts: string[]): 'positive' | 'negative' | 'mixed' {
  let pos = 0;
  let neg = 0;
  for (const t of texts) {
    const lower = t.toLowerCase();
    for (const w of POSITIVE_WORDS) { if (lower.includes(w)) pos++; }
    for (const w of NEGATIVE_WORDS) { if (lower.includes(w)) neg++; }
  }
  if (pos > neg * 2) return 'positive';
  if (neg > pos * 2) return 'negative';
  if (pos === 0 && neg === 0) return 'positive';
  return 'mixed';
}

function getMockDrivers() {
  const drivers: Driver[] = [
    { factor: 'Food Quality', impact_score: 9, sentiment: 'positive', mention_count: 42, example_quotes: ['The pasta was absolutely delicious!', 'Best steak I have had in years.', 'Fresh ingredients really make a difference.'], trend: 'up' },
    { factor: 'Service', impact_score: 8, sentiment: 'positive', mention_count: 38, example_quotes: ['Our waiter was incredibly attentive.', 'Staff made us feel welcome.', 'Great service from start to finish.'], trend: 'stable' },
    { factor: 'Wait Time', impact_score: 6, sentiment: 'negative', mention_count: 22, example_quotes: ['Had to wait 30 minutes for a table.', 'Food took forever to arrive.', 'Long wait even with a reservation.'], trend: 'down' },
    { factor: 'Ambiance', impact_score: 7, sentiment: 'positive', mention_count: 28, example_quotes: ['Beautiful interior and great vibe.', 'Perfect atmosphere for date night.', 'Love the cozy lighting.'], trend: 'up' },
    { factor: 'Value / Price', impact_score: 5, sentiment: 'mixed', mention_count: 18, example_quotes: ['A bit pricey but worth it.', 'Great value for the quality.', 'Portions could be bigger for the price.'], trend: 'stable' },
    { factor: 'Portions', impact_score: 4, sentiment: 'negative', mention_count: 12, example_quotes: ['Portions were a bit small.', 'Could have been more generous.'], trend: 'down' },
    { factor: 'Cleanliness', impact_score: 7, sentiment: 'positive', mention_count: 15, example_quotes: ['Restaurant was spotless.', 'Very clean and well maintained.'], trend: 'stable' },
    { factor: 'Location', impact_score: 3, sentiment: 'positive', mention_count: 8, example_quotes: ['Great location downtown.', 'Easy parking nearby.'], trend: 'stable' },
  ];
  return {
    drivers: drivers.sort((a, b) => b.impact_score - a.impact_score),
    overall_score: 8.1,
    total_reviews: 0,
    recommendations: [
      'Address wait times during peak hours by optimizing table turnover or accepting timed reservations.',
      'Highlight your food quality and ambiance in marketing — these are your strongest differentiators.',
      'Consider adjusting portion sizes or offering a prix fixe option to improve value perception.',
      'Train staff to proactively communicate wait times to manage customer expectations.',
    ],
  };
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id, name')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating, text, author, created_at')
    .eq('restaurant_id', restaurant.restaurant_id)
    .order('created_at', { ascending: false })
    .limit(500);

  if (!reviews || reviews.length === 0) {
    return NextResponse.json(getMockDrivers());
  }

  const typedReviews = reviews as ReviewRow[];
  const totalRating = typedReviews.reduce((s, r) => s + (r.rating || 0), 0);
  const overall_score = Math.round((totalRating / typedReviews.length) * 2) / 2;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const recentReviews = typedReviews.filter(r => new Date(r.created_at) >= thirtyDaysAgo);
  const olderReviews = typedReviews.filter(r => {
    const d = new Date(r.created_at);
    return d >= sixtyDaysAgo && d < thirtyDaysAgo;
  });

  const drivers: Driver[] = [];

  for (const [factor, keywords] of Object.entries(FACTOR_KEYWORDS)) {
    const matchingReviews = typedReviews.filter(r =>
      r.text && keywords.some(k => r.text!.toLowerCase().includes(k))
    );

    if (matchingReviews.length === 0) continue;

    const recentMatches = recentReviews.filter(r =>
      r.text && keywords.some(k => r.text!.toLowerCase().includes(k))
    );
    const olderMatches = olderReviews.filter(r =>
      r.text && keywords.some(k => r.text!.toLowerCase().includes(k))
    );

    const matchTexts = matchingReviews.map(r => r.text!);
    const sentiment = analyzeSentimentForFactor(matchTexts);

    const avgRatingForFactor = matchingReviews.reduce((s, r) => s + (r.rating || 0), 0) / matchingReviews.length;
    const impact_score = Math.min(10, Math.max(1, Math.round(
      (matchingReviews.length / typedReviews.length) * 10 +
      (sentiment === 'positive' ? avgRatingForFactor / 2 : sentiment === 'negative' ? (5 - avgRatingForFactor) / 2 : 0)
    )));

    const recentRate = recentReviews.length > 0 ? recentMatches.length / recentReviews.length : 0;
    const olderRate = olderReviews.length > 0 ? olderMatches.length / olderReviews.length : 0;
    const trend: 'up' | 'down' | 'stable' = recentRate > olderRate * 1.2 ? 'up' : recentRate < olderRate * 0.8 ? 'down' : 'stable';

    const quotes = matchingReviews
      .filter(r => r.text && r.text.length > 20 && r.text.length < 200)
      .slice(0, 3)
      .map(r => r.text!);

    drivers.push({
      factor,
      impact_score,
      sentiment,
      mention_count: matchingReviews.length,
      example_quotes: quotes.length > 0 ? quotes : [`Mentioned in ${matchingReviews.length} reviews`],
      trend,
    });
  }

  drivers.sort((a, b) => b.impact_score - a.impact_score);

  const strengths = drivers.filter(d => d.sentiment === 'positive').map(d => d.factor);
  const weaknesses = drivers.filter(d => d.sentiment === 'negative').map(d => d.factor);

  const recommendations: string[] = [];
  if (weaknesses.length > 0) {
    recommendations.push(`Focus on improving ${weaknesses.slice(0, 2).join(' and ')} — these are your biggest areas for growth.`);
  }
  if (strengths.length > 0) {
    recommendations.push(`Leverage your strength in ${strengths[0]} in marketing campaigns to attract new customers.`);
  }
  const mixedDrivers = drivers.filter(d => d.sentiment === 'mixed');
  if (mixedDrivers.length > 0) {
    recommendations.push(`${mixedDrivers[0].factor} gets mixed feedback — investigate specific complaints to turn this into a strength.`);
  }
  if (drivers.some(d => d.factor === 'Wait Time' && d.sentiment !== 'positive')) {
    recommendations.push('Consider implementing a waitlist notification system to improve the wait experience.');
  }
  if (recommendations.length === 0) {
    recommendations.push('Maintain your current standards and encourage satisfied customers to leave reviews.');
  }

  return NextResponse.json({
    drivers,
    overall_score: Math.round(overall_score * 20) / 10,
    total_reviews: typedReviews.length,
    recommendations,
  });
}
