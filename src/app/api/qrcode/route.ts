import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id, name')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant found' }, { status: 404 });

  const captureUrl = `${process.env.NEXT_PUBLIC_APP_URL}/capture/${restaurant.restaurant_id}`;
  const qrSvg = await QRCode.toString(captureUrl, { type: 'svg', margin: 2 });

  return NextResponse.json({
    svg: qrSvg,
    url: captureUrl,
    restaurant_name: restaurant.name,
  });
}
