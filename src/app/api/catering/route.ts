import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const { data: leads } = await supabase
    .from('catering_leads')
    .select('*')
    .eq('restaurant_id', restaurant.restaurant_id)
    .order('last_contacted', { ascending: false, nullsFirst: false });

  const allLeads = leads || [];
  const contacted = allLeads.filter(l => l.sequence_status !== 'discovered');
  const converted = allLeads.filter(l => l.converted);
  const pipelineValue = allLeads.reduce((sum, l) => sum + (l.order_value || 0), 0);

  // Get catering orders
  const { data: orders } = await supabase
    .from('catering_orders')
    .select('amount')
    .eq('restaurant_id', restaurant.restaurant_id);

  const totalRevenue = (orders || []).reduce((sum, o) => sum + (o.amount || 0), 0);

  return NextResponse.json({
    leads: allLeads,
    stats: {
      total: allLeads.length,
      contacted: contacted.length,
      conversion_rate: allLeads.length > 0 ? Math.round((converted.length / allLeads.length) * 100) : 0,
      pipeline_value: pipelineValue,
      total_revenue: totalRevenue,
    },
  });
}
