import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

async function getRestaurantId(userId: string) {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();
  return data?.restaurant_id;
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const restaurantId = await getRestaurantId(userId);
  if (!restaurantId) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const supabase = createServerSupabase();

  const { data: webhooks } = await supabase
    .from('webhooks')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });

  // Fetch last 5 logs per webhook
  const webhooksWithLogs = await Promise.all(
    (webhooks || []).map(async (wh: Record<string, unknown>) => {
      const { data: logs } = await supabase
        .from('webhook_logs')
        .select('*')
        .eq('webhook_id', wh.id)
        .order('created_at', { ascending: false })
        .limit(5);
      return { ...wh, recent_logs: logs || [] };
    })
  );

  return NextResponse.json({ webhooks: webhooksWithLogs });
}

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const restaurantId = await getRestaurantId(userId);
  if (!restaurantId) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await req.json();
  const { name, url, events, secret } = body;

  if (!name || !url || !events || !Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ error: 'name, url, and events[] are required' }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('webhooks')
    .insert({
      restaurant_id: restaurantId,
      name,
      url,
      events,
      secret: secret || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ webhook: data }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const restaurantId = await getRestaurantId(userId);
  if (!restaurantId) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await req.json();
  const { id, ...fields } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  // Validate URL if provided
  if (fields.url) {
    try {
      new URL(fields.url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }
  }

  const supabase = createServerSupabase();

  // Verify ownership
  const { data: existing } = await supabase
    .from('webhooks')
    .select('restaurant_id')
    .eq('id', id)
    .single();

  if (!existing || existing.restaurant_id !== restaurantId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const allowedFields: Record<string, unknown> = {};
  if ('name' in fields) allowedFields.name = fields.name;
  if ('url' in fields) allowedFields.url = fields.url;
  if ('events' in fields) allowedFields.events = fields.events;
  if ('secret' in fields) allowedFields.secret = fields.secret;
  if ('active' in fields) allowedFields.active = fields.active;

  const { data, error } = await supabase
    .from('webhooks')
    .update(allowedFields)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ webhook: data });
}

export async function DELETE(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const restaurantId = await getRestaurantId(userId);
  if (!restaurantId) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await req.json();
  const { id } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const supabase = createServerSupabase();

  // Verify ownership
  const { data: existing } = await supabase
    .from('webhooks')
    .select('restaurant_id')
    .eq('id', id)
    .single();

  if (!existing || existing.restaurant_id !== restaurantId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { error } = await supabase
    .from('webhooks')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
