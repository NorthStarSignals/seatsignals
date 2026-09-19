import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface WeatherRule {
  id: string;
  restaurant_id: string;
  condition: 'rain' | 'snow' | 'heat' | 'cold' | 'sunny' | 'storm';
  threshold_temp: number | null;
  promotion_type: 'discount' | 'bogo' | 'free_item';
  message: string;
  auto_send: boolean;
  channel: 'sms' | 'email';
  enabled: boolean;
  created_at: string;
  triggered_count: number;
  last_triggered: string | null;
}

interface WeatherCondition {
  temperature: number;
  condition: 'sunny' | 'rainy' | 'snowy' | 'hot' | 'cold' | 'cloudy' | 'stormy';
  humidity: number;
  wind_mph: number;
  icon: string;
  description: string;
}

interface SuggestedPromotion {
  condition: string;
  title: string;
  message: string;
  promotion_type: 'discount' | 'bogo' | 'free_item';
  expected_lift: number;
}

interface WeatherCorrelation {
  condition: string;
  avg_revenue: number;
  revenue_change_pct: number;
  avg_covers: number;
  sample_days: number;
}

interface TriggerHistory {
  id: string;
  rule_id: string;
  condition: string;
  message: string;
  channel: string;
  sent_at: string;
  customers_reached: number;
  redemptions: number;
}

/* ------------------------------------------------------------------ */
/*  Mock data generators                                               */
/* ------------------------------------------------------------------ */

function getMockWeather(): WeatherCondition {
  const conditions: WeatherCondition[] = [
    { temperature: 42, condition: 'rainy', humidity: 85, wind_mph: 12, icon: '🌧️', description: 'Light rain showers' },
    { temperature: 78, condition: 'sunny', humidity: 45, wind_mph: 5, icon: '☀️', description: 'Clear skies' },
    { temperature: 92, condition: 'hot', humidity: 70, wind_mph: 3, icon: '🌤️', description: 'Hot and humid' },
    { temperature: 28, condition: 'snowy', humidity: 60, wind_mph: 15, icon: '❄️', description: 'Light snow' },
    { temperature: 35, condition: 'cold', humidity: 50, wind_mph: 20, icon: '🌤️', description: 'Cold and windy' },
    { temperature: 65, condition: 'cloudy', humidity: 55, wind_mph: 8, icon: '☁️', description: 'Overcast' },
    { temperature: 55, condition: 'stormy', humidity: 90, wind_mph: 25, icon: '⛈️', description: 'Thunderstorms expected' },
  ];
  // Use hour-based seed for consistency within same hour
  const hourSeed = Math.floor(Date.now() / 3600000) % conditions.length;
  return conditions[hourSeed];
}

function getSuggestedPromotions(weather: WeatherCondition): SuggestedPromotion[] {
  const suggestions: SuggestedPromotion[] = [];

  if (weather.condition === 'rainy' || weather.condition === 'stormy') {
    suggestions.push(
      { condition: weather.condition, title: 'Rainy Day Comfort Menu', message: 'Warm up with our comfort specials — hot soup & fresh bread 20% off!', promotion_type: 'discount', expected_lift: 15 },
      { condition: weather.condition, title: 'Free Delivery Push', message: 'Too wet to go out? Free delivery on orders over $30!', promotion_type: 'free_item', expected_lift: 22 }
    );
  }

  if (weather.condition === 'hot' || weather.temperature > 85) {
    suggestions.push(
      { condition: 'hot', title: 'Beat the Heat', message: 'Cool off with BOGO iced drinks & frozen desserts!', promotion_type: 'bogo', expected_lift: 18 },
      { condition: 'hot', title: 'Happy Hour Extension', message: 'Too hot outside? Extended happy hour 2-6PM with 25% off cold drinks!', promotion_type: 'discount', expected_lift: 12 }
    );
  }

  if (weather.condition === 'cold' || weather.condition === 'snowy' || weather.temperature < 35) {
    suggestions.push(
      { condition: 'cold', title: 'Warm Up Special', message: 'Hot soup, coffee, and comfort food — buy one, get one free!', promotion_type: 'bogo', expected_lift: 20 },
      { condition: 'cold', title: 'Snow Day Deal', message: 'Brave the cold? Get a free hot drink with any entree!', promotion_type: 'free_item', expected_lift: 16 }
    );
  }

  if (weather.condition === 'sunny') {
    suggestions.push(
      { condition: 'sunny', title: 'Patio Season', message: 'Beautiful day for outdoor dining! 15% off patio orders.', promotion_type: 'discount', expected_lift: 10 },
      { condition: 'sunny', title: 'Sunshine Brunch', message: 'Enjoy the sun with our brunch BOGO — bring a friend, their meal is on us!', promotion_type: 'bogo', expected_lift: 14 }
    );
  }

  // Always include a general suggestion
  if (suggestions.length === 0) {
    suggestions.push(
      { condition: weather.condition, title: 'Daily Special', message: 'Today only — 10% off your entire order!', promotion_type: 'discount', expected_lift: 8 }
    );
  }

  return suggestions;
}

