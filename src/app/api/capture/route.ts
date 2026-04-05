import { createServerSupabase } from '@/lib/supabase';
import { enrichCustomer } from '@/lib/enrichment';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  const { restaurant_id, first_name, email, phone, birthday, source } = body;

  if (!restaurant_id || !email) {
    return NextResponse.json({ error: 'Restaurant ID and email are required' }, { status: 400 });
  }

  const supabase = createServerSupabase();

  // Check if customer already exists for this restaurant
  const { data: existing } = await supabase
    .from('customers')
    .select('customer_id, visit_count')
    .eq('restaurant_id', restaurant_id)
    .eq('email', email)
    .single();

  let customerId: string;

  if (existing) {
    // Update existing customer
    const { error } = await supabase
      .from('customers')
      .update({
        last_seen: new Date().toISOString(),
        visit_count: existing.visit_count + 1,
        ...(phone && { phone }),
        ...(birthday && { birthday }),
        ...(first_name && { first_name }),
      })
      .eq('customer_id', existing.customer_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    customerId = existing.customer_id;
  } else {
    // Create new customer
    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert({
        restaurant_id,
        first_name: first_name || '',
        email,
        phone: phone || null,
        birthday: birthday || null,
        source: source || 'wifi',
      })
      .select('customer_id')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    customerId = newCustomer.customer_id;
  }

  // Create a visit record
  await supabase.from('visits').insert({
    customer_id: customerId,
    restaurant_id,
    source: source || 'wifi',
  });

  // Fire-and-forget enrichment (don't await - don't block the capture response)
  enrichCustomer(customerId).catch(err =>
    console.error('[Enrichment] Background enrichment failed:', err)
  );

  return NextResponse.json({ success: true, customer_id: customerId });
}
