import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('clerk_user_id', userId)
    .order('setup_date', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, address, cuisine_type, phone } = body;

  if (!name || !address || !cuisine_type) {
    return NextResponse.json(
      { error: 'name, address, and cuisine_type are required' },
      { status: 400 }
    );
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('restaurants')
    .insert({
      name,
      address,
      cuisine_type,
      phone: phone ?? null,
      clerk_user_id: userId,
      subscription_tier: 'starter',
      brand_voice: '',
      lat: 0,
      lng: 0,
      dead_hours_config: [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
