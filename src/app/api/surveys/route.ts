import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

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

  const { data: responses } = await supabase
    .from('survey_responses')
    .select('*, customers(first_name, email)')
    .eq('restaurant_id', restaurant.restaurant_id)
    .order('created_at', { ascending: false })
    .limit(50);

  const all = responses || [];
  const total_responses = all.length;

  const rated = all.filter((r) => r.overall_rating != null);
  const avg_overall = rated.length > 0
    ? Math.round((rated.reduce((s, r) => s + r.overall_rating, 0) / rated.length) * 10) / 10
    : 0;

  const foodRated = all.filter((r) => r.food_rating != null);
  const avg_food = foodRated.length > 0
    ? Math.round((foodRated.reduce((s, r) => s + r.food_rating, 0) / foodRated.length) * 10) / 10
    : 0;

  const serviceRated = all.filter((r) => r.service_rating != null);
  const avg_service = serviceRated.length > 0
    ? Math.round((serviceRated.reduce((s, r) => s + r.service_rating, 0) / serviceRated.length) * 10) / 10
    : 0;

  const ambianceRated = all.filter((r) => r.ambiance_rating != null);
  const avg_ambiance = ambianceRated.length > 0
    ? Math.round((ambianceRated.reduce((s, r) => s + r.ambiance_rating, 0) / ambianceRated.length) * 10) / 10
    : 0;

  const recommendResponses = all.filter((r) => r.would_recommend != null);
  const recommend_pct = recommendResponses.length > 0
    ? Math.round((recommendResponses.filter((r) => r.would_recommend).length / recommendResponses.length) * 100)
    : 0;

  // NPS: 5 = promoter, 4 = passive, 1-3 = detractor
  const promoters = rated.filter((r) => r.overall_rating === 5).length;
  const detractors = rated.filter((r) => r.overall_rating <= 3).length;
  const nps_score = rated.length > 0
    ? Math.round(((promoters - detractors) / rated.length) * 100)
    : 0;

  return NextResponse.json({
    responses: all,
    stats: {
      total_responses,
      avg_overall,
      avg_food,
      avg_service,
      avg_ambiance,
      recommend_pct,
      nps_score,
    },
  });
}

export async function POST(req: Request) {
  // Public endpoint — no auth required
  const supabase = createServerSupabase();

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { restaurant_id, customer_id, visit_id, overall_rating, food_rating, service_rating, ambiance_rating, would_recommend, feedback_text } = body;

  if (!restaurant_id) {
    return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 });
  }

  if (!overall_rating || overall_rating < 1 || overall_rating > 5) {
    return NextResponse.json({ error: 'overall_rating (1-5) is required' }, { status: 400 });
  }

  // Validate restaurant exists
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id, name')
    .eq('restaurant_id', restaurant_id)
    .single();

  if (!restaurant) {
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
  }

  // Create survey response
  const { data: response, error } = await supabase
    .from('survey_responses')
    .insert({
      restaurant_id,
      customer_id: customer_id || null,
      visit_id: visit_id || null,
      survey_type: 'post_visit',
      overall_rating,
      food_rating: food_rating || null,
      service_rating: service_rating || null,
      ambiance_rating: ambiance_rating || null,
      would_recommend: would_recommend ?? null,
      feedback_text: feedback_text || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create survey response' }, { status: 500 });
  }

  // If customer_id provided, create a notification
  if (customer_id) {
    const { data: customer } = await supabase
      .from('customers')
      .select('first_name')
      .eq('customer_id', customer_id)
      .single();

    const customerName = customer?.first_name || 'A customer';
    await supabase.from('notifications').insert({
      restaurant_id,
      type: 'survey',
      text: `New survey from ${customerName}: ${overall_rating}/5 stars`,
      link: '/dashboard/surveys',
    });
  }

  return NextResponse.json({ success: true, response });
}
