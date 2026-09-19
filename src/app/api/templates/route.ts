import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// ── System Templates (seeded on first GET if DB is empty) ──────────

const SYSTEM_TEMPLATES = [
  // Retention
  { name: 'We Miss You!', category: 'retention', channel: 'sms', body: 'Hey {first_name}, we miss you at {restaurant_name}! Come back this week and enjoy 15% off your next meal. Show this text to redeem. {offer_code}', variables: ['first_name', 'restaurant_name', 'offer_code'] },
  { name: 'Loyalty Reminder', category: 'retention', channel: 'email', subject: "You're almost there, {first_name}!", body: "Hi {first_name},\n\nYou've visited {restaurant_name} {visit_count} times — just a few more visits until your next reward!\n\nWe'd love to see you again soon.\n\nBest,\n{restaurant_name}", variables: ['first_name', 'restaurant_name', 'visit_count'] },
  { name: 'Quick Check-In', category: 'retention', channel: 'sms', body: "Hi {first_name}! It's been a while since your last visit to {restaurant_name}. We have new menu items we think you'll love! {offer_code}", variables: ['first_name', 'restaurant_name', 'offer_code'] },

  // Birthday
  { name: 'Happy Birthday!', category: 'birthday', channel: 'sms', body: 'Happy Birthday, {first_name}! 🎂 Celebrate with us at {restaurant_name} and enjoy a FREE dessert! Valid this week. {offer_code}', variables: ['first_name', 'restaurant_name', 'offer_code'] },
  { name: 'Birthday Email', category: 'birthday', channel: 'email', subject: 'Happy Birthday, {first_name}! A gift from {restaurant_name}', body: "Dear {first_name},\n\nHappy Birthday from all of us at {restaurant_name}! 🎉\n\nTo celebrate your special day, we'd love to treat you to a complimentary dessert when you dine with us this week.\n\nJust show this email or use code: {offer_code}\n\nWarm wishes,\n{restaurant_name}", variables: ['first_name', 'restaurant_name', 'offer_code'] },

  // Review Request
  { name: 'How Was Your Visit?', category: 'review_request', channel: 'sms', body: 'Hi {first_name}, thanks for dining at {restaurant_name}! We\'d love your feedback. Leave a quick review: {review_link}', variables: ['first_name', 'restaurant_name', 'review_link'] },
  { name: 'Review Follow-Up', category: 'review_request', channel: 'email', subject: 'How was your experience at {restaurant_name}?', body: "Hi {first_name},\n\nThank you for visiting {restaurant_name}! Your opinion matters to us.\n\nWould you mind taking a moment to share your experience? It helps other food lovers discover us.\n\n{review_link}\n\nThank you!\n{restaurant_name}", variables: ['first_name', 'restaurant_name', 'review_link'] },

  // Welcome
  { name: 'Thanks for Joining!', category: 'welcome', channel: 'sms', body: 'Welcome to {restaurant_name}, {first_name}! Thanks for joining. Show this text on your next visit for 10% off! {offer_code}', variables: ['first_name', 'restaurant_name', 'offer_code'] },
  { name: 'Welcome Email', category: 'welcome', channel: 'email', subject: 'Welcome to the {restaurant_name} family!', body: "Hi {first_name},\n\nWelcome to {restaurant_name}! We're thrilled to have you.\n\nAs a thank you for joining, here's a special offer for your next visit: {offer_code}\n\nWe look forward to seeing you again soon!\n\nCheers,\n{restaurant_name}", variables: ['first_name', 'restaurant_name', 'offer_code'] },

  // Dead Hours
  { name: 'Flash Deal', category: 'dead_hours', channel: 'sms', body: '🔥 Limited time! {restaurant_name} has a special deal right now: 20% off all orders. Ends in 2 hours! {offer_code}', variables: ['restaurant_name', 'offer_code'] },
  { name: 'Happy Hour Alert', category: 'dead_hours', channel: 'sms', body: 'Hey {first_name}! Happy Hour at {restaurant_name} is on NOW. Enjoy special pricing until 5pm. Bring a friend! {offer_code}', variables: ['first_name', 'restaurant_name', 'offer_code'] },

  // Catering
  { name: 'Catering Introduction', category: 'catering', channel: 'email', subject: 'Catering for your team from {restaurant_name}', body: "Hi {first_name},\n\nDoes your team need great food for meetings, events, or just because? {restaurant_name} offers hassle-free catering with customizable menus.\n\nWe'd love to put together a menu for your next event. Reply to get started!\n\nBest,\n{restaurant_name}", variables: ['first_name', 'restaurant_name'] },

  // Win-Back
  { name: 'Come Back Offer', category: 'win_back', channel: 'sms', body: "Hey {first_name}, it's been too long! Here's 20% off your next meal at {restaurant_name}. We'd love to welcome you back. {offer_code}", variables: ['first_name', 'restaurant_name', 'offer_code'] },
  { name: 'Win-Back Email', category: 'win_back', channel: 'email', subject: "We miss you, {first_name}!", body: "Hi {first_name},\n\nIt's been a while since we've seen you at {restaurant_name}, and we miss you!\n\nAs a special incentive, here's an exclusive offer just for you: {offer_code}\n\nWe've been busy updating our menu and we think you'll love what's new.\n\nHope to see you soon,\n{restaurant_name}", variables: ['first_name', 'restaurant_name', 'offer_code'] },

  // Referral
  { name: 'Refer a Friend', category: 'referral', channel: 'sms', body: 'Love {restaurant_name}? Share the love! Give a friend {offer_code} for 15% off, and you\'ll get 15% off too when they visit!', variables: ['restaurant_name', 'offer_code'] },
];

