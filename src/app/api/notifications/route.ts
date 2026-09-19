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

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, restaurant_id, type, text, link, read, created_at')
    .eq('restaurant_id', restaurant.restaurant_id)
    .order('created_at', { ascending: false })
    .limit(50);

  const all = notifications || [];
  const unread_count = all.filter((n) => !n.read).length;

  return NextResponse.json({ notifications: all, unread_count });
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

  const body = await req.json();

  if (body.action === 'mark_read') {
    if (body.id) {
      // Mark single notification read
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', body.id)
        .eq('restaurant_id', restaurant.restaurant_id);
    } else {
      // Mark all read for this restaurant
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('restaurant_id', restaurant.restaurant_id)
        .eq('read', false);
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
