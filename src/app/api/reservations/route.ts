import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

function getSupabaseAndRestaurant() {
  const { userId } = auth();
  if (!userId) return { userId: null, supabase: null };
  const supabase = createServerSupabase();
  return { userId, supabase };
}

async function getRestaurant(supabase: ReturnType<typeof createServerSupabase>, userId: string) {
  const { data } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();
  return data;
}

// Table assignment rules: party 1-2 => tables 1-10, 3-4 => 11-20, 5-6 => 21-25, 7+ => 26-30
function getTableRange(partySize: number): [number, number] {
  if (partySize <= 2) return [1, 10];
  if (partySize <= 4) return [11, 20];
  if (partySize <= 6) return [21, 25];
  return [26, 30];
}

async function autoAssignTable(
  supabase: ReturnType<typeof createServerSupabase>,
  restaurantId: string,
  partySize: number,
  date: string,
  time: string
): Promise<number | null> {
  const [rangeStart, rangeEnd] = getTableRange(partySize);

  // Find tables already booked for this date/time (active reservations only)
  const { data: booked } = await supabase
    .from('reservations')
    .select('table_number')
    .eq('restaurant_id', restaurantId)
    .eq('date', date)
    .eq('time', time)
    .in('status', ['confirmed', 'seated'])
    .not('table_number', 'is', null);

  const bookedTables = new Set((booked || []).map((r: { table_number: number }) => r.table_number));

  for (let t = rangeStart; t <= rangeEnd; t++) {
    if (!bookedTables.has(t)) return t;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const { userId, supabase } = getSupabaseAndRestaurant();
  if (!userId || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const params = request.nextUrl.searchParams;
  const date = params.get('date');
  const status = params.get('status');
  const minParty = params.get('min_party');
  const maxParty = params.get('max_party');

  let query = supabase
    .from('reservations')
    .select('*, customers(first_name, email, phone)')
    .eq('restaurant_id', restaurant.restaurant_id)
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (date) query = query.eq('date', date);
  if (status) query = query.eq('status', status);
  if (minParty) query = query.gte('party_size', parseInt(minParty));
  if (maxParty) query = query.lte('party_size', parseInt(maxParty));

  const { data, error } = await query.limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Stats for the requested date (or today)
  const statsDate = date || new Date().toISOString().split('T')[0];

  const { data: dayReservations } = await supabase
    .from('reservations')
    .select('status, party_size')
    .eq('restaurant_id', restaurant.restaurant_id)
    .eq('date', statsDate);

  const all = dayReservations || [];
  const totalToday = all.length;
  const seated = all.filter((r: { status: string }) => r.status === 'seated' || r.status === 'completed').length;
  const noShows = all.filter((r: { status: string }) => r.status === 'no-show').length;
  const avgParty = totalToday > 0
    ? Math.round((all.reduce((sum: number, r: { party_size: number }) => sum + r.party_size, 0) / totalToday) * 10) / 10
    : 0;

  return NextResponse.json({
    reservations: data,
    stats: {
      total_today: totalToday,
      seated_pct: totalToday > 0 ? Math.round((seated / totalToday) * 100) : 0,
      no_show_rate: totalToday > 0 ? Math.round((noShows / totalToday) * 100) : 0,
      avg_party_size: avgParty,
    },
  });
}

export async function POST(request: NextRequest) {
  const { userId, supabase } = getSupabaseAndRestaurant();
  if (!userId || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();
  const { customer_id, date, time, party_size, notes, special_requests } = body;

  if (!date || !time || !party_size) {
    return NextResponse.json({ error: 'date, time, and party_size are required' }, { status: 400 });
  }

  // Auto-assign table
  const tableNumber = await autoAssignTable(
    supabase,
    restaurant.restaurant_id,
    party_size,
    date,
    time
  );

  if (tableNumber === null) {
    return NextResponse.json(
      { error: 'No tables available for this party size at the requested time' },
      { status: 409 }
    );
  }

  // Double-check for conflicts (same date/time/table)
  const { data: conflict } = await supabase
    .from('reservations')
    .select('id')
    .eq('restaurant_id', restaurant.restaurant_id)
    .eq('date', date)
    .eq('time', time)
    .eq('table_number', tableNumber)
    .in('status', ['confirmed', 'seated'])
    .limit(1);

  if (conflict && conflict.length > 0) {
    return NextResponse.json({ error: 'Table conflict detected' }, { status: 409 });
  }

  const { data, error } = await supabase
    .from('reservations')
    .insert({
      restaurant_id: restaurant.restaurant_id,
      customer_id: customer_id || null,
      date,
      time,
      party_size,
      table_number: tableNumber,
      notes: notes || null,
      special_requests: special_requests || null,
      status: 'confirmed',
      created_at: new Date().toISOString(),
    })
    .select('*, customers(first_name, email, phone)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const { userId, supabase } = getSupabaseAndRestaurant();
  if (!userId || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();
  const { id, status, notes, special_requests, party_size, date, time } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const validStatuses = ['confirmed', 'seated', 'completed', 'cancelled', 'no-show'];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from('reservations')
    .select('id')
    .eq('id', id)
    .eq('restaurant_id', restaurant.restaurant_id)
    .single();

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (notes !== undefined) updates.notes = notes;
  if (special_requests !== undefined) updates.special_requests = special_requests;
  if (party_size) updates.party_size = party_size;
  if (date) updates.date = date;
  if (time) updates.time = time;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('reservations')
    .update(updates)
    .eq('id', id)
    .select('*, customers(first_name, email, phone)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const { userId, supabase } = getSupabaseAndRestaurant();
  if (!userId || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { data: existing } = await supabase
    .from('reservations')
    .select('id')
    .eq('id', id)
    .eq('restaurant_id', restaurant.restaurant_id)
    .single();

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Soft delete: set status to cancelled
  const { error } = await supabase
    .from('reservations')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
