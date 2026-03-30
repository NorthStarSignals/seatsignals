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

  const { data: accounts } = await supabase
    .from('corporate_accounts')
    .select('*')
    .eq('restaurant_id', restaurant.restaurant_id)
    .order('last_order_date', { ascending: false, nullsFirst: false });

  const all = accounts || [];
  const active = all.filter(a => !a.churn_risk_flag);
  const atRisk = all.filter(a => a.churn_risk_flag);

  // Get recurring orders
  const { data: orders } = await supabase
    .from('catering_orders')
    .select('amount, recurring, corporate_account_id')
    .eq('restaurant_id', restaurant.restaurant_id)
    .not('corporate_account_id', 'is', null);

  const recurringRevenue = (orders || [])
    .filter(o => o.recurring)
    .reduce((sum, o) => sum + (o.amount || 0), 0);

  const totalLTV = all.reduce((sum, a) => sum + (a.total_lifetime_value || 0), 0);
  const avgOrderValue = (orders || []).length > 0
    ? (orders || []).reduce((sum, o) => sum + (o.amount || 0), 0) / (orders || []).length
    : 0;

  return NextResponse.json({
    accounts: all,
    stats: {
      active: active.length,
      monthly_recurring: recurringRevenue,
      churn_risk: atRisk.length,
      avg_order_value: Math.round(avgOrderValue),
      total_ltv: totalLTV,
    },
  });
}
