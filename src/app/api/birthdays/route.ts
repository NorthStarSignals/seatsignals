import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

function generateCode(): string {
  return 'BD' + Math.random().toString(36).substring(2, 8).toUpperCase();
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
  const now = new Date();
  const currentYear = now.getFullYear();

  // ── Upcoming Birthdays (next 30 days) ──────────────────────────

  const { data: customers } = await supabase
    .from('customers')
    .select('customer_id, first_name, email, birthday, first_seen')
    .eq('restaurant_id', rid)
    .not('birthday', 'is', null);

  const upcoming = (customers || [])
    .map(c => {
      if (!c.birthday) return null;
      const bday = new Date(c.birthday);
      const thisYear = new Date(currentYear, bday.getMonth(), bday.getDate());
      // If birthday already passed this year, check next year
      if (thisYear.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
        thisYear.setFullYear(currentYear + 1);
      }
      const diffMs = thisYear.getTime() - now.getTime();
      const days_until = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (days_until < 0 || days_until > 30) return null;
      return {
        customer_id: c.customer_id,
        first_name: c.first_name,
        email: c.email,
        birthday: c.birthday,
        days_until,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.days_until - b.days_until);

  // ── Anniversary customers (next 30 days) ───────────────────────

  const allCustomers = customers || [];
  const anniversaries = allCustomers
    .map(c => {
      if (!c.first_seen) return null;
      const firstVisit = new Date(c.first_seen);
      const years = currentYear - firstVisit.getFullYear();
      if (years < 1) return null;

      const anniversary = new Date(currentYear, firstVisit.getMonth(), firstVisit.getDate());
      if (anniversary.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
        anniversary.setFullYear(currentYear + 1);
      }
      const diffMs = anniversary.getTime() - now.getTime();
      const days_until = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (days_until < 0 || days_until > 30) return null;

      return {
        customer_id: c.customer_id,
        first_name: c.first_name,
        email: c.email,
        first_seen: c.first_seen,
        years: currentYear - firstVisit.getFullYear() + (anniversary.getFullYear() > currentYear ? 1 : 0),
        days_until,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.days_until - b.days_until);

  // ── Birthday events (this month + recent) ──────────────────────

  const startOfMonth = new Date(currentYear, now.getMonth(), 1);
  const { data: events } = await supabase
    .from('birthday_events')
    .select('*, customers(first_name, email)')
    .eq('restaurant_id', rid)
    .order('offer_sent_at', { ascending: false })
    .limit(100);

  const allEvents = events || [];
  const thisMonthEvents = allEvents.filter(
    e => new Date(e.offer_sent_at) >= startOfMonth
  );

  // ── Attach offer status to upcoming/anniversaries ──────────────

  const thisYearEvents = allEvents.filter(e => {
    const sentDate = new Date(e.offer_sent_at);
    return sentDate.getFullYear() === currentYear;
  });

  const eventsByCustomer = new Map<string, typeof allEvents[0]>();
  for (const ev of thisYearEvents) {
    const key = `${ev.customer_id}:${ev.event_type}`;
    if (!eventsByCustomer.has(key)) {
      eventsByCustomer.set(key, ev);
    }
  }

  // Get last party sizes from redeemed events
  const partySizeMap = new Map<string, number>();
  for (const ev of allEvents) {
    if (ev.redeemed && ev.party_size && !partySizeMap.has(ev.customer_id)) {
      partySizeMap.set(ev.customer_id, ev.party_size);
    }
  }

  const upcomingWithStatus = (upcoming as Record<string, unknown>[]).map((c: Record<string, unknown>) => {
    const ev = eventsByCustomer.get(`${c.customer_id}:birthday`);
    return {
      ...c,
      last_party_size: partySizeMap.get(c.customer_id as string) || undefined,
      offer_status: ev ? (ev.redeemed ? 'redeemed' : 'sent') : 'none',
    };
  });

  const anniversariesWithStatus = (anniversaries as Record<string, unknown>[]).map((c: Record<string, unknown>) => {
    const ev = eventsByCustomer.get(`${c.customer_id}:anniversary`);
    return {
      ...c,
      offer_status: ev ? (ev.redeemed ? 'redeemed' : 'sent') : 'none',
    };
  });

  // ── Stats ──────────────────────────────────────────────────────

  const redeemed = thisMonthEvents.filter(e => e.redeemed);
  const celebrationRevenue = redeemed.reduce((sum, e) => sum + (e.check_total || 0), 0);

  const stats = {
    upcoming_count: upcoming.length,
    offers_sent: thisMonthEvents.length,
    redemption_rate:
      thisMonthEvents.length > 0
        ? Math.round((redeemed.length / thisMonthEvents.length) * 100)
        : 0,
    celebration_revenue: celebrationRevenue,
  };

  return NextResponse.json({
    upcoming: upcomingWithStatus,
    anniversaries: anniversariesWithStatus,
    events: allEvents,
    stats,
  });
}

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();
  const { customer_id, event_type } = body;

  if (!customer_id || !event_type) {
    return NextResponse.json({ error: 'customer_id and event_type required' }, { status: 400 });
  }

  // Verify customer belongs to this restaurant
  const { data: customer } = await supabase
    .from('customers')
    .select('customer_id, first_name, email, phone')
    .eq('customer_id', customer_id)
    .eq('restaurant_id', restaurant.restaurant_id)
    .single();

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const code = generateCode();
  const currentYear = new Date().getFullYear();

  // Check for existing event this year
  const { data: existing } = await supabase
    .from('birthday_events')
    .select('event_id')
    .eq('customer_id', customer_id)
    .eq('event_type', event_type)
    .eq('restaurant_id', restaurant.restaurant_id)
    .eq('year', currentYear)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Offer already sent for this year' }, { status: 409 });
  }

  // Create the event
  const { data: event, error } = await supabase
    .from('birthday_events')
    .insert({
      customer_id,
      restaurant_id: restaurant.restaurant_id,
      event_type,
      redemption_code: code,
      year: currentYear,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }

  // Optionally send message via messaging system
  // (Uses existing cron infrastructure for actual delivery)

  return NextResponse.json({ success: true, event, code });
}
