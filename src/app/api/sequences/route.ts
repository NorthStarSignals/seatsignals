import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { SequenceDefinition } from '@/lib/types';

const DEFAULT_DEFINITIONS = [
  {
    type: 'retention',
    name: 'Welcome & Retention',
    channel: 'both',
    trigger_event: 'first_visit',
    delay_days: 0,
    enabled: true,
    message_template: 'Thanks for visiting {{restaurant_name}}! Show this text next time for 10% off.',
  },
  {
    type: 'birthday',
    name: 'Birthday Celebrations',
    channel: 'email',
    trigger_event: 'birthday',
    delay_days: 0,
    enabled: true,
    message_template: null,
  },
  {
    type: 'dead_hours',
    name: 'Dead Hours Promos',
    channel: 'sms',
    trigger_event: 'dead_hours',
    delay_days: 0,
    enabled: true,
    message_template: null,
  },
  {
    type: 'churn_reengagement',
    name: 'Win-Back Campaigns',
    channel: 'both',
    trigger_event: 'days_since_visit',
    delay_days: 30,
    enabled: true,
    message_template: null,
  },
  {
    type: 'catering',
    name: 'Catering Outreach',
    channel: 'email',
    trigger_event: 'manual',
    delay_days: 0,
    enabled: true,
    message_template: null,
  },
];

export async function GET() {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabase();

  // Look up restaurant
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (restaurantError || !restaurant) {
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
  }

  const restaurantId = restaurant.restaurant_id;

  // Fetch existing definitions
  const { data: existingDefs, error: defError } = await supabase
    .from('sequence_definitions')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: true });

  if (defError) {
    return NextResponse.json({ error: defError.message }, { status: 500 });
  }

  let definitions = existingDefs ?? [];

  // Auto-create defaults if none exist
  if (definitions.length === 0) {
    const toInsert = DEFAULT_DEFINITIONS.map((d) => ({
      ...d,
      restaurant_id: restaurantId,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('sequence_definitions')
      .insert(toInsert)
      .select('*');

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    definitions = inserted ?? [];
  }

  // Fetch aggregate stats from sequences table grouped by type for this restaurant
  const { data: statsRows } = await supabase
    .from('sequences')
    .select('type, opened, clicked, converted')
    .eq('restaurant_id', restaurantId);

  // Aggregate in-memory (avoids needing RPC/group-by support)
  const statsMap: Record<string, { sent: number; opened: number; clicked: number; converted: number }> = {};
  if (statsRows) {
    for (const row of statsRows) {
      if (!statsMap[row.type]) {
        statsMap[row.type] = { sent: 0, opened: 0, clicked: 0, converted: 0 };
      }
      statsMap[row.type].sent += 1;
      if (row.opened) statsMap[row.type].opened += 1;
      if (row.clicked) statsMap[row.type].clicked += 1;
      if (row.converted) statsMap[row.type].converted += 1;
    }
  }

  // Attach stats to definitions
  const enriched: SequenceDefinition[] = (definitions as SequenceDefinition[]).map((def) => ({
    ...def,
    stats: statsMap[def.type] ?? { sent: 0, opened: 0, clicked: 0, converted: 0 },
  }));

  return NextResponse.json({ definitions: enriched });
}

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabase();

  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (restaurantError || !restaurant) {
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
  }

  const body = await request.json();
  const { name, channel, trigger_event, delay_days, subject, message_template } = body;

  if (!name || !channel) {
    return NextResponse.json({ error: 'name and channel are required' }, { status: 400 });
  }

  // Generate a unique type slug from the name
  const type = `custom_${name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}_${Date.now()}`;

  const { data, error } = await supabase
    .from('sequence_definitions')
    .insert({
      restaurant_id: restaurant.restaurant_id,
      type,
      name,
      channel,
      trigger_event: trigger_event ?? 'manual',
      delay_days: delay_days ?? 0,
      subject: subject ?? null,
      message_template: message_template ?? null,
      enabled: true,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ definition: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabase();

  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (restaurantError || !restaurant) {
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
  }

  const body = await request.json();
  const { id, enabled, name, message_template, channel, subject } = body;

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (enabled !== undefined) updates.enabled = enabled;
  if (name !== undefined) updates.name = name;
  if (message_template !== undefined) updates.message_template = message_template;
  if (channel !== undefined) updates.channel = channel;
  if (subject !== undefined) updates.subject = subject;

  const { data, error } = await supabase
    .from('sequence_definitions')
    .update(updates)
    .eq('id', id)
    .eq('restaurant_id', restaurant.restaurant_id) // ownership check
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ definition: data });
}
