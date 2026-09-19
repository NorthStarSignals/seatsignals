import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// Dev-only one-click seeder. Populates the authenticated user's restaurant
// with realistic demo data: 75 customers, ~220 visits, 12 reviews, 5 catering leads.
export async function POST() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();

  // Resolve restaurant
  const { data: restaurant, error: rErr } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (rErr || !restaurant) {
    return NextResponse.json({ error: 'No restaurant found. Complete onboarding first.' }, { status: 404 });
  }

  const restaurantId = restaurant.restaurant_id;

  // Wipe existing demo rows
  await supabase.from('visits').delete().eq('restaurant_id', restaurantId);
  await supabase.from('reviews').delete().eq('restaurant_id', restaurantId);
  await supabase.from('customers').delete().eq('restaurant_id', restaurantId);
  await supabase.from('catering_leads').delete().eq('restaurant_id', restaurantId);

  // Build customers
  const firstNames = ['Sarah','Marcus','Linda','David','Emma','James','Olivia','Liam','Sophia','Noah','Ava','Ethan','Mia','Lucas','Isabella','Mason','Charlotte','Logan','Amelia','Elijah'];
  const sources = ['wifi','reservation','online_order','walk_in'];
  const customerRows = [];
  for (let i = 1; i <= 75; i++) {
    const days = i * 3 + 5;
    const firstSeen = new Date(Date.now() - days * 86400000);
    const lastSeen = new Date(Date.now() - (i % 14) * 86400000);
    customerRows.push({
      restaurant_id: restaurantId,
      first_name: firstNames[i % firstNames.length],
      email: `demo${i}@example.com`,
      phone: `(415) 555-${String(1000 + i).padStart(4, '0')}`,
      first_seen: firstSeen.toISOString(),
      last_seen: lastSeen.toISOString(),
      visit_count: 1 + (i % 12),
      total_spend: Math.round((45 + (i * 17) % 380) * 100) / 100,
      birthday: new Date(1970 + (i % 40), i % 12, 1 + (i % 28)).toISOString().split('T')[0],
      source: sources[i % sources.length],
    });
  }

  const { data: insertedCustomers, error: cErr } = await supabase
    .from('customers')
    .insert(customerRows)
    .select('customer_id');

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  // Visits
  const customerIds = (insertedCustomers || []).map(c => c.customer_id);
  const visitSources = ['pos', 'reservation', 'online_order', 'wifi'];
  const visitRows = [];
  for (let i = 1; i <= 220; i++) {
    const cid = customerIds[i % customerIds.length];
    const ts = new Date(Date.now() - ((i * 7) % (60 * 24)) * 3600000 - (i % 60) * 86400000);
    visitRows.push({
      customer_id: cid,
      restaurant_id: restaurantId,
      timestamp: ts.toISOString(),
      source: visitSources[i % 4],
      spend_amount: Math.round((28 + (i * 13) % 220) * 100) / 100,
    });
  }
  await supabase.from('visits').insert(visitRows);

  // Reviews
  const reviewRows = [
    { platform: 'google', author: 'Sarah M.', rating: 5, text: 'Absolutely incredible experience! The sea bass was cooked to perfection and our server Marco was attentive without being intrusive.', response_status: 'responded', daysAgo: 2 },
    { platform: 'yelp', author: 'David K.', rating: 2, text: 'Waited 45 minutes for our table despite having a reservation. Food was decent but service was slow.', response_status: 'pending', daysAgo: 3 },
    { platform: 'tripadvisor', author: 'Linda W.', rating: 4, text: 'Lovely atmosphere and great cocktails. The truffle pasta was amazing.', response_status: 'responded', daysAgo: 4 },
    { platform: 'google', author: 'Marcus T.', rating: 5, text: 'Best Italian in town. The chef came out to greet our table — incredible touch.', response_status: 'responded', daysAgo: 5 },
    { platform: 'google', author: 'Emma R.', rating: 5, text: 'Date night perfection. Wine pairings were spot on.', response_status: 'responded', daysAgo: 6 },
    { platform: 'yelp', author: 'James P.', rating: 3, text: 'Food was good but it was very loud. Hard to have a conversation.', response_status: 'pending', daysAgo: 7 },
    { platform: 'google', author: 'Olivia C.', rating: 5, text: 'Brought my parents here for their anniversary. Staff went above and beyond.', response_status: 'responded', daysAgo: 8 },
    { platform: 'google', author: 'Liam B.', rating: 4, text: 'Solid spot. Will be back to try the tasting menu next time.', response_status: 'responded', daysAgo: 10 },
    { platform: 'yelp', author: 'Sophia G.', rating: 5, text: 'The bartender Sarah is a wizard. Best old fashioned I have ever had.', response_status: 'responded', daysAgo: 12 },
    { platform: 'google', author: 'Noah F.', rating: 1, text: 'Cold food, rude server. Will not return.', response_status: 'pending', daysAgo: 14 },
    { platform: 'tripadvisor', author: 'Ava H.', rating: 5, text: 'A hidden gem. The pasta is hand-rolled and you can taste the difference.', response_status: 'responded', daysAgo: 15 },
    { platform: 'google', author: 'Ethan W.', rating: 4, text: 'Great food, great service, fair prices. Three for three.', response_status: 'responded', daysAgo: 17 },
  ].map(r => ({
    restaurant_id: restaurantId,
    platform: r.platform,
    author: r.author,
    rating: r.rating,
    text: r.text,
    response_status: r.response_status,
    created_at: new Date(Date.now() - r.daysAgo * 86400000).toISOString(),
  }));
  await supabase.from('reviews').insert(reviewRows);

  // Catering leads
  await supabase.from('catering_leads').insert([
    { restaurant_id: restaurantId, company_name: 'Acme Tech Inc', contact_name: 'Jordan Lee' },
    { restaurant_id: restaurantId, company_name: 'Northwest Legal LLP', contact_name: 'Pat Rivera' },
    { restaurant_id: restaurantId, company_name: 'Bayside Marketing', contact_name: 'Casey Chen' },
    { restaurant_id: restaurantId, company_name: 'Ridgeline Capital', contact_name: 'Morgan Park' },
    { restaurant_id: restaurantId, company_name: 'Helix Biotech', contact_name: 'Riley Thompson' },
  ]);

  return NextResponse.json({
    success: true,
    seeded: {
      customers: 75,
      visits: 220,
      reviews: 12,
      catering_leads: 5,
    },
  });
}
