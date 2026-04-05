import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const { data: config } = await supabase
    .from('restaurant_email_config')
    .select('provider, from_name, from_email, connected, created_at, updated_at')
    .eq('restaurant_id', restaurant.restaurant_id)
    .single();

  return NextResponse.json({ config: config ?? null });
}

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const { from_name, from_email } = await req.json();

  const { error } = await supabase
    .from('restaurant_email_config')
    .upsert(
      {
        restaurant_id: restaurant.restaurant_id,
        provider: 'sendgrid',
        from_name,
        from_email,
        connected: true,
      },
      { onConflict: 'restaurant_id' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