function getMockCorrelations(): WeatherCorrelation[] {
  return [
    { condition: 'Sunny', avg_revenue: 4850, revenue_change_pct: 12, avg_covers: 145, sample_days: 42 },
    { condition: 'Cloudy', avg_revenue: 4200, revenue_change_pct: -3, avg_covers: 128, sample_days: 38 },
    { condition: 'Rainy', avg_revenue: 3600, revenue_change_pct: -17, avg_covers: 98, sample_days: 25 },
    { condition: 'Hot', avg_revenue: 4100, revenue_change_pct: -5, avg_covers: 120, sample_days: 18 },
    { condition: 'Cold', avg_revenue: 3900, revenue_change_pct: -10, avg_covers: 110, sample_days: 22 },
    { condition: 'Snowy', avg_revenue: 3200, revenue_change_pct: -26, avg_covers: 78, sample_days: 8 },
    { condition: 'Stormy', avg_revenue: 2800, revenue_change_pct: -35, avg_covers: 65, sample_days: 5 },
  ];
}

function getMockRules(restaurantId: string): WeatherRule[] {
  return [
    {
      id: 'wr_1', restaurant_id: restaurantId, condition: 'rain',
      threshold_temp: null, promotion_type: 'discount', message: 'Rainy day? Warm up with 20% off soups & stews!',
      auto_send: true, channel: 'sms', enabled: true,
      created_at: '2026-03-15T10:00:00Z', triggered_count: 12, last_triggered: '2026-04-05T14:30:00Z',
    },
    {
      id: 'wr_2', restaurant_id: restaurantId, condition: 'heat',
      threshold_temp: 90, promotion_type: 'bogo', message: 'Beat the heat — BOGO iced drinks all day!',
      auto_send: true, channel: 'sms', enabled: true,
      created_at: '2026-03-20T10:00:00Z', triggered_count: 5, last_triggered: '2026-04-02T11:00:00Z',
    },
    {
      id: 'wr_3', restaurant_id: restaurantId, condition: 'snow',
      threshold_temp: 32, promotion_type: 'free_item', message: 'Snow day! Free hot cocoa with any entree.',
      auto_send: false, channel: 'email', enabled: false,
      created_at: '2026-03-25T10:00:00Z', triggered_count: 2, last_triggered: '2026-03-28T09:00:00Z',
    },
    {
      id: 'wr_4', restaurant_id: restaurantId, condition: 'sunny',
      threshold_temp: null, promotion_type: 'discount', message: 'Gorgeous day! 15% off patio dining.',
      auto_send: true, channel: 'email', enabled: true,
      created_at: '2026-04-01T10:00:00Z', triggered_count: 8, last_triggered: '2026-04-06T10:00:00Z',
    },
  ];
}

function getMockTriggerHistory(): TriggerHistory[] {
  return [
    { id: 'th_1', rule_id: 'wr_1', condition: 'rain', message: 'Rainy day? Warm up with 20% off soups & stews!', channel: 'sms', sent_at: '2026-04-05T14:30:00Z', customers_reached: 342, redemptions: 28 },
    { id: 'th_2', rule_id: 'wr_4', condition: 'sunny', message: 'Gorgeous day! 15% off patio dining.', channel: 'email', sent_at: '2026-04-06T10:00:00Z', customers_reached: 1205, redemptions: 67 },
    { id: 'th_3', rule_id: 'wr_2', condition: 'heat', message: 'Beat the heat — BOGO iced drinks all day!', channel: 'sms', sent_at: '2026-04-02T11:00:00Z', customers_reached: 415, redemptions: 52 },
    { id: 'th_4', rule_id: 'wr_1', condition: 'rain', message: 'Rainy day? Warm up with 20% off soups & stews!', channel: 'sms', sent_at: '2026-04-01T09:15:00Z', customers_reached: 338, redemptions: 31 },
    { id: 'th_5', rule_id: 'wr_3', condition: 'snow', message: 'Snow day! Free hot cocoa with any entree.', channel: 'email', sent_at: '2026-03-28T09:00:00Z', customers_reached: 1180, redemptions: 45 },
  ];
}

