import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { sendEmail } from '@/lib/messaging';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { lead_ids } = await request.json();
  if (!lead_ids || lead_ids.length === 0) return NextResponse.json({ error: 'No leads selected' }, { status: 400 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id, name, cuisine_type')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const { data: leads } = await supabase
    .from('catering_leads')
    .select('*')
    .in('lead_id', lead_ids)
    .eq('restaurant_id', restaurant.restaurant_id)
    .eq('sequence_status', 'discovered');

  if (!leads || leads.length === 0) return NextResponse.json({ error: 'No eligible leads' }, { status: 400 });

  for (const lead of leads) {
    const subject = `${restaurant.name} - Catering for ${lead.company_name}`;
    const html = `<p>Hi ${lead.contact_name},</p>
<p>I'm reaching out from ${restaurant.name}, your neighbor just ${lead.distance_miles} miles away. We specialize in ${restaurant.cuisine_type} catering for offices like yours.</p>
<p>We'd love to feed your team of ${lead.company_size}. Your first order is <strong>15% off</strong>.</p>
<p>Would you be open to seeing our catering menu?</p>
<p>Best,<br/>${restaurant.name} Team</p>`;

    await sendEmail(lead.contact_email, subject, html);

    await supabase
      .from('catering_leads')
      .update({ sequence_status: 'contacted', last_contacted: new Date().toISOString() })
      .eq('lead_id', lead.lead_id);

    await supabase.from('sequences').insert({
      customer_id: lead.lead_id, // Using lead_id as reference
      restaurant_id: restaurant.restaurant_id,
      type: 'catering',
      message: `Email 1: Intro catering menu to ${lead.contact_name} at ${lead.company_name}`,
    });
  }

  return NextResponse.json({ success: true, contacted: leads.length });
}
