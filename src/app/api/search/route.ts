import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

async function getRestaurant(supabase: ReturnType<typeof createServerSupabase>, userId: string) {
  const { data } = await supabase.from('restaurants').select('restaurant_id').eq('clerk_user_id', userId).single();
  return data;
}

export async function GET(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const q = request.nextUrl.searchParams.get('q') || '';
  if (q.length < 2) {
    return NextResponse.json({ customers: [], reviews: [], leads: [] });
  }

  const restaurantId = restaurant.restaurant_id;
  const pattern = `%${q}%`;

  const [customersRes, reviewsRes, leadsRes] = await Promise.all([
    supabase
      .from('customers')
      .select('customer_id, first_name, email, phone, visit_count')
      .eq('restaurant_id', restaurantId)
      .or(`first_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`)
      .limit(5),

    supabase
      .from('reviews')
      .select('review_id, author, rating, platform, text')
      .eq('restaurant_id', restaurantId)
      .or(`author.ilike.${pattern},text.ilike.${pattern}`)
      .limit(5),

    supabase
      .from('catering_leads')
      .select('lead_id, company_name, contact_name, sequence_status')
      .eq('restaurant_id', restaurantId)
      .or(`company_name.ilike.${pattern},contact_name.ilike.${pattern},contact_email.ilike.${pattern}`)
      .limit(5),
  ]);

  const reviews = (reviewsRes.data || []).map((r) => ({
    ...r,
    text: r.text && r.text.length > 100 ? r.text.substring(0, 100) + '...' : r.text,
  }));

  return NextResponse.json({
    customers: customersRes.data || [],
    reviews,
    leads: leadsRes.data || [],
  });
}
