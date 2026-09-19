import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

async function getRestaurant(supabase: ReturnType<typeof createServerSupabase>, userId: string) {
  const { data } = await supabase.from('restaurants').select('restaurant_id').eq('clerk_user_id', userId).single();
  return data;
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const rid = restaurant.restaurant_id;

  // Get all rewards for this restaurant
  const { data: rewards, error: rewardsErr } = await supabase
    .from('loyalty_rewards')
    .select('*')
    .eq('restaurant_id', rid)
    .order('created_at', { ascending: false });

  if (rewardsErr) return NextResponse.json({ error: rewardsErr.message }, { status: 500 });

  // Get recent achievements with customer name
  const { data: achievements, error: achievementsErr } = await supabase
    .from('loyalty_achievements')
    .select('*, customers(first_name, email), loyalty_rewards(name, reward_type, reward_value)')
    .eq('restaurant_id', rid)
    .order('earned_at', { ascending: false })
    .limit(50);

  if (achievementsErr) return NextResponse.json({ error: achievementsErr.message }, { status: 500 });

  // Compute stats
  const totalEarned = achievements?.length || 0;
  const totalRedeemed = achievements?.filter(a => a.redeemed).length || 0;
  const redemptionRate = totalEarned > 0 ? Math.round((totalRedeemed / totalEarned) * 100) : 0;

  // Most popular reward
  const rewardCounts = new Map<string, { name: string; count: number }>();
  achievements?.forEach(a => {
    const reward = a.loyalty_rewards as { name: string; reward_type: string; reward_value: string } | null;
    const name = reward?.name || 'Unknown';
    const existing = rewardCounts.get(name) || { name, count: 0 };
    existing.count += 1;
    rewardCounts.set(name, existing);
  });

  let mostPopularReward = 'None yet';
  let maxCount = 0;
  rewardCounts.forEach((val) => {
    if (val.count > maxCount) {
      maxCount = val.count;
      mostPopularReward = val.name;
    }
  });

  return NextResponse.json({
    rewards: rewards || [],
    achievements: achievements || [],
    stats: {
      total_rewards_earned: totalEarned,
      total_redeemed: totalRedeemed,
      redemption_rate: redemptionRate,
      most_popular_reward: mostPopularReward,
    },
  });
}

export async function POST(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();
  const { name, description, milestone_type, milestone_value, reward_type, reward_value } = body;

  if (!name || !milestone_type || !milestone_value || !reward_type || !reward_value) {
    return NextResponse.json({ error: 'name, milestone_type, milestone_value, reward_type, and reward_value are required' }, { status: 400 });
  }

  const validMilestoneTypes = ['visit_count', 'total_spend', 'referral_count', 'anniversary'];
  if (!validMilestoneTypes.includes(milestone_type)) {
    return NextResponse.json({ error: 'Invalid milestone_type' }, { status: 400 });
  }

  const validRewardTypes = ['discount_pct', 'free_item', 'credit', 'custom'];
  if (!validRewardTypes.includes(reward_type)) {
    return NextResponse.json({ error: 'Invalid reward_type' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('loyalty_rewards')
    .insert({
      restaurant_id: restaurant.restaurant_id,
      name,
      description: description || null,
      milestone_type,
      milestone_value: Number(milestone_value),
      reward_type,
      reward_value,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();
  const { id, ...fields } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  // Ensure the reward belongs to this restaurant
  const { data: existing } = await supabase
    .from('loyalty_rewards')
    .select('id')
    .eq('id', id)
    .eq('restaurant_id', restaurant.restaurant_id)
    .single();

  if (!existing) return NextResponse.json({ error: 'Reward not found' }, { status: 404 });

  // Only allow updating specific fields
  const allowedFields: Record<string, unknown> = {};
  const allowed = ['name', 'description', 'milestone_type', 'milestone_value', 'reward_type', 'reward_value', 'active'];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      allowedFields[key] = key === 'milestone_value' ? Number(fields[key]) : fields[key];
    }
  }

  const { data, error } = await supabase
    .from('loyalty_rewards')
    .update(allowedFields)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();
  const { id } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  // Ensure the reward belongs to this restaurant
  const { data: existing } = await supabase
    .from('loyalty_rewards')
    .select('id')
    .eq('id', id)
    .eq('restaurant_id', restaurant.restaurant_id)
    .single();

  if (!existing) return NextResponse.json({ error: 'Reward not found' }, { status: 404 });

  const { error } = await supabase
    .from('loyalty_rewards')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
