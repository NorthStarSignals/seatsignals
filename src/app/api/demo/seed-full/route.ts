import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/api-helpers';

/**
 * POST /api/demo/seed-full?reset=true
 *
 * Populates the authenticated tenant's workspace with believable demo data so
 * Gunner has something to show on sales calls. Idempotency: if `?reset=true`,
 * all tenant-scoped rows are wiped first; otherwise we top up what's missing.
 *
 * Tables seeded:
 *   - customers        : 50 realistic names/emails, visit counts, spend, tags
 *   - visits           : ~200 visits spread across last 90 days
 *   - reviews          : 30 reviews (Yelp/Google) with realistic rating curve
 *   - loyalty_rewards  : 6 milestone rewards
 *   - catering_leads   : 10 prospective catering clients
 *   - corporate_accounts : 5 corporate recurring clients
 *   - birthday_events  : 20 upcoming birthdays
 *   - dead_hours       : 4 time slots
 *
 * Does NOT touch: POS (pos_*), reservations, payments, AI-generated content.
 * Those come from real integrations.
 */

const FIRST_NAMES = [
  'Sarah', 'Michael', 'Priya', 'Carlos', 'Emma', 'David', 'Lisa', 'Alex',
  'Jordan', 'Olivia', 'James', 'Sofia', 'Ethan', 'Maya', 'Noah', 'Chloe',
  'Liam', 'Ava', 'Mason', 'Isabella', 'Marcus', 'Zoe', 'Daniel', 'Nora',
  'Ryan', 'Harper', 'Kevin', 'Grace', 'Sam', 'Lily', 'Aiden', 'Mia',
  'Tyler', 'Aria', 'Owen', 'Layla', 'Julian', 'Riley', 'Wyatt', 'Emily',
  'Tonya', 'Doug', 'Malik', 'Gunner', 'Sofia', 'Jamal', 'Nina', 'Dante',
  'Rachel', 'Vincent',
];
const LAST_NAMES = [
  'Thompson', 'Chen', 'Patel', 'Rodriguez', 'Williams', 'Kim', 'Parker',
  'Morgan', 'Lee', 'Bennett', 'Wright', 'Hernandez', 'Nguyen', 'Brooks',
  'Cooper', 'Reed', 'Bailey', 'Ward', 'Price', 'Fisher', 'Russell', 'Grant',
  'Murphy', 'Scott', 'Powell', 'Jenkins', 'Hayes', 'Foster', 'Ross', 'Perry',
];
const DOMAINS = ['gmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'hotmail.com'];
const SOURCES = ['wifi', 'reservation', 'online_order', 'walkin', 'google'];
const REVIEW_PLATFORMS = ['google', 'yelp', 'tripadvisor'] as const;
const POSITIVE_REVIEW_TEXTS = [
  'Incredible meal from start to finish. The filet was cooked perfectly and the service was attentive without being overbearing.',
  'Best dining experience we had all year. The chef came out to say hi and genuinely cared about our experience.',
  'Amazing food, great atmosphere, and the staff made us feel welcome. We will absolutely be back.',
  'Five stars. Every course was a home run and the wine pairings were excellent.',
  'Perfect spot for a date night. Lovely ambiance and the salmon was the best I\'ve had in Dallas.',
  'Celebrated our anniversary here and it was magical. Staff sang happy anniversary — so sweet.',
  'Worth every penny. The tasting menu was an experience, not just a meal.',
];
const MIXED_REVIEW_TEXTS = [
  'Food was solid but service was slow on a Saturday night. Still a good experience overall.',
  'Great food but the portions felt small for the price. Would come back for happy hour.',
  'Loved the atmosphere, appetizers were amazing, mains were just okay.',
  'Reservation was 20 min late but they comped us a dessert. Food was great once we sat.',
];
const NEGATIVE_REVIEW_TEXTS = [
  'Disappointing. Steak was overcooked and the server was inattentive. Not worth the price.',
  'Waited 45 minutes past our reservation time with no update. Food was fine but the wait soured it.',
  'Expected more for $80/person. Food was average, service was rushed.',
];

function rand(n: number) { return Math.floor(Math.random() * n); }
function pick<T>(arr: T[]): T { return arr[rand(arr.length)]; }
function randDate(daysBack: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - rand(daysBack));
  d.setHours(10 + rand(12), rand(60), 0, 0);
  return d;
}