// ── Helper: get restaurant from auth ───────────────────────────────

async function getRestaurant(userId: string) {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from('restaurants')
    .select('restaurant_id, brand_voice')
    .eq('clerk_user_id', userId)
    .single();
  return data;
}

// ── GET — list templates (restaurant + system) ─────────────────────

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const restaurant = await getRestaurant(userId);
  if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });

  const supabase = createServerSupabase();
  const restaurantId = restaurant.restaurant_id;

  // Fetch all templates belonging to this restaurant OR system-wide
  const { data: templates, error } = await supabase
    .from('message_templates')
    .select('*')
    .or(`restaurant_id.eq.${restaurantId},and(is_system.eq.true,restaurant_id.is.null)`)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let all = templates ?? [];

  // Seed system templates if none exist in DB yet
  if (all.length === 0) {
    const toInsert = SYSTEM_TEMPLATES.map((t) => ({
      ...t,
      restaurant_id: null,
      is_system: true,
      usage_count: 0,
    }));

    const { data: inserted, error: seedError } = await supabase
      .from('message_templates')
      .insert(toInsert)
      .select('*');

    if (seedError) return NextResponse.json({ error: seedError.message }, { status: 500 });
    all = inserted ?? [];
  }

  // Group by category
  const grouped: Record<string, typeof all> = {};
  for (const t of all) {
    const cat = t.category || 'custom';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(t);
  }

  return NextResponse.json({ templates: all, grouped });
}

// ── POST — create custom template ──────────────────────────────────

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const restaurant = await getRestaurant(userId);
  if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });

  const body = await request.json();
  const { name, category, channel, subject, body: templateBody, variables } = body;

  if (!name || !category || !templateBody) {
    return NextResponse.json({ error: 'name, category, and body are required' }, { status: 400 });
  }

  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from('message_templates')
    .insert({
      restaurant_id: restaurant.restaurant_id,
      name,
      category,
      channel: channel ?? 'sms',
      subject: subject ?? null,
      body: templateBody,
      variables: variables ?? [],
      is_system: false,
      usage_count: 0,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ template: data }, { status: 201 });
}

// ── PUT — update a template ────────────────────────────────────────

export async function PUT(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const restaurant = await getRestaurant(userId);
  if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });

  const body = await request.json();
  const { id, ...fields } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  // Only allow updating own templates (not system)
  const supabase = createServerSupabase();

  const updates: Record<string, unknown> = {};
  for (const key of ['name', 'category', 'channel', 'subject', 'body', 'variables']) {
    if (fields[key] !== undefined) updates[key] = fields[key];
  }

  const { data, error } = await supabase
    .from('message_templates')
    .update(updates)
    .eq('id', id)
    .eq('restaurant_id', restaurant.restaurant_id) // ownership check — system templates have null restaurant_id so they won't match
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ template: data });
}

// ── DELETE — remove a non-system template ──────────────────────────

export async function DELETE(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const restaurant = await getRestaurant(userId);
  if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });

  const body = await request.json();
  const { id } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const supabase = createServerSupabase();

  // Only delete non-system templates belonging to this restaurant
  const { error } = await supabase
    .from('message_templates')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', restaurant.restaurant_id)
    .eq('is_system', false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
