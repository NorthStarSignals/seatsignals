import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// ── Stop words to filter out ──
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'its', 'was', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'this',
  'that', 'these', 'those', 'i', 'we', 'you', 'he', 'she', 'they',
  'me', 'us', 'him', 'her', 'them', 'my', 'our', 'your', 'his',
  'their', 'what', 'which', 'who', 'when', 'where', 'how', 'not',
  'no', 'nor', 'if', 'then', 'than', 'too', 'very', 'so', 'just',
  'about', 'up', 'out', 'are', 'as', 'also', 'all', 'any', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
  'only', 'own', 'same', 'into', 'over', 'after', 'before', 'between',
  'through', 'during', 'above', 'below', 'again', 'further', 'once',
  'here', 'there', 'am', 'get', 'got', 'really', 'much', 'even',
  'back', 'well', 'still', 'way', 'take', 'go', 'come', 'went',
  'came', 'make', 'made', 'like', 'one', 'two', 'first', 'time',
  'new', 'now', 'look', 'people', 'thing', 'things', 'know', 'said',
  'say', 'think', 'see', 'want', 'give', 'use', 'tell', 'try',
  'ask', 'need', 'feel', 'let', 'keep', 'put', 'long', 'going',
  've', 're', 'll', 'don', 't', 's', 'didn', 'doesn', 'won',
  'wouldn', 'couldn', 'shouldn', 'haven', 'hasn', 'hadn', 'isn',
  'aren', 'wasn', 'weren', 'very', 'really', 'quite', 'bit',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function extractBigrams(tokens: string[]): string[] {
  const bigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return bigrams;
}

interface ReviewRow {
  review_text: string | null;
  sentiment_score: number | null;
  sentiment_label: string | null;
  analyzed_at: string | null;
}

interface KeywordStats {
  keyword: string;
  count: number;
  avg_sentiment: number;
  sentiment_counts: { positive: number; negative: number; neutral: number };
  recent_count: number;
  older_count: number;
  trend: 'up' | 'down' | 'stable';
}

export async function GET(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const rid = restaurant.restaurant_id;

  // Parse date range filter
  const searchParams = req.nextUrl.searchParams;
  const days = parseInt(searchParams.get('days') || '90', 10);
  const sentimentFilter = searchParams.get('sentiment') || null; // positive/negative/neutral

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  let query = supabase
    .from('cortex_review_sentiment')
    .select('review_text, sentiment_score, sentiment_label, analyzed_at')
    .eq('restaurant_id', rid)
    .gte('analyzed_at', cutoffDate.toISOString())
    .order('analyzed_at', { ascending: false });

  if (sentimentFilter) {
    query = query.eq('sentiment_label', sentimentFilter);
  }

  const { data: reviews, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const allReviews: ReviewRow[] = reviews || [];

  // Determine midpoint for trend calculation
  const midpointDate = new Date();
  midpointDate.setDate(midpointDate.getDate() - Math.floor(days / 2));

  // ── Extract keywords ──
  const keywordMap = new Map<string, {
    count: number;
    sentimentSum: number;
    sentimentCounts: { positive: number; negative: number; neutral: number };
    recentCount: number;
    olderCount: number;
  }>();

  const bigramMap = new Map<string, {
    count: number;
    sentimentSum: number;
    sentimentCounts: { positive: number; negative: number; neutral: number };
    recentCount: number;
    olderCount: number;
  }>();

  for (const review of allReviews) {
    if (!review.review_text) continue;

    const tokens = tokenize(review.review_text);
    const bigrams = extractBigrams(tokens);
    const label = (review.sentiment_label || 'neutral') as 'positive' | 'negative' | 'neutral';
    const score = review.sentiment_score ?? 0.5;
    const isRecent = review.analyzed_at
      ? new Date(review.analyzed_at) >= midpointDate
      : false;

    // Count unique keywords per review (avoid counting duplicates within same review)
    const uniqueTokens = new Set(tokens);
    for (const word of Array.from(uniqueTokens)) {
      const entry = keywordMap.get(word) || {
        count: 0,
        sentimentSum: 0,
        sentimentCounts: { positive: 0, negative: 0, neutral: 0 },
        recentCount: 0,
        olderCount: 0,
      };
      entry.count++;
      entry.sentimentSum += score;
      entry.sentimentCounts[label]++;
      if (isRecent) entry.recentCount++;
      else entry.olderCount++;
      keywordMap.set(word, entry);
    }

    const uniqueBigrams = new Set(bigrams);
    for (const bigram of Array.from(uniqueBigrams)) {
      const entry = bigramMap.get(bigram) || {
        count: 0,
        sentimentSum: 0,
        sentimentCounts: { positive: 0, negative: 0, neutral: 0 },
        recentCount: 0,
        olderCount: 0,
      };
      entry.count++;
      entry.sentimentSum += score;
      entry.sentimentCounts[label]++;
      if (isRecent) entry.recentCount++;
      else entry.olderCount++;
      bigramMap.set(bigram, entry);
    }
  }

  // ── Build sorted results ──
  function computeTrend(recent: number, older: number): 'up' | 'down' | 'stable' {
    if (older === 0 && recent > 0) return 'up';
    if (older === 0 && recent === 0) return 'stable';
    const ratio = recent / Math.max(older, 1);
    if (ratio > 1.25) return 'up';
    if (ratio < 0.75) return 'down';
    return 'stable';
  }

  function mapToKeywordStats(
    map: Map<string, {
      count: number;
      sentimentSum: number;
      sentimentCounts: { positive: number; negative: number; neutral: number };
      recentCount: number;
      olderCount: number;
    }>,
    limit: number,
  ): KeywordStats[] {
    return Array.from(map.entries())
      .filter(([, v]) => v.count >= 2) // must appear in at least 2 reviews
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([keyword, v]) => ({
        keyword,
        count: v.count,
        avg_sentiment: Math.round((v.sentimentSum / v.count) * 100) / 100,
        sentiment_counts: v.sentimentCounts,
        recent_count: v.recentCount,
        older_count: v.olderCount,
        trend: computeTrend(v.recentCount, v.olderCount),
      }));
  }

  const topKeywords = mapToKeywordStats(keywordMap, 30);
  const topBigrams = mapToKeywordStats(bigramMap, 10);

  // ── Sentiment breakdown across all reviews ──
  const sentimentBreakdown = { positive: 0, negative: 0, neutral: 0 };
  for (const review of allReviews) {
    const label = (review.sentiment_label || 'neutral') as keyof typeof sentimentBreakdown;
    if (label in sentimentBreakdown) sentimentBreakdown[label]++;
  }

  // ── Trending topics (biggest increase in recent half) ──
  const trendingTopics = Array.from(keywordMap.entries())
    .filter(([, v]) => v.count >= 3 && v.recentCount > v.olderCount)
    .sort((a, b) => {
      const aRatio = a[1].recentCount / Math.max(a[1].olderCount, 1);
      const bRatio = b[1].recentCount / Math.max(b[1].olderCount, 1);
      return bRatio - aRatio;
    })
    .slice(0, 10)
    .map(([keyword, v]) => ({
      keyword,
      count: v.count,
      recent_count: v.recentCount,
      older_count: v.olderCount,
      avg_sentiment: Math.round((v.sentimentSum / v.count) * 100) / 100,
    }));

  return NextResponse.json({
    total_reviews: allReviews.length,
    days,
    sentiment_breakdown: sentimentBreakdown,
    keywords: topKeywords,
    bigrams: topBigrams,
    trending: trendingTopics,
  });
}
