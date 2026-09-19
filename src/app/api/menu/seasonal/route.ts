import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

interface FeaturedItem {
  name: string;
  description: string;
  price: number;
  ingredients: string[];
  seasonal_ingredient: string;
}

interface SeasonalPlan {
  id: string;
  season: string;
  date_range: { start: string; end: string };
  theme: string;
  featured_items: FeaturedItem[];
  status: 'draft' | 'active' | 'archived';
  created_at: string;
}

function getMockPlans(): SeasonalPlan[] {
  return [
    {
      id: 'sp-spring-2026',
      season: 'Spring',
      date_range: { start: '2026-03-20', end: '2026-06-20' },
      theme: 'Garden Fresh Revival',
      featured_items: [
        {
          name: 'Spring Pea Risotto',
          description: 'Creamy arborio rice with fresh spring peas, mint, and shaved parmesan',
          price: 24.0,
          ingredients: ['arborio rice', 'spring peas', 'mint', 'parmesan', 'shallots', 'white wine'],
          seasonal_ingredient: 'spring peas',
        },
        {
          name: 'Grilled Lamb Chops',
          description: 'Herb-crusted lamb with ramp chimichurri and roasted fingerlings',
          price: 38.0,
          ingredients: ['lamb chops', 'ramps', 'herbs', 'fingerling potatoes', 'olive oil'],
          seasonal_ingredient: 'ramps',
        },
        {
          name: 'Strawberry Basil Panna Cotta',
          description: 'Vanilla bean panna cotta with macerated strawberries and basil syrup',
          price: 14.0,
          ingredients: ['cream', 'vanilla bean', 'strawberries', 'basil', 'gelatin'],
          seasonal_ingredient: 'strawberries',
        },
      ],
      status: 'active',
      created_at: '2026-02-15T10:00:00Z',
    },
    {
      id: 'sp-summer-2026',
      season: 'Summer',
      date_range: { start: '2026-06-21', end: '2026-09-22' },
      theme: 'Sun-Kissed & Grilled',
      featured_items: [
        {
          name: 'Heirloom Tomato Salad',
          description: 'Mixed heirloom tomatoes with burrata, basil oil, and balsamic reduction',
          price: 18.0,
          ingredients: ['heirloom tomatoes', 'burrata', 'basil', 'balsamic', 'olive oil'],
          seasonal_ingredient: 'heirloom tomatoes',
        },
        {
          name: 'Grilled Peach & Prosciutto Flatbread',
          description: 'Wood-fired flatbread with grilled peaches, prosciutto, and arugula',
          price: 22.0,
          ingredients: ['flatbread dough', 'peaches', 'prosciutto', 'arugula', 'goat cheese'],
          seasonal_ingredient: 'peaches',
        },
        {
          name: 'Corn & Crab Chowder',
          description: 'Sweet corn bisque with lump crab, chive oil, and sourdough croutons',
          price: 16.0,
          ingredients: ['sweet corn', 'lump crab', 'cream', 'chives', 'sourdough'],
          seasonal_ingredient: 'sweet corn',
        },
      ],
      status: 'draft',
      created_at: '2026-03-20T14:00:00Z',
    },
    {
      id: 'sp-fall-2025',
      season: 'Fall',
      date_range: { start: '2025-09-23', end: '2025-12-20' },
      theme: 'Harvest Table',
      featured_items: [
        {
          name: 'Butternut Squash Soup',
          description: 'Roasted butternut squash with sage brown butter and pepitas',
          price: 14.0,
          ingredients: ['butternut squash', 'sage', 'butter', 'pepitas', 'cream'],
          seasonal_ingredient: 'butternut squash',
        },
        {
          name: 'Braised Short Ribs',
          description: 'Red wine braised short ribs with root vegetable mash and gremolata',
          price: 36.0,
          ingredients: ['short ribs', 'red wine', 'root vegetables', 'parsley', 'garlic'],
          seasonal_ingredient: 'root vegetables',
        },
        {
          name: 'Apple Tarte Tatin',
          description: 'Caramelized apple tart with vanilla ice cream and cinnamon tuile',
          price: 15.0,
          ingredients: ['apples', 'puff pastry', 'butter', 'sugar', 'cinnamon', 'vanilla'],
          seasonal_ingredient: 'apples',
        },
      ],
      status: 'archived',
      created_at: '2025-08-10T09:00:00Z',
    },
    {
      id: 'sp-winter-2025',
      season: 'Winter',
      date_range: { start: '2025-12-21', end: '2026-03-19' },
      theme: 'Comfort & Warmth',
      featured_items: [
        {
          name: 'Truffle Mushroom Pasta',
          description: 'House-made pappardelle with wild mushrooms, truffle cream, and thyme',
          price: 28.0,
          ingredients: ['pappardelle', 'wild mushrooms', 'truffle oil', 'cream', 'thyme'],
          seasonal_ingredient: 'wild mushrooms',
        },
        {
          name: 'Duck Confit',
          description: 'Slow-cooked duck leg with citrus glaze, braised lentils, and fennel',
          price: 34.0,
          ingredients: ['duck leg', 'oranges', 'lentils', 'fennel', 'duck fat'],
          seasonal_ingredient: 'citrus',
        },
        {
          name: 'Chocolate Fondant',
          description: 'Warm dark chocolate cake with blood orange sorbet and candied zest',
          price: 16.0,
          ingredients: ['dark chocolate', 'butter', 'eggs', 'blood oranges', 'sugar'],
          seasonal_ingredient: 'blood oranges',
        },
      ],
      status: 'archived',
      created_at: '2025-11-01T11:00:00Z',
    },
  ];
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

  const plans = getMockPlans();

  const activePlans = plans.filter((p) => p.status === 'active');
  const allItems = plans.flatMap((p) => p.featured_items);
  const avgPrice =
    allItems.length > 0
      ? allItems.reduce((sum, item) => sum + item.price, 0) / allItems.length
      : 0;

  const now = new Date();
  const upcoming = plans.find((p) => new Date(p.date_range.start) > now);

  return NextResponse.json({
    plans,
    stats: {
      active_seasons: activePlans.length,
      total_seasonal_items: allItems.length,
      avg_seasonal_price: Math.round(avgPrice * 100) / 100,
      upcoming_season: upcoming?.season || null,
    },
  });
}

export async function POST(request: NextRequest) {
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
  const { season, date_range, theme, featured_items } = body;

  if (!season || !date_range || !theme) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const newPlan: SeasonalPlan = {
    id: `sp-${season.toLowerCase()}-${Date.now()}`,
    season,
    date_range,
    theme,
    featured_items: featured_items || [],
    status: 'draft',
    created_at: new Date().toISOString(),
  };

  return NextResponse.json({ plan: newPlan });
}

export async function PUT(request: NextRequest) {
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
  const { id, status } = body;

  if (!id || !status) {
    return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
  }

  if (!['draft', 'active', 'archived'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  return NextResponse.json({ success: true, id, status });
}
