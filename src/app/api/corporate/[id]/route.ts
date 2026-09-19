import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const { data: account } = await supabase
    .from('corporate_accounts')
    .select('*')
    .eq('account_id', params.id)
    .eq('restaurant_id', restaurant.restaurant_id)
    .single();

  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  // Fetch full order history
  const { data: orders } = await supabase
    .from('catering_orders')
    .select('*')
    .eq('corporate_account_id', params.id)
    .eq('restaurant_id', restaurant.restaurant_id)
    .order('date', { ascending: false });

  const allOrders = orders || [];
  const totalOrders = allOrders.length;
  const avgOrderValue = totalOrders > 0
    ? allOrders.reduce((sum, o) => sum + (o.amount || 0), 0) / totalOrders
    : 0;

  return NextResponse.json({
    account,
    orders: allOrders,
    stats: {
      total_orders: totalOrders,
      avg_order_value: Math.round(avgOrderValue * 100) / 100,
    },
  });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();

  // Only allow updating safe fields
  const allowedFields: Record<string, unknown> = {};
  const updatable = [
    'company_name', 'primary_contact', 'delivery_address',
    'billing_info', 'dietary_preferences', 'recurring_schedule',
    'churn_risk_flag', 'total_lifetime_value',
  ];
  for (const key of updatable) {
    if (body[key] !== undefined) {
      allowedFields[key] = body[key];
    }
  }

  const { data, error } = await supabase
    .from('corporate_accounts')
    .update(allowedFields)
    .eq('account_id', params.id)
    .eq('restaurant_id', restaurant.restaurant_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ account: data });
}
