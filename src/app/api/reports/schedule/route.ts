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

function calculateNextSend(frequency: string, dayOfWeek?: number): string {
  const now = new Date();

  if (frequency === 'daily') {
    // Next day at 8:00 AM UTC
    const next = new Date(now);
    next.setUTCDate(next.getUTCDate() + 1);
    next.setUTCHours(8, 0, 0, 0);
    return next.toISOString();
  }

  if (frequency === 'weekly') {
    // Next occurrence of dayOfWeek (0=Sun..6=Sat), default Monday (1)
    const target = dayOfWeek ?? 1;
    const next = new Date(now);
    const currentDay = next.getUTCDay();
    let daysAhead = target - currentDay;
    if (daysAhead <= 0) daysAhead += 7;
    next.setUTCDate(next.getUTCDate() + daysAhead);
    next.setUTCHours(8, 0, 0, 0);
    return next.toISOString();
  }

  if (frequency === 'monthly') {
    // 1st of next month at 8:00 AM UTC
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 8, 0, 0, 0));
    return next.toISOString();
  }

  // Fallback: next week
  const fallback = new Date(now);
  fallback.setUTCDate(fallback.getUTCDate() + 7);
  fallback.setUTCHours(8, 0, 0, 0);
  return fallback.toISOString();
}

// GET — list scheduled reports for the restaurant
export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const { data, error } = await supabase
    .from('scheduled_reports')
    .select('*')
    .eq('restaurant_id', restaurant.restaurant_id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ schedules: data });
}

// POST — create a new scheduled report
export async function POST(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();
  const {
    report_type = 'weekly',
    frequency = 'weekly',
    day_of_week,
    recipients = [],
    include_pdf = true,
    include_ai_digest = true,
  } = body;

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json({ error: 'At least one recipient is required' }, { status: 400 });
  }

  const next_send = calculateNextSend(frequency, day_of_week);

  const { data, error } = await supabase
    .from('scheduled_reports')
    .insert({
      restaurant_id: restaurant.restaurant_id,
      report_type,
      frequency,
      day_of_week: day_of_week ?? (frequency === 'weekly' ? 1 : null),
      recipients,
      include_pdf,
      include_ai_digest,
      active: true,
      next_send,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ schedule: data }, { status: 201 });
}

// PUT — update an existing schedule
export async function PUT(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();
  const { id, ...fields } = body;

  if (!id) return NextResponse.json({ error: 'Schedule id is required' }, { status: 400 });

  // Recalculate next_send if frequency or day_of_week changed
  if (fields.frequency || fields.day_of_week !== undefined) {
    const freq = fields.frequency || 'weekly';
    fields.next_send = calculateNextSend(freq, fields.day_of_week);
  }

  const { data, error } = await supabase
    .from('scheduled_reports')
    .update(fields)
    .eq('id', id)
    .eq('restaurant_id', restaurant.restaurant_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ schedule: data });
}

// DELETE — remove a schedule
export async function DELETE(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();
  const { id } = body;

  if (!id) return NextResponse.json({ error: 'Schedule id is required' }, { status: 400 });

  const { error } = await supabase
    .from('scheduled_reports')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', restaurant.restaurant_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
