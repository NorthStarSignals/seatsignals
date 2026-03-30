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

  // Get upcoming birthdays (next 30 days)
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const { data: customers } = await supabase
    .from('customers')
    .select('customer_id, first_name, email, birthday')
    .eq('restaurant_id', restaurant.restaurant_id)
    .not('birthday', 'is', null);

  const upcoming = (customers || []).filter(c => {
    if (!c.birthday) return false;
    const bday = new Date(c.birthday);
    const thisYear = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
    return thisYear >= now && thisYear <= thirtyDaysFromNow;
  });

  // Get birthday events this month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const { data: events } = await supabase
    .from('birthday_events')
    .select('*, customers(first_name, email)')
    .eq('restaurant_id', restaurant.restaurant_id)
    .gte('offer_sent_at', startOfMonth.toISOString())
    .order('offer_sent_at', { ascending: false });

  const allEvents = events || [];
  const redeemed = allEvents.filter(e => e.redeemed);
  const totalRevenue = redeemed.reduce((sum, e) => sum + (e.check_total || 0), 0);
  const avgPartySize = redeemed.length > 0
    ? Math.round(redeemed.reduce((sum, e) => sum + (e.party_size || 0), 0) / redeemed.length)
    : 0;

  return NextResponse.json({
    upcoming,
    events: allEvents,
    stats: {
      this_month: allEvents.length,
      offers_sent: allEvents.length,
      redemption_rate: allEvents.length > 0
        ? Math.round((redeemed.length / allEvents.length) * 100)
        : 0,
      avg_party_size: avgPartySize,
      total_revenue: totalRevenue,
    },
  });
}
