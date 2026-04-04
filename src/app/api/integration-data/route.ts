import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

const PROVIDER_DISPLAY: Record<string, string> = {
  doordash: 'DoorDash',
  uber_eats: 'Uber Eats',
  grubhub: 'Grubhub',
  postmates: 'Postmates',
  caviar: 'Caviar',
  chownow: 'ChowNow',
  toast_takeout: 'Toast Takeout',
  olo: 'Olo',
  toast_pos: 'Toast POS',
  square: 'Square',
  clover: 'Clover',
  lightspeed: 'Lightspeed',
  revel: 'Revel',
  aloha_ncr: 'Aloha NCR',
  klaviyo: 'Klaviyo',
  hubspot: 'HubSpot',
  mailchimp: 'Mailchimp',
  google_business: 'Google Business',
  yelp: 'Yelp',
  tripadvisor: 'TripAdvisor',
  wifi_analytics: 'WiFi Analytics',
};

const DELIVERY_PROVIDERS = ['doordash', 'uber_eats', 'grubhub', 'postmates', 'caviar', 'chownow', 'toast_takeout', 'olo'];
const POS_PROVIDERS = ['toast_pos', 'square', 'clover', 'lightspeed', 'revel', 'aloha_ncr'];
const CRM_PROVIDERS = ['klaviyo', 'hubspot', 'mailchimp'];
const REVIEW_PROVIDERS = ['google_business', 'yelp', 'tripadvisor'];

// Deterministic seed from provider string
function seed(provider: string): number {
  return provider.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
}

function generateDeliveryData(provider: string) {
  const s = seed(provider);
  const orders = 80 + (s % 120);
  const aov = 22 + (s % 15);
  const revenue = orders * aov;
  const rating = parseFloat((4.0 + (s % 10) / 10).toFixed(1));
  const trend = parseFloat(((-5 + (s % 20)) / 2).toFixed(1));
  return {
    provider,
    name: PROVIDER_DISPLAY[provider] || provider,
    orders,
    revenue,
    avg_order_value: aov,
    rating,
    trend,
  };
}

const TOP_DELIVERY_ITEMS = [
  { name: 'Crispy Chicken Sandwich', orders: 142, revenue: 2130 },
  { name: 'Classic Burger Combo', orders: 118, revenue: 2006 },
  { name: 'Loaded Nachos', orders: 96, revenue: 1152 },
  { name: 'Caesar Salad', orders: 84, revenue: 924 },
  { name: 'BBQ Wings (12pc)', orders: 78, revenue: 1248 },
];

function generatePosData(provider: string) {
  const s = seed(provider);
  return {
    daily_revenue: 2800 + (s % 1200),
    transactions: 120 + (s % 80),
    avg_ticket: 18 + (s % 12),
    labor_cost_pct: parseFloat((24 + (s % 8)).toFixed(1)),
    top_items: [
      { name: 'Grilled Salmon', quantity: 34, revenue: 918 },
      { name: 'Margherita Pizza', quantity: 48, revenue: 768 },
      { name: 'Steak Frites', quantity: 22, revenue: 726 },
      { name: 'Fish Tacos', quantity: 38, revenue: 570 },
      { name: 'House Salad', quantity: 52, revenue: 468 },
    ],
  };
}

function generateCrmData(providers: string[]) {
  const s = providers.reduce((acc, p) => acc + seed(p), 0);
  return {
    total_contacts: 1200 + (s % 800),
    email_subscribers: 800 + (s % 600),
    sms_subscribers: 300 + (s % 400),
    campaigns_active: 2 + (s % 4),
    open_rate: parseFloat((18 + (s % 20)).toFixed(1)),
    click_rate: parseFloat((2 + (s % 6)).toFixed(1)),
  };
}

function generateReviewData(provider: string) {
  const s = seed(provider);
  return {
    provider,
    name: PROVIDER_DISPLAY[provider] || provider,
    rating: parseFloat((3.8 + (s % 12) / 10).toFixed(1)),
    count: 80 + (s % 200),
  };
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

  const { data: integrations } = await supabase
    .from('integration_configs')
    .select('provider, status')
    .eq('entity_id', restaurant.restaurant_id)
    .eq('entity_type', 'restaurant');

  const connected = (integrations || []).filter(i => i.status === 'connected').map(i => i.provider);

  const connectedDelivery = connected.filter(p => DELIVERY_PROVIDERS.includes(p));
  const connectedPos = connected.filter(p => POS_PROVIDERS.includes(p));
  const connectedCrm = connected.filter(p => CRM_PROVIDERS.includes(p));
  const connectedReviews = connected.filter(p => REVIEW_PROVIDERS.includes(p));

  // Delivery data
  const deliveryPlatforms = connectedDelivery.map(generateDeliveryData);
  const totalOrders = deliveryPlatforms.reduce((sum, p) => sum + p.orders, 0);
  const totalDeliveryRevenue = deliveryPlatforms.reduce((sum, p) => sum + p.revenue, 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalDeliveryRevenue / totalOrders) : 0;
  const avgRating = deliveryPlatforms.length > 0
    ? parseFloat((deliveryPlatforms.reduce((sum, p) => sum + p.rating, 0) / deliveryPlatforms.length).toFixed(1))
    : 0;

  const delivery = {
    total_orders: totalOrders,
    total_revenue: totalDeliveryRevenue,
    avg_order_value: avgOrderValue,
    avg_rating: avgRating,
    platforms: deliveryPlatforms,
    top_items: connectedDelivery.length > 0 ? TOP_DELIVERY_ITEMS : [],
  };

  // POS data - use first connected POS
  const posProvider = connectedPos[0];
  const pos = posProvider
    ? generatePosData(posProvider)
    : { daily_revenue: 0, transactions: 0, avg_ticket: 0, labor_cost_pct: 0, top_items: [] };

  // CRM data
  const crm = connectedCrm.length > 0
    ? generateCrmData(connectedCrm)
    : { total_contacts: 0, email_subscribers: 0, sms_subscribers: 0, campaigns_active: 0, open_rate: 0, click_rate: 0 };

  // Reviews data
  const reviewPlatforms = connectedReviews.map(generateReviewData);
  const totalReviewCount = reviewPlatforms.reduce((sum, p) => sum + p.count, 0);
  const reviewAvgRating = reviewPlatforms.length > 0
    ? parseFloat((reviewPlatforms.reduce((sum, p) => sum + p.rating * p.count, 0) / totalReviewCount).toFixed(1))
    : 0;

  const reviews = {
    avg_rating: reviewAvgRating,
    total_reviews: totalReviewCount,
    new_this_week: connectedReviews.length > 0 ? 8 + (seed(connectedReviews[0]) % 12) : 0,
    platforms: reviewPlatforms,
    sentiment: connectedReviews.length > 0
      ? { positive: 72, neutral: 18, negative: 10 }
      : { positive: 0, neutral: 0, negative: 0 },
  };

  return NextResponse.json({
    delivery,
    pos,
    crm,
    reviews,
    connected_providers: connected.map(p => PROVIDER_DISPLAY[p] || p),
  });
}
