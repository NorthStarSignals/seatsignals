import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

/**
 * Activity Feed API
 * Aggregates recent activity across the restaurant:
 * new customers, reviews, referrals, survey responses, birthday events, etc.
 */

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  customer_name?: string;
  metadata?: Record<string, unknown>;
}

export async function GET() {
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
  const activities: ActivityItem[] = [];

  // New customers (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: newCustomers } = await supabase
    .from('customers')
    .select('customer_id, first_name, email, first_seen')
    .eq('restaurant_id', rid)
    .gte('first_seen', sevenDaysAgo.toISOString())
    .order('first_seen', { ascending: false })
    .limit(20);

  for (const c of newCustomers || []) {
    activities.push({
      id: `customer-${c.customer_id}`,
      type: 'new_customer',
      title: 'New Customer',
      description: `${c.first_name || c.email || 'Someone'} joined`,
      timestamp: c.first_seen,
      icon: 'user-plus',
      customer_name: c.first_name,
    });
  }

  // Recent reviews
  const { data: recentReviews } = await supabase
    .from('cortex_review_sentiment')
    .select('review_id, author, rating, platform, sentiment_label, analyzed_at')
    .eq('restaurant_id', rid)
    .gte('analyzed_at', sevenDaysAgo.toISOString())
    .order('analyzed_at', { ascending: false })
    .limit(20);

  for (const r of recentReviews || []) {
    activities.push({
      id: `review-${r.review_id}`,
      type: 'review',
      title: `${r.rating}★ Review`,
      description: `${r.author} left a ${r.sentiment_label} review on ${r.platform}`,
      timestamp: r.analyzed_at,
      icon: r.rating >= 4 ? 'star' : r.rating <= 2 ? 'alert-circle' : 'message-square',
      customer_name: r.author,
      metadata: { rating: r.rating, platform: r.platform, sentiment: r.sentiment_label },
    });
  }

  // Recent referrals
  const { data: recentReferrals } = await supabase
    .from('referrals')
    .select('id, referrer_id, referee_email, status, created_at, customers!referrals_referrer_id_fkey(first_name)')
    .eq('restaurant_id', rid)
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(10);

  for (const ref of recentReferrals || []) {
    const refCustomer = ref.customers as unknown as { first_name: string } | null;
    const referrerName = refCustomer?.first_name || 'Someone';
    activities.push({
      id: `referral-${ref.id}`,
      type: 'referral',
      title: 'New Referral',
      description: `${referrerName} referred ${ref.referee_email}`,
      timestamp: ref.created_at,
      icon: 'gift',
      customer_name: referrerName,
      metadata: { status: ref.status },
    });
  }

  // Survey responses
  const { data: recentSurveys } = await supabase
    .from('survey_responses')
    .select('id, customer_id, overall_rating, created_at')
    .eq('restaurant_id', rid)
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(10);

  for (const s of recentSurveys || []) {
    activities.push({
      id: `survey-${s.id}`,
      type: 'survey',
      title: 'Survey Response',
      description: `Rated ${s.overall_rating}/5 overall`,
      timestamp: s.created_at,
      icon: 'clipboard-list',
      metadata: { rating: s.overall_rating },
    });
  }

  // Notifications
  const { data: recentNotifs } = await supabase
    .from('notifications')
    .select('id, type, title, message, created_at')
    .eq('restaurant_id', rid)
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(10);

  for (const n of recentNotifs || []) {
    activities.push({
      id: `notif-${n.id}`,
      type: 'notification',
      title: n.title,
      description: n.message,
      timestamp: n.created_at,
      icon: 'bell',
    });
  }

  // Sort all by timestamp descending
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json({
    activities: activities.slice(0, 50),
    total: activities.length,
  });
}
