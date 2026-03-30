import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('account_id');
  const token = request.nextUrl.searchParams.get('token');

  if (!accountId || !token) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  const supabase = createServerSupabase();

  const { data: account } = await supabase
    .from('corporate_accounts')
    .select('*')
    .eq('account_id', accountId)
    .eq('access_token', token)
    .single();

  if (!account) return NextResponse.json({ error: 'Invalid access' }, { status: 403 });

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('name')
    .eq('restaurant_id', account.restaurant_id)
    .single();

  const { data: orders } = await supabase
    .from('catering_orders')
    .select('order_id, date, amount, items')
    .eq('corporate_account_id', accountId)
    .order('date', { ascending: false });

  return NextResponse.json({
    account: {
      company_name: account.company_name,
      primary_contact: account.primary_contact,
      dietary_preferences: account.dietary_preferences,
      delivery_address: account.delivery_address,
    },
    orders: orders || [],
    restaurant_name: restaurant?.name || 'Restaurant',
  });
}
