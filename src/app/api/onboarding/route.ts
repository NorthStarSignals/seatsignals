import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const supabase = createServerSupabase();

  // Validate required fields
  if (!body.name?.trim() || !body.address?.trim() || !body.cuisine_type?.trim()) {
    return NextResponse.json(
      { error: 'Missing required fields: name, address, cuisine_type' },
      { status: 400 }
    );
  }

  // Simple geocoding placeholder - in production use Google Geocoding API
  const lat = 32.7767;
  const lng = -96.7970;

  const restaurantData = {
    clerk_user_id: userId,
    name: body.name.trim(),
    address: body.address.trim(),
    lat,
    lng,
    cuisine_type: body.cuisine_type.trim(),
    brand_voice: body.brand_voice?.trim() || '',
    dead_hours_config: body.dead_hours_config || [],
    subscription_tier: body.subscription_tier || 'starter',
    setup_date: new Date().toISOString(),
  };

  // Check if restaurant already exists for this user
  const { data: existing } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  let data;
  let error;

  if (existing) {
    // Update existing restaurant
    const result = await supabase
      .from('restaurants')
      .update(restaurantData)
      .eq('clerk_user_id', userId)
      .select()
      .single();
    data = result.data;
    error = result.error;
  } else {
    // Create new restaurant
    const result = await supabase
      .from('restaurants')
      .insert(restaurantData)
      .select()
      .single();
    data = result.data;
    error = result.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ restaurant_id: data.restaurant_id });
}
