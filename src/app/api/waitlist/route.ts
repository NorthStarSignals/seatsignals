import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

async function getRestaurant(supabase: ReturnType<typeof createServerSupabase>, userId: string) {
  const { data } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();
  return data;
}

// Estimate wait time based on current turnover
async function estimateWait(
  supabase: ReturnType<typeof createServerSupabase>,
  restaurantId: string,
  partySize: number
): Promise<number> {
  const today = new Date().toISOString().split('T')[0];

  // Count how many parties completed in the last 2 hours
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { count: completedRecent } = await supabase
    .from('reservations')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .eq('date', today)
    .eq('status', 'completed')
    .gte('updated_at', twoHoursAgo);

  // Count currently seated
  const { count: currentlySeated } = await supabase
    .from('reservations')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .eq('date', today)
    .eq('status', 'seated');

  // Count people waiting ahead
  const { count: waitingAhead } = await supabase
    .from('waitlist')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .eq('status', 'waiting');

  const turnoversPerHour = (completedRecent || 1) / 2; // completions per hour
  const seatedCount = currentlySeated || 0;
  const ahead = waitingAhead || 0;

  // Base estimate: 45 min avg dining time, adjusted by turnover rate
  const avgTurnoverMinutes = turnoversPerHour > 0 ? Math.round(60 / turnoversPerHour) : 45;

  // Larger parties wait longer (fewer suitable tables)
  const sizeMultiplier = partySize > 4 ? 1.5 : partySize > 2 ? 1.2 : 1.0;

  // If many tables are turning over, wait is shorter
  const estimatedMinutes = Math.max(
    5,
    Math.round(((ahead + 1) / Math.max(seatedCount, 1)) * avgTurnoverMinutes * sizeMultiplier)
  );

  return Math.min(estimatedMinutes, 120); // Cap at 2 hours
}

export async function GET(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const params = request.nextUrl.searchParams;
  const status = params.get('status');

  let query = supabase
    .from('waitlist')
    .select('*')
    .eq('restaurant_id', restaurant.restaurant_id)
    .order('created_at', { ascending: true });

  if (status) {
    query = query.eq('status', status);
  } else {
    // Default: show active waitlist entries
    query = query.in('status', ['waiting', 'notified']);
  }

  const { data, error } = await query.limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Add position numbers to waiting entries
  const entries = (data || []).map((entry: Record<string, unknown>, index: number) => ({
    ...entry,
    position: entry.status === 'waiting' ? index + 1 : null,
  }));

  // Summary stats
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const waitingCount = entries.filter((e: any) => e.status === 'waiting').length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notifiedCount = entries.filter((e: any) => e.status === 'notified').length;

  return NextResponse.json({
    waitlist: entries,
    stats: {
      waiting: waitingCount,
      notified: notifiedCount,
      total_active: waitingCount + notifiedCount,
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
  const { name, phone, party_size, notes } = body;

  if (!name || !party_size) {
    return NextResponse.json({ error: 'name and party_size are required' }, { status: 400 });
  }

  // Auto-calculate estimated wait
  const estimated_wait = await estimateWait(supabase, restaurant.restaurant_id, party_size);

  // Determine position (count of current waiting entries + 1)
  const { count: currentWaiting } = await supabase
    .from('waitlist')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurant.restaurant_id)
    .eq('status', 'waiting');

  const position = (currentWaiting || 0) + 1;

  const { data, error } = await supabase
    .from('waitlist')
    .insert({
      restaurant_id: restaurant.restaurant_id,
      name,
      phone: phone || null,
      party_size,
      estimated_wait,
      notes: notes || null,
      status: 'waiting',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { ...data, position },
    { status: 201 }
  );
}

export async function PUT(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();
  const { id, action } = body;

  if (!id || !action) {
    return NextResponse.json({ error: 'id and action are required' }, { status: 400 });
  }

  const validActions = ['notify', 'seat', 'remove'];
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` }, { status: 400 });
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from('waitlist')
    .select('*')
    .eq('id', id)
    .eq('restaurant_id', restaurant.restaurant_id)
    .single();

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const statusMap: Record<string, string> = {
    notify: 'notified',
    seat: 'seated',
    remove: 'left',
  };

  const updates: Record<string, unknown> = {
    status: statusMap[action],
    updated_at: new Date().toISOString(),
  };

  if (action === 'notify') {
    updates.notified_at = new Date().toISOString();
  }
  if (action === 'seat') {
    updates.seated_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('waitlist')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
