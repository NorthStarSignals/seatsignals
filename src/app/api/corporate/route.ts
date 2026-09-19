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

  const rid = restaurant.restaurant_id;

  // Fetch accounts
  const { data: accounts } = await supabase
    .from('corporate_accounts')
    .select('*')
    .eq('restaurant_id', rid)
    .order('last_order_date', { ascending: false, nullsFirst: false });

  const all = accounts || [];

  // Fetch all catering orders linked to corporate accounts
  const { data: orders } = await supabase
    .from('catering_orders')
    .select('order_id, amount, recurring, corporate_account_id, date')
    .eq('restaurant_id', rid)
    .not('corporate_account_id', 'is', null);

  const allOrders = orders || [];

  // Build per-account order stats
  const ordersByAccount: Record<string, { count: number; lastDate: string | null }> = {};
  for (const o of allOrders) {
    const aid = o.corporate_account_id;
    if (!aid) continue;
    if (!ordersByAccount[aid]) ordersByAccount[aid] = { count: 0, lastDate: null };
    ordersByAccount[aid].count++;
    if (!ordersByAccount[aid].lastDate || o.date > ordersByAccount[aid].lastDate!) {
      ordersByAccount[aid].lastDate = o.date;
    }
  }

  // Enrich accounts with order stats
  const enrichedAccounts = all.map(a => ({
    ...a,
    order_count: ordersByAccount[a.account_id]?.count || 0,
    last_order_from_orders: ordersByAccount[a.account_id]?.lastDate || null,
  }));

  // Metrics
  const totalLifetimeValue = all.reduce((sum, a) => sum + (a.total_lifetime_value || 0), 0);
  const recurringCount = allOrders.filter(o => o.recurring).length;
  const churnRiskCount = all.filter(a => a.churn_risk_flag).length;

  return NextResponse.json({
    accounts: enrichedAccounts,
    metrics: {
      total: all.length,
      lifetime_value: totalLifetimeValue,
      recurring_count: recurringCount,
      churn_risk_count: churnRiskCount,
    },
  });
}

export async function POST(request: Request) {
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

  const newAccount = {
    restaurant_id: restaurant.restaurant_id,
    company_name: body.company_name,
    primary_contact: body.primary_contact,
    delivery_address: body.delivery_address,
    billing_info: body.billing_info || null,
    dietary_preferences: body.dietary_preferences || null,
    recurring_schedule: body.recurring_schedule || null,
    total_lifetime_value: body.initial_order_value || 0,
    churn_risk_flag: false,
    last_order_date: null,
  };

  const { data, error } = await supabase
    .from('corporate_accounts')
    .insert(newAccount)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ account: data }, { status: 201 });
}
