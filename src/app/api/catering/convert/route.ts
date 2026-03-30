import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { lead_id, amount, items } = await request.json();
  if (!lead_id || !amount) return NextResponse.json({ error: 'lead_id and amount required' }, { status: 400 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  // Get the lead
  const { data: lead } = await supabase
    .from('catering_leads')
    .select('*')
    .eq('lead_id', lead_id)
    .eq('restaurant_id', restaurant.restaurant_id)
    .single();

  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  // Create corporate account
  const { data: account } = await supabase
    .from('corporate_accounts')
    .insert({
      restaurant_id: restaurant.restaurant_id,
      company_name: lead.company_name,
      primary_contact: lead.contact_name,
      delivery_address: '',
      total_lifetime_value: amount,
    })
    .select('account_id')
    .single();

  // Create catering order
  await supabase.from('catering_orders').insert({
    restaurant_id: restaurant.restaurant_id,
    lead_id: lead.lead_id,
    corporate_account_id: account?.account_id || null,
    amount,
    items: items || [],
  });

  // Update lead
  await supabase
    .from('catering_leads')
    .update({ converted: true, order_value: amount, sequence_status: 'order_placed' })
    .eq('lead_id', lead_id);

  return NextResponse.json({ success: true, account_id: account?.account_id });
}
