import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// GET - fetch all integration configs for this restaurant
export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: entity } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!entity) return NextResponse.json({ integrations: [] });

  const { data } = await supabase
    .from('integration_configs')
    .select('*')
    .eq('entity_id', entity.restaurant_id)
    .eq('entity_type', 'restaurant');

  return NextResponse.json({ integrations: data || [] });
}

// POST - save/update an integration config
export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { provider, api_key } = await request.json();
  const supabase = createServerSupabase();

  const { data: entity } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!entity) return NextResponse.json({ error: 'Entity not found' }, { status: 404 });

  // Upsert - update if exists, insert if not
  const { data: existing } = await supabase
    .from('integration_configs')
    .select('id')
    .eq('entity_id', entity.restaurant_id)
    .eq('entity_type', 'restaurant')
    .eq('provider', provider)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from('integration_configs')
      .update({ config: { api_key }, status: 'connected' })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } else {
    const { data, error } = await supabase
      .from('integration_configs')
      .insert({ entity_id: entity.restaurant_id, entity_type: 'restaurant', provider, config: { api_key }, status: 'connected' })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }
}

// DELETE - disconnect an integration
export async function DELETE(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { provider } = await request.json();
  const supabase = createServerSupabase();

  const { data: entity } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!entity) return NextResponse.json({ error: 'Entity not found' }, { status: 404 });

  await supabase
    .from('integration_configs')
    .delete()
    .eq('entity_id', entity.restaurant_id)
    .eq('entity_type', 'restaurant')
    .eq('provider', provider);

  return NextResponse.json({ success: true });
}