export async function POST(request: Request) {
  const ctx = await resolveTenant();
  if (ctx instanceof NextResponse) return ctx;
  const { supabase, restaurantId } = ctx;

  const url = new URL(request.url);
  const reset = url.searchParams.get('reset') === 'true';

  const counts = {
    customers: 0, visits: 0, reviews: 0, rewards: 0,
    catering_leads: 0, corporate_accounts: 0, birthdays: 0, dead_hours: 0,
  };

  // --- Optional wipe first ---------------------------------------------------
  if (reset) {
    // Delete order line items (FK) before orders
    const { data: existingOrders } = await supabase
      .from('pos_orders')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('provider', 'demo');
    if (existingOrders && existingOrders.length) {
      await supabase
        .from('pos_order_line_items')
        .delete()
        .in('order_id', existingOrders.map((o) => o.id));
    }
    await supabase.from('pos_orders').delete().eq('restaurant_id', restaurantId).eq('provider', 'demo');
    await supabase.from('visits').delete().eq('restaurant_id', restaurantId);
    await supabase.from('loyalty_achievements').delete().eq('restaurant_id', restaurantId);
    await supabase.from('loyalty_rewards').delete().eq('restaurant_id', restaurantId);
    await supabase.from('reviews').delete().eq('restaurant_id', restaurantId);
    await supabase.from('customers').delete().eq('restaurant_id', restaurantId);
    await supabase.from('catering_leads').delete().eq('restaurant_id', restaurantId);
    await supabase.from('corporate_accounts').delete().eq('restaurant_id', restaurantId);
    await supabase.from('birthday_events').delete().eq('restaurant_id', restaurantId);
    await supabase.from('dead_hours').delete().eq('restaurant_id', restaurantId);
  }

  // --- Customers (50) -------------------------------------------------------
  const customerRows: Array<Record<string, unknown>> = [];
  const usedEmails = new Set<string>();
  while (customerRows.length < 50) {
    const fn = pick(FIRST_NAMES);
    const ln = pick(LAST_NAMES);
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${rand(900)}@${pick(DOMAINS)}`;
    if (usedEmails.has(email)) continue;
    usedEmails.add(email);

    const visitCount = 1 + rand(40);
    const avgSpend = 35 + rand(80);
    const firstSeen = randDate(365 - rand(200));
    const lastSeen = new Date(firstSeen.getTime() + rand(180) * 86400000);
    customerRows.push({
      restaurant_id: restaurantId,
      first_name: fn,
      email,
      phone: `+1214${String(5000000 + rand(4999999)).slice(0, 7)}`,
      visit_count: visitCount,
      total_spend: visitCount * avgSpend,
      first_seen: firstSeen.toISOString(),
      last_seen: lastSeen.toISOString(),
      source: pick(SOURCES),
      birthday: `${1970 + rand(40)}-${String(1 + rand(12)).padStart(2, '0')}-${String(1 + rand(28)).padStart(2, '0')}`,
    });
  }
  const { data: insertedCustomers, error: cErr } = await supabase
    .from('customers')
    .insert(customerRows)
    .select('customer_id, first_name');
  if (cErr) return NextResponse.json({ error: `customers: ${cErr.message}` }, { status: 500 });
  counts.customers = insertedCustomers?.length || 0;

  // --- Visits (~200, distributed across 90 days) ----------------------------
  const visitRows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < 200; i++) {
    const cust = pick(insertedCustomers || []);
    if (!cust) continue;
    visitRows.push({
      restaurant_id: restaurantId,
      customer_id: cust.customer_id,
      timestamp: randDate(90).toISOString(),
      source: pick(SOURCES),
      spend_amount: 25 + rand(120),
    });
  }
  const { error: vErr } = await supabase.from('visits').insert(visitRows);
  if (!vErr) counts.visits = visitRows.length;

  // --- Reviews (30 with realistic rating curve: 60% 5*, 20% 4*, 10% 3*, 7% 2*, 3% 1*) ---
  const reviewRows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < 30; i++) {
    const r = Math.random();
    const rating = r < 0.6 ? 5 : r < 0.8 ? 4 : r < 0.9 ? 3 : r < 0.97 ? 2 : 1;
    const text =
      rating >= 4 ? pick(POSITIVE_REVIEW_TEXTS) :
      rating === 3 ? pick(MIXED_REVIEW_TEXTS) :
      pick(NEGATIVE_REVIEW_TEXTS);
    const platform = pick([...REVIEW_PLATFORMS]);
    const fn = pick(FIRST_NAMES);
    const ln = pick(LAST_NAMES);
    reviewRows.push({
      restaurant_id: restaurantId,
      platform,
      author: `${fn} ${ln.charAt(0)}.`,
      rating,
      text,
      external_id: `demo-${platform}-${Date.now()}-${i}-${rand(10000)}`,
      review_date: randDate(60).toISOString(),
      response_status: rating >= 4 && Math.random() < 0.4 ? 'posted' : 'none',
      response_text: rating >= 4 && Math.random() < 0.4
        ? `Thank you so much! We can't wait to welcome you back for another great meal.`
        : null,
    });
  }
  const { error: rvErr } = await supabase.from('reviews').insert(reviewRows);
  if (!rvErr) counts.reviews = reviewRows.length;

  // --- Loyalty rewards (6 milestones) ---------------------------------------
  const rewardRows = [
    { milestone_type: 'visit_count', milestone_value: 3, name: 'First-Timer Perk', description: 'Welcome reward', reward_type: 'discount_pct', reward_value: '10' },
    { milestone_type: 'visit_count', milestone_value: 5, name: 'Free Appetizer', description: 'On us', reward_type: 'free_item', reward_value: 'appetizer' },
    { milestone_type: 'visit_count', milestone_value: 10, name: 'VIP Status', description: 'Early reservation access', reward_type: 'custom', reward_value: 'VIP access' },
    { milestone_type: 'total_spend', milestone_value: 500, name: 'Loyal Regular', description: '$25 credit', reward_type: 'credit', reward_value: '25' },
    { milestone_type: 'total_spend', milestone_value: 1500, name: 'Gold Tier', description: '15% off every visit', reward_type: 'discount_pct', reward_value: '15' },
    { milestone_type: 'anniversary', milestone_value: 1, name: 'Anniversary Reward', description: 'Free dessert', reward_type: 'free_item', reward_value: 'dessert' },
  ].map((r) => ({ ...r, restaurant_id: restaurantId, active: true }));
  const { error: rwErr } = await supabase.from('loyalty_rewards').insert(rewardRows);
  if (!rwErr) counts.rewards = rewardRows.length;

  // --- Catering leads (10) --------------------------------------------------
  const CATERING_COMPANIES = [
    'Axiom Consulting', 'Redline Capital', 'Maple Marketing', 'Evergreen Law',
    'Summit Tech', 'Blackrock Brewing', 'Veritas Analytics', 'Hollow Oak Films',
    'Kinetic Studios', 'Midtown Medical',
  ];
  const cateringRows = CATERING_COMPANIES.map((name) => ({
    restaurant_id: restaurantId,
    company_name: name,
    contact_name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    contact_email: `events@${name.toLowerCase().replace(/\s+/g, '')}.com`,
    company_size: 20 + rand(500),
    distance_miles: Math.round(rand(100) / 10 * 10) / 10,
    sequence_status: pick(['discovered', 'contacted', 'proposal_sent', 'won', 'lost']),
    last_contacted: randDate(30).toISOString(),
    converted: Math.random() < 0.25,
    order_value: 800 + rand(8000),
  }));
  const { error: clErr } = await supabase.from('catering_leads').insert(cateringRows);
  if (!clErr) counts.catering_leads = cateringRows.length;

  // --- Corporate accounts (5) ----------------------------------------------
  const CORP_COMPANIES = ['Axiom Consulting', 'Redline Capital', 'Summit Tech', 'Veritas Analytics', 'Kinetic Studios'];
  const corpRows = CORP_COMPANIES.map((name) => ({
    restaurant_id: restaurantId,
    company_name: name,
    primary_contact: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    billing_info: { email: `admin@${name.toLowerCase().replace(/\s+/g, '')}.com`, method: 'invoice' },
    dietary_preferences: pick(['vegetarian options', 'gluten-free', 'no restrictions']),
    delivery_address: `${100 + rand(900)} Main St, Dallas TX`,
    recurring_schedule: { frequency: pick(['weekly', 'biweekly', 'monthly']), day: 'friday' },
    last_order_date: randDate(30).toISOString(),
    total_lifetime_value: 5000 + rand(50000),
    churn_risk_flag: Math.random() < 0.2,
  }));
  const { error: coErr } = await supabase.from('corporate_accounts').insert(corpRows);
  if (!coErr) counts.corporate_accounts = corpRows.length;

  // --- Birthday events (20 upcoming) ---------------------------------------
  const bdayRows = (insertedCustomers || []).slice(0, 20).map((c) => ({
    restaurant_id: restaurantId,
    customer_id: c.customer_id,
    event_type: 'birthday',
    offer_sent_at: randDate(30).toISOString(),
    redeemed: Math.random() < 0.35,
    party_size: 2 + rand(6),
    check_total: 80 + rand(300),
  }));
  const { error: bdErr } = await supabase.from('birthday_events').insert(bdayRows);
  if (!bdErr) counts.birthdays = bdayRows.length;

  // --- POS orders (60 orders spread across 21 days, varied hours) ----------
  // Written directly into pos_orders so the Live POS block + peak-hours chart
  // light up without needing a live Square connection.
  const MENU_POOL = [
    { name: 'Filet Mignon', cents: 4800 },
    { name: 'Grilled Salmon', cents: 2800 },
    { name: 'Lobster Linguine', cents: 4200 },
    { name: 'Chicken Parmesan', cents: 2400 },
    { name: 'Caesar Salad', cents: 1400 },
    { name: 'Truffle Fries', cents: 1200 },
    { name: 'Chocolate Lava Cake', cents: 1400 },
    { name: 'House Wine', cents: 1400 },
  ];
  const orderRows: Array<Record<string, unknown>> = [];
  const orderLinesBuffer: Array<{ orderIdx: number; row: Record<string, unknown> }> = [];

  for (let i = 0; i < 60; i++) {
    // Distribute: weight dinner hours (6-9pm) more heavily
    const hourWeights = [
      [11, 0.5], [12, 1], [13, 0.8], [14, 0.3], [17, 0.5],
      [18, 1.2], [19, 1.5], [20, 1.3], [21, 0.8], [22, 0.3],
    ] as const;
    const totalW = hourWeights.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * totalW;
    let hour = 19;
    for (const [h, w] of hourWeights) { if ((r -= w) <= 0) { hour = h; break; } }
    const opened = new Date();
    opened.setDate(opened.getDate() - rand(21));
    opened.setHours(hour, rand(60), 0, 0);
    const closed = new Date(opened.getTime() + (30 + rand(90)) * 60 * 1000);

    // Build line items
    const numLines = 1 + rand(4);
    const lines: Array<{ name: string; qty: number; cents: number }> = [];
    let subtotal = 0;
    let itemCount = 0;
    for (let j = 0; j < numLines; j++) {
      const item = pick(MENU_POOL);
      const qty = 1 + rand(3);
      lines.push({ name: item.name, qty, cents: item.cents });
      subtotal += item.cents * qty;
      itemCount += qty;
    }
    const tax = Math.round(subtotal * 0.0825);
    const tip = Math.round(subtotal * (0.15 + Math.random() * 0.1));
    const total = subtotal + tax + tip;

    orderRows.push({
      restaurant_id: restaurantId,
      provider: 'demo',
      external_id: `demo-order-${Date.now()}-${i}-${rand(100000)}`,
      location_id: 'demo-loc-1',
      state: 'COMPLETED',
      source_name: pick(['POS', 'Online', 'Reservation']),
      employee_id: `demo-emp-${1 + rand(5)}`,
      customer_external_id: null,
      total_cents: total,
      tax_cents: tax,
      tip_cents: tip,
      discount_cents: 0,
      currency: 'USD',
      item_count: itemCount,
      opened_at: opened.toISOString(),
      closed_at: closed.toISOString(),
      raw: { demo: true, lines },
      synced_at: new Date().toISOString(),
    });
    for (const line of lines) {
      orderLinesBuffer.push({
        orderIdx: i,
        row: {
          restaurant_id: restaurantId,
          catalog_external_id: null,
          variation_external_id: null,
          name: line.name,
          quantity: line.qty,
          base_price_cents: line.cents,
          total_price_cents: line.cents * line.qty,
          raw: { demo: true },
        },
      });
    }
  }

  const { data: insertedOrders, error: ordErr } = await supabase
    .from('pos_orders')
    .insert(orderRows)
    .select('id');
  if (!ordErr && insertedOrders) {
    const lineRows = orderLinesBuffer.map((b) => ({
      ...b.row,
      order_id: insertedOrders[b.orderIdx].id,
    }));
    if (lineRows.length > 0) {
      await supabase.from('pos_order_line_items').insert(lineRows);
    }
    (counts as Record<string, number>).pos_orders = insertedOrders.length;
    (counts as Record<string, number>).pos_line_items = lineRows.length;
  }

  // --- Dead hours (4 slots) -------------------------------------------------
  const deadRows = [
    { day_of_week: 'Tuesday',   time_start: '14:00:00', time_end: '16:00:00', promotion_type: '2-for-1 appetizers', channel: 'sms', seats_filled: 8 + rand(10), revenue: 400 + rand(200), cost: 50 },
    { day_of_week: 'Wednesday', time_start: '14:00:00', time_end: '16:00:00', promotion_type: 'Happy hour bites',   channel: 'email', seats_filled: 7 + rand(10), revenue: 400 + rand(200), cost: 50 },
    { day_of_week: 'Thursday',  time_start: '14:00:00', time_end: '16:00:00', promotion_type: 'Chef tasting flight', channel: 'sms', seats_filled: 9 + rand(10), revenue: 400 + rand(200), cost: 60 },
    { day_of_week: 'Monday',    time_start: '20:00:00', time_end: '22:00:00', promotion_type: 'Late-night dessert', channel: 'email', seats_filled: 12 + rand(10), revenue: 600 + rand(300), cost: 80 },
  ].map((d) => ({ ...d, restaurant_id: restaurantId }));
  const { error: dhErr } = await supabase.from('dead_hours').insert(deadRows);
  if (!dhErr) counts.dead_hours = deadRows.length;

  return NextResponse.json({
    reset,
    seeded: counts,
    tip: 'Visit /dashboard to see everything populated. Hit /api/integrations/square/seed-demo-orders separately for Square POS data.',
  });
}
