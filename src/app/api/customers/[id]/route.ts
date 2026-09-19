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

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('customer_id', params.id)
    .eq('restaurant_id', restaurant.restaurant_id)
    .single();

  if (customerError || !customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const { data: visits } = await supabase
    .from('visits')
    .select('*')
    .eq('customer_id', params.id)
    .eq('restaurant_id', restaurant.restaurant_id)
    .order('timestamp', { ascending: false })
    .limit(50);

  const { data: messages } = await supabase
    .from('sequences')
    .select('*')
    .eq('customer_id', params.id)
    .eq('restaurant_id', restaurant.restaurant_id)
    .order('sent_at', { ascending: false })
    .limit(50);

  const { data: birthdayEvents } = await supabase
    .from('birthday_events')
    .select('*')
    .eq('customer_id', params.id)
    .eq('restaurant_id', restaurant.restaurant_id)
    .order('offer_sent_at', { ascending: false })
    .limit(20);

  return NextResponse.json({
    customer,
    visits: visits || [],
    messages: messages || [],
    birthday_events: birthdayEvents || [],
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const { data: existing } = await supabase
    .from('customers')
    .select('customer_id')
    .eq('customer_id', params.id)
    .eq('restaurant_id', restaurant.restaurant_id)
    .single();

  if (!existing) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

  const body = await request.json();
  const allowedFields: Record<string, unknown> = {};
  const allowed = ['first_name', 'last_name', 'email', 'phone', 'birthday', 'tags', 'notes', 'sms_opt_in', 'email_opt_in'];
  for (const key of allowed) {
    if (key in body) allowedFields[key] = body[key];
  }

  const { data, error } = await supabase
    .from('customers')
    .update(allowedFields)
    .eq('customer_id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  // Verify customer belongs to this restaurant
  const { data: existing } = await supabase
    .from('customers')
    .select('customer_id')
    .eq('customer_id', params.id)
    .eq('restaurant_id', restaurant.restaurant_id)
    .single();

  if (!existing) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

  // Delete related records first (belt-and-suspenders: restaurant_id filter in addition to pre-check above)
  await supabase.from('visits').delete().eq('customer_id', params.id).eq('restaurant_id', restaurant.restaurant_id);
  await supabase.from('sequences').delete().eq('customer_id', params.id).eq('restaurant_id', restaurant.restaurant_id);
  await supabase.from('birthday_events').delete().eq('customer_id', params.id).eq('restaurant_id', restaurant.restaurant_id);
  await supabase.from('customer_tags').delete().eq('customer_id', params.id).eq('restaurant_id', restaurant.restaurant_id);

  // Delete the customer
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('customer_id', params.id)
    .eq('restaurant_id', restaurant.restaurant_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
