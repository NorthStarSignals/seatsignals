import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

async function getRestaurant(supabase: ReturnType<typeof createServerSupabase>, userId: string) {
  const { data } = await supabase.from('restaurants').select('restaurant_id').eq('clerk_user_id', userId).single();
  return data;
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const rid = restaurant.restaurant_id;

  // Get all referrals with referrer name
  const { data: referrals, error } = await supabase
    .from('referrals')
    .select('*, customers!referrals_referrer_id_fkey(first_name, email)')
    .eq('restaurant_id', rid)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Compute metrics
  const total = referrals?.length || 0;
  const converted = referrals?.filter(r => r.status === 'visited' || r.status === 'rewarded').length || 0;
  const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;
  const rewarded = referrals?.filter(r => r.referrer_rewarded || r.referred_rewarded).length || 0;

  // Unique active referrers
  const uniqueReferrers = new Set(referrals?.map(r => r.referrer_id)).size;

  // Top referrers
  const referrerMap = new Map<string, { name: string; email: string; sent: number; conversions: number }>();
  referrals?.forEach(r => {
    const cust = r.customers as { first_name: string; email: string } | null;
    const name = cust?.first_name || 'Unknown';
    const email = cust?.email || '';
    const existing = referrerMap.get(r.referrer_id) || { name, email, sent: 0, conversions: 0 };
    existing.sent += 1;
    if (r.status === 'visited' || r.status === 'rewarded') existing.conversions += 1;
    referrerMap.set(r.referrer_id, existing);
  });

  const topReferrers = Array.from(referrerMap.entries())
    .map(([id, data]) => ({
      customer_id: id,
      name: data.name,
      email: data.email,
      referrals_sent: data.sent,
      conversions: data.conversions,
      conversion_rate: data.sent > 0 ? Math.round((data.conversions / data.sent) * 100) : 0,
    }))
    .sort((a, b) => b.conversions - a.conversions)
    .slice(0, 10);

  return NextResponse.json({
    referrals: referrals || [],
    metrics: {
      total_referrals: total,
      conversion_rate: conversionRate,
      active_referrers: uniqueReferrers,
      rewards_given: rewarded,
    },
    top_referrers: topReferrers,
  });
}

export async function POST(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();
  const { referrer_id, referred_email, reward_type, reward_value } = body;

  if (!referrer_id || !referred_email) {
    return NextResponse.json({ error: 'referrer_id and referred_email are required' }, { status: 400 });
  }

  // Verify referrer belongs to this restaurant
  const { data: referrer } = await supabase
    .from('customers')
    .select('customer_id')
    .eq('customer_id', referrer_id)
    .eq('restaurant_id', restaurant.restaurant_id)
    .single();

  if (!referrer) return NextResponse.json({ error: 'Referrer not found' }, { status: 404 });

  const referral_code = generateReferralCode();

  const { data, error } = await supabase
    .from('referrals')
    .insert({
      restaurant_id: restaurant.restaurant_id,
      referrer_id,
      referred_email,
      referral_code,
      reward_type: reward_type || null,
      reward_value: reward_value || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ...data,
    referral_link: `${process.env.NEXT_PUBLIC_APP_URL || 'https://seatsignals.app'}/refer/${referral_code}`,
  }, { status: 201 });
}
