import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id, name, cuisine_type')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const { data: competitors } = await supabase
    .from('competitors')
    .select('*')
    .eq('restaurant_id', restaurant.restaurant_id)
    .order('created_at', { ascending: false });

  // Get restaurant's own review stats for comparison
  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating, platform')
    .eq('restaurant_id', restaurant.restaurant_id);

  const allReviews = reviews || [];
  const googleReviews = allReviews.filter(r => r.platform === 'google');
  const yelpReviews = allReviews.filter(r => r.platform === 'yelp');

  const avgGoogle = googleReviews.length > 0
    ? +(googleReviews.reduce((s, r) => s + r.rating, 0) / googleReviews.length).toFixed(1)
    : null;
  const avgYelp = yelpReviews.length > 0
    ? +(yelpReviews.reduce((s, r) => s + r.rating, 0) / yelpReviews.length).toFixed(1)
    : null;
  const avgAll = allReviews.length > 0
    ? +(allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length).toFixed(1)
    : null;

  return NextResponse.json({
    competitors: competitors || [],
    restaurant: {
      name: restaurant.name,
      cuisine_type: restaurant.cuisine_type,
      google_rating: avgGoogle,
      google_review_count: googleReviews.length,
      yelp_rating: avgYelp,
      yelp_review_count: yelpReviews.length,
      avg_rating: avgAll,
      total_reviews: allReviews.length,
    },
  });
}

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await req.json();
  const { name, address, cuisine_type, google_rating, google_review_count, yelp_rating, yelp_review_count, price_level, notes } = body;

  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const { data, error } = await supabase
    .from('competitors')
    .insert({
      restaurant_id: restaurant.restaurant_id,
      name,
      address: address || null,
      cuisine_type: cuisine_type || null,
      google_rating: google_rating || null,
      google_review_count: google_review_count || null,
      yelp_rating: yelp_rating || null,
      yelp_review_count: yelp_review_count || null,
      price_level: price_level || null,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ competitor: data });
}

export async function DELETE(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await req.json();
  const { id } = body;

  if (!id) return NextResponse.json({ error: 'Competitor id is required' }, { status: 400 });

  const { error } = await supabase
    .from('competitors')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', restaurant.restaurant_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
