import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

async function getRestaurant(supabase: ReturnType<typeof createServerSupabase>, userId: string) {
  const { data } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();
  return data;
}

interface TierConfig {
  name: string;
  min_spend: number;
  min_visits: number;
  color: string;
  perks: string[];
}

const TIERS: TierConfig[] = [
  { name: 'Diamond', min_spend: 5000, min_visits: 50, color: '#06b6d4', perks: ['20% off all orders', 'Priority reservations', 'Exclusive events', 'Free birthday dinner'] },
  { name: 'Gold', min_spend: 2000, min_visits: 25, color: '#f59e0b', perks: ['15% off all orders', 'Priority reservations', 'Seasonal specials'] },
  { name: 'Silver', min_spend: 500, min_visits: 10, color: '#94a3b8', perks: ['10% off first order monthly', 'Early access to events'] },
  { name: 'Bronze', min_spend: 0, min_visits: 0, color: '#cd7c2f', perks: ['Welcome drink on 5th visit'] },
];

function getTier(spend: number, visits: number): TierConfig {
  for (const tier of TIERS) {
    if (spend >= tier.min_spend || visits >= tier.min_visits) return tier;
  }
  return TIERS[TIERS.length - 1];
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const { data: customers } = await supabase
    .from('customers')
    .select('id, first_name, last_name, email, total_spend, visit_count, last_visit')
    .eq('restaurant_id', restaurant.restaurant_id)
    .order('total_spend', { ascending: false })
    .limit(200);

  const allCustomers = (customers || []).map(c => {
    const tier = getTier(c.total_spend || 0, c.visit_count || 0);
    return {
      id: c.id,
      name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Anonymous',
      email: c.email,
      total_spend: c.total_spend || 0,
      visits: c.visit_count || 0,
      last_visit: c.last_visit,
      tier: tier.name,
      tier_color: tier.color,
    };
  });

  // Tier counts
  const tierCounts = TIERS.map(t => ({
    ...t,
    count: allCustomers.filter(c => c.tier === t.name).length,
    total_spend: allCustomers.filter(c => c.tier === t.name).reduce((s, c) => s + c.total_spend, 0),
  }));

  return NextResponse.json({
    tiers: tierCounts,
    customers: allCustomers.slice(0, 100),
    total_vip: allCustomers.filter(c => c.tier !== 'Bronze').length,
    total_customers: allCustomers.length,
  });
}
