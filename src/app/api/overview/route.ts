import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const rid = restaurant.restaurant_id;
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthStart = startOfMonth.toISOString();

  // Total customers
  const { count: totalCustomers } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', rid);

  // Reviews stats
  const { data: reviews } = await supabase
    .from('reviews')
    .select('response_status')
    .eq('restaurant_id', rid);
  const totalReviews = (reviews || []).length;
  const respondedReviews = (reviews || []).filter(r => r.response_status === 'posted').length;
  const responseRate = totalReviews > 0 ? Math.round((respondedReviews / totalReviews) * 100) : 0;

  // Active catering leads
  const { count: activeLeads } = await supabase
    .from('catering_leads')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', rid)
    .eq('converted', false);

  // Corporate accounts
  const { count: corpAccounts } = await supabase
    .from('corporate_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', rid);

  // Dead hours filled this month
  const { data: deadHoursData } = await supabase
    .from('dead_hours')
    .select('seats_filled, revenue')
    .eq('restaurant_id', rid)
    .gte('triggered_at', monthStart);
  const deadHoursFilled = (deadHoursData || []).filter(d => d.seats_filled > 0).length;
  const deadHoursRevenue = (deadHoursData || []).reduce((sum, d) => sum + (d.revenue || 0), 0);

  // Upcoming birthdays
  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const { data: customers } = await supabase
    .from('customers')
    .select('birthday')
    .eq('restaurant_id', rid)
    .not('birthday', 'is', null);
  const upcomingBirthdays = (customers || []).filter(c => {
    if (!c.birthday) return false;
    const bday = new Date(c.birthday);
    const thisYear = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
    return thisYear >= now && thisYear <= thirtyDays;
  }).length;

  // Revenue attribution
  // Catering revenue
  const { data: cateringOrders } = await supabase
    .from('catering_orders')
    .select('amount, recurring, corporate_account_id')
    .eq('restaurant_id', rid)
    .gte('date', monthStart);

  const cateringRevenue = (cateringOrders || []).reduce((sum, o) => sum + (o.amount || 0), 0);
  const corporateRecurring = (cateringOrders || [])
    .filter(o => o.corporate_account_id && o.recurring)
    .reduce((sum, o) => sum + (o.amount || 0), 0);

  // Birthday revenue
  const { data: birthdayEvents } = await supabase
    .from('birthday_events')
    .select('check_total')
    .eq('restaurant_id', rid)
    .eq('redeemed', true)
    .gte('offer_sent_at', monthStart);
  const birthdayRevenue = (birthdayEvents || []).reduce((sum, e) => sum + (e.check_total || 0), 0);

  // Retention (sequences that converted)
  const { data: retentionSeqs } = await supabase
    .from('sequences')
    .select('converted')
    .eq('restaurant_id', rid)
    .eq('type', 'retention')
    .eq('converted', true)
    .gte('sent_at', monthStart);
  const retentionRevenue = (retentionSeqs || []).length * 45; // Estimated avg check per converted visit

  const totalAttributed = retentionRevenue + cateringRevenue + corporateRecurring + deadHoursRevenue + birthdayRevenue;

  // Activity feed - recent events from all tables
  const activities: Array<{ text: string; time: string; type: string }> = [];

  const { data: recentCustomers } = await supabase
    .from('customers')
    .select('first_name, email, source, first_seen')
    .eq('restaurant_id', rid)
    .order('first_seen', { ascending: false })
    .limit(10);
  for (const c of recentCustomers || []) {
    activities.push({ text: `New customer captured via ${c.source}: ${c.first_name || c.email}`, time: c.first_seen, type: 'customer' });
  }

  const { data: recentReviews } = await supabase
    .from('reviews')
    .select('author, rating, response_status, created_at')
    .eq('restaurant_id', rid)
    .order('created_at', { ascending: false })
    .limit(10);
  for (const r of recentReviews || []) {
    const action = r.response_status === 'posted' ? 'AI responded to' : 'New';
    activities.push({ text: `${action} ${r.rating}-star review from ${r.author}`, time: r.created_at, type: 'review' });
  }

  const { data: recentSequences } = await supabase
    .from('sequences')
    .select('type, message, sent_at')
    .eq('restaurant_id', rid)
    .order('sent_at', { ascending: false })
    .limit(10);
  for (const s of recentSequences || []) {
    activities.push({ text: s.message, time: s.sent_at, type: s.type });
  }

  const { data: recentOrders } = await supabase
    .from('catering_orders')
    .select('amount, date')
    .eq('restaurant_id', rid)
    .order('date', { ascending: false })
    .limit(5);
  for (const o of recentOrders || []) {
    activities.push({ text: `Catering order placed: $${o.amount}`, time: o.date, type: 'catering' });
  }

  // Sort activities by time
  activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return NextResponse.json({
    metrics: {
      total_customers: totalCustomers || 0,
      response_rate: responseRate,
      active_leads: activeLeads || 0,
      corp_accounts: corpAccounts || 0,
      dead_hours_filled: deadHoursFilled,
      upcoming_birthdays: upcomingBirthdays,
    },
    revenue: {
      total: totalAttributed,
      repeat_visits: retentionRevenue,
      catering: cateringRevenue,
      corporate_recurring: corporateRecurring,
      dead_hours: deadHoursRevenue,
      birthdays: birthdayRevenue,
      delivery_uplift: 0, // Calculated from delivery metrics baseline
    },
    activities: activities.slice(0, 50),
  });
}
