import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/* ------------------------------------------------------------------ */
/*  Auth helper                                                        */
/* ------------------------------------------------------------------ */

async function getRestaurant(supabase: ReturnType<typeof createServerSupabase>, userId: string) {
  const { data } = await supabase.from('restaurants').select('restaurant_id').eq('clerk_user_id', userId).single();
  return data;
}

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

function getMockCampaigns(restaurantId: string) {
  return [
    {
      id: 'ec-001',
      restaurant_id: restaurantId,
      name: 'Summer Menu Launch',
      subject: 'Our New Summer Menu is Here!',
      body_html: '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;"><h1 style="color:#E11D48;">New Summer Menu</h1><p>Come try our refreshing new dishes.</p></div>',
      segment_id: 'all-customers',
      segment_name: 'All Customers',
      status: 'sent',
      scheduled_at: '2026-03-15T10:00:00Z',
      sent_at: '2026-03-15T10:00:00Z',
      created_at: '2026-03-10T14:30:00Z',
      stats: { sent: 1248, opened: 498, clicked: 187, unsubscribed: 3 },
    },
    {
      id: 'ec-002',
      restaurant_id: restaurantId,
      name: 'Win-Back Campaign',
      subject: 'We Miss You! Here\'s 20% Off',
      body_html: '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;"><h1 style="color:#E11D48;">We Miss You!</h1><p>It\'s been a while. Come back for 20% off your next visit.</p></div>',
      segment_id: 'lapsed-60',
      segment_name: 'Lapsed 60+ Days',
      status: 'sent',
      scheduled_at: '2026-03-20T09:00:00Z',
      sent_at: '2026-03-20T09:00:00Z',
      created_at: '2026-03-18T11:00:00Z',
      stats: { sent: 432, opened: 201, clicked: 89, unsubscribed: 5 },
    },
    {
      id: 'ec-003',
      restaurant_id: restaurantId,
      name: 'Easter Brunch Special',
      subject: 'Reserve Your Easter Brunch Table',
      body_html: '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;"><h1 style="color:#E11D48;">Easter Brunch</h1><p>Join us for a special Easter brunch with live music.</p></div>',
      segment_id: 'vip',
      segment_name: 'VIP Guests',
      status: 'scheduled',
      scheduled_at: '2026-04-10T08:00:00Z',
      sent_at: null,
      created_at: '2026-04-01T16:00:00Z',
      stats: { sent: 0, opened: 0, clicked: 0, unsubscribed: 0 },
    },
    {
      id: 'ec-004',
      restaurant_id: restaurantId,
      name: 'Weekly Newsletter Draft',
      subject: 'This Week at [Restaurant]',
      body_html: '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;"><h1 style="color:#E11D48;">This Week</h1><p>Draft content here...</p></div>',
      segment_id: 'newsletter',
      segment_name: 'Newsletter Subscribers',
      status: 'draft',
      scheduled_at: null,
      sent_at: null,
      created_at: '2026-04-05T09:00:00Z',
      stats: { sent: 0, opened: 0, clicked: 0, unsubscribed: 0 },
    },
    {
      id: 'ec-005',
      restaurant_id: restaurantId,
      name: 'Happy Hour Promo',
      subject: 'Half-Price Appetizers This Friday!',
      body_html: '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;"><h1 style="color:#E11D48;">Happy Hour!</h1><p>Join us Friday for half-price appetizers 4-6pm.</p></div>',
      segment_id: 'regulars',
      segment_name: 'Regular Guests',
      status: 'sent',
      scheduled_at: '2026-02-28T14:00:00Z',
      sent_at: '2026-02-28T14:00:00Z',
      created_at: '2026-02-25T10:00:00Z',
      stats: { sent: 876, opened: 394, clicked: 156, unsubscribed: 2 },
    },
  ];
}

const SEGMENTS = [
  { id: 'all-customers', name: 'All Customers', count: 2480 },
  { id: 'vip', name: 'VIP Guests', count: 312 },
  { id: 'regulars', name: 'Regular Guests', count: 876 },
  { id: 'lapsed-30', name: 'Lapsed 30+ Days', count: 245 },
  { id: 'lapsed-60', name: 'Lapsed 60+ Days', count: 432 },
  { id: 'newsletter', name: 'Newsletter Subscribers', count: 1890 },
  { id: 'birthday-month', name: 'Birthday This Month', count: 67 },
];

/* ------------------------------------------------------------------ */
/*  GET – list email campaigns                                         */
/* ------------------------------------------------------------------ */

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const campaigns = getMockCampaigns(restaurant.restaurant_id);

  return NextResponse.json({ campaigns, segments: SEGMENTS });
}

/* ------------------------------------------------------------------ */
/*  POST – create email campaign                                       */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await req.json();
  const { name, subject, body_html, segment_id, scheduled_at, status } = body;

  if (!name || !subject) {
    return NextResponse.json(
      { error: 'Missing required fields: name, subject' },
      { status: 400 }
    );
  }

  const campaignStatus = status || 'draft';
  if (!['draft', 'scheduled', 'sending', 'sent'].includes(campaignStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const segment = SEGMENTS.find(s => s.id === segment_id);

  const campaign = {
    id: `ec-${Date.now()}`,
    restaurant_id: restaurant.restaurant_id,
    name,
    subject,
    body_html: body_html || '',
    segment_id: segment_id || 'all-customers',
    segment_name: segment?.name || 'All Customers',
    status: campaignStatus,
    scheduled_at: scheduled_at || null,
    sent_at: null,
    created_at: new Date().toISOString(),
    stats: { sent: 0, opened: 0, clicked: 0, unsubscribed: 0 },
  };

  return NextResponse.json(campaign, { status: 201 });
}

/* ------------------------------------------------------------------ */
/*  PUT – update email campaign                                        */
/* ------------------------------------------------------------------ */

export async function PUT(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing campaign id' }, { status: 400 });
  }

  // In production this would update the DB row
  const campaigns = getMockCampaigns(restaurant.restaurant_id);
  const existing = campaigns.find(c => c.id === id);
  if (!existing) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const updated = { ...existing, ...updates };

  return NextResponse.json(updated);
}

/* ------------------------------------------------------------------ */
/*  DELETE – delete draft campaign                                     */
/* ------------------------------------------------------------------ */

export async function DELETE(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await req.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing campaign id' }, { status: 400 });
  }

  const campaigns = getMockCampaigns(restaurant.restaurant_id);
  const campaign = campaigns.find(c => c.id === id);

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  if (campaign.status !== 'draft') {
    return NextResponse.json({ error: 'Only draft campaigns can be deleted' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