/* ------------------------------------------------------------------ */
/*  GET — Current weather + suggestions + correlations + rules         */
/* ------------------------------------------------------------------ */

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

  const weather = getMockWeather();
  const suggestions = getSuggestedPromotions(weather);
  const correlations = getMockCorrelations();
  const rules = getMockRules(restaurant.restaurant_id);
  const triggerHistory = getMockTriggerHistory();

  const activeRules = rules.filter((r) => r.enabled);
  const triggeredToday = triggerHistory.filter((t) => {
    const sent = new Date(t.sent_at);
    const today = new Date();
    return sent.toDateString() === today.toDateString();
  });

  // Calculate predicted revenue impact based on current weather
  const matchingCorrelation = correlations.find(
    (c) => c.condition.toLowerCase() === weather.condition
  );
  const forecastImpact = matchingCorrelation ? matchingCorrelation.revenue_change_pct : 0;

  // Weather revenue lift from promotions
  const totalRedemptions = triggerHistory.reduce((sum, t) => sum + t.redemptions, 0);
  const avgRedemptions = triggerHistory.length > 0 ? Math.round(totalRedemptions / triggerHistory.length) : 0;

  return NextResponse.json({
    weather,
    suggestions,
    correlations,
    rules,
    trigger_history: triggerHistory,
    stats: {
      forecast_impact: forecastImpact,
      active_rules: activeRules.length,
      triggered_today: triggeredToday.length,
      weather_revenue_lift: avgRedemptions * 18, // ~$18 avg order value per redemption
    },
  });
}

/* ------------------------------------------------------------------ */
/*  POST — Create a new weather rule                                   */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await req.json();
  const { condition, threshold_temp, promotion_type, message, auto_send, channel } = body;

  if (!condition || !promotion_type || !message || !channel) {
    return NextResponse.json(
      { error: 'Missing required fields: condition, promotion_type, message, channel' },
      { status: 400 }
    );
  }

  const validConditions = ['rain', 'snow', 'heat', 'cold', 'sunny', 'storm'];
  if (!validConditions.includes(condition)) {
    return NextResponse.json({ error: 'Invalid condition' }, { status: 400 });
  }

  const validPromotionTypes = ['discount', 'bogo', 'free_item'];
  if (!validPromotionTypes.includes(promotion_type)) {
    return NextResponse.json({ error: 'Invalid promotion_type' }, { status: 400 });
  }

  const validChannels = ['sms', 'email'];
  if (!validChannels.includes(channel)) {
    return NextResponse.json({ error: 'Invalid channel' }, { status: 400 });
  }

  // Mock: return the created rule
  const newRule: WeatherRule = {
    id: `wr_${Date.now()}`,
    restaurant_id: restaurant.restaurant_id,
    condition,
    threshold_temp: threshold_temp ?? null,
    promotion_type,
    message,
    auto_send: auto_send ?? false,
    channel,
    enabled: true,
    created_at: new Date().toISOString(),
    triggered_count: 0,
    last_triggered: null,
  };

  return NextResponse.json(newRule, { status: 201 });
}

/* ------------------------------------------------------------------ */
/*  PUT — Update a weather rule                                        */
/* ------------------------------------------------------------------ */

export async function PUT(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing rule id' }, { status: 400 });
  }

  // Mock: return the updated rule
  const updatedRule = {
    id,
    restaurant_id: restaurant.restaurant_id,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  return NextResponse.json(updatedRule);
}

/* ------------------------------------------------------------------ */
/*  DELETE — Remove a weather rule                                     */
/* ------------------------------------------------------------------ */

export async function DELETE(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing rule id' }, { status: 400 });
  }

  return NextResponse.json({ deleted: true, id });
}
