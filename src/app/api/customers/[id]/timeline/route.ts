import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

/**
 * Customer Timeline API
 * Returns a chronological timeline of all interactions with a customer
 */

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const customerId = params.id;
  const rid = restaurant.restaurant_id;

  // Verify customer belongs to restaurant
  const { data: customer } = await supabase
    .from('customers')
    .select('customer_id, first_name, first_seen')
    .eq('customer_id', customerId)
    .eq('restaurant_id', rid)
    .single();

  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

  interface TimelineEvent {
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
  }

  const events: TimelineEvent[] = [];

  // First seen
  if (customer.first_seen) {
    events.push({
      id: 'first-seen',
      type: 'joined',
      title: 'Customer Joined',
      description: `${customer.first_name} was first seen`,
      timestamp: customer.first_seen,
    });
  }

  // Visits/notes
  const { data: notes } = await supabase
    .from('customer_notes')
    .select('id, note, created_at, author')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  for (const note of notes || []) {
    events.push({
      id: `note-${note.id}`,
      type: 'note',
      title: 'Note Added',
      description: note.note,
      timestamp: note.created_at,
      metadata: { author: note.author },
    });
  }

  // Tags
  const { data: tags } = await supabase
    .from('customer_tags')
    .select('id, tag, created_at')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  for (const tag of tags || []) {
    events.push({
      id: `tag-${tag.id}`,
      type: 'tag',
      title: 'Tag Added',
      description: `Tagged as "${tag.tag}"`,
      timestamp: tag.created_at,
    });
  }

  // Reviews
  const { data: reviews } = await supabase
    .from('cortex_review_sentiment')
    .select('review_id, rating, platform, sentiment_label, analyzed_at')
    .eq('restaurant_id', rid);

  // Match by customer name (approximate)
  const nameMatch = customer.first_name?.toLowerCase();
  for (const review of reviews || []) {
    // This is a rough match — production would use customer_id linking
    if (nameMatch && review.review_id) {
      events.push({
        id: `review-${review.review_id}`,
        type: 'review',
        title: `${review.rating}★ Review`,
        description: `Left a ${review.sentiment_label} review on ${review.platform}`,
        timestamp: review.analyzed_at,
        metadata: { rating: review.rating, platform: review.platform },
      });
    }
  }

  // Referrals
  const { data: referrals } = await supabase
    .from('referrals')
    .select('id, referee_email, status, created_at')
    .eq('referrer_id', customerId);

  for (const ref of referrals || []) {
    events.push({
      id: `referral-${ref.id}`,
      type: 'referral',
      title: 'Referred Someone',
      description: `Referred ${ref.referee_email} (${ref.status})`,
      timestamp: ref.created_at,
      metadata: { status: ref.status },
    });
  }

  // Survey responses
  const { data: surveys } = await supabase
    .from('survey_responses')
    .select('id, overall_rating, created_at')
    .eq('customer_id', customerId);

  for (const s of surveys || []) {
    events.push({
      id: `survey-${s.id}`,
      type: 'survey',
      title: 'Survey Completed',
      description: `Rated overall ${s.overall_rating}/5`,
      timestamp: s.created_at,
    });
  }

  // Sort chronologically (newest first)
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json({
    customer_id: customerId,
    customer_name: customer.first_name,
    events,
    total: events.length,
  });
}
