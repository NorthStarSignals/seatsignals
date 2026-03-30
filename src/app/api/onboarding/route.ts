import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const supabase = createServerSupabase();

  // Simple geocoding placeholder - in production use Google Geocoding API
  const lat = 32.7767;
  const lng = -96.7970;

  const { data, error } = await supabase
    .from('restaurants')
    .upsert({
      clerk_user_id: userId,
      name: body.name,
      address: body.address,
      lat,
      lng,
      cuisine_type: body.cuisine_type,
      brand_voice: body.brand_voice,
      dead_hours_config: body.dead_hours_config || [],
    }, { onConflict: 'clerk_user_id' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
