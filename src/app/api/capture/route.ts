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

  // Validate restaurant exists
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('restaurant_id', restaurant_id)
    .single();

  if (!restaurant) {
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
  }

  // Check if customer already exists for this restaurant
  const { data: existing } = await supabase
    .from('customers')
    .select('customer_id, visit_count')
    .eq('restaurant_id', restaurant_id)
    .eq('email', email)
    .single();

  let customerId: string;
  let isNewCustomer = false;
  const captureSource = source || 'wifi';

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
      .eq('customer_id', existing.customer_id)
      .eq('restaurant_id', restaurant_id);

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
        source: captureSource,
      })
      .select('customer_id')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    customerId = newCustomer.customer_id;
    isNewCustomer = true;
  }

  // Create a visit record
  await supabase.from('visits').insert({
    customer_id: customerId,
    restaurant_id,
    source: captureSource,
    spend_amount: 0,
  });

  // Create notification for QR captures
  if (captureSource === 'qr') {
    const displayName = first_name || email;
    await supabase.from('notifications').insert({
      restaurant_id,
      type: 'qr_capture',
      text: isNewCustomer
        ? `New customer ${displayName} joined via QR code`
        : `Returning customer ${displayName} checked in via QR code`,
      read: false,
    });
  }

  // Fire-and-forget enrichment (don't await - don't block the capture response)
  enrichCustomer(customerId).catch(err =>
    console.error('[Enrichment] Background enrichment failed:', err)
  );

  return NextResponse.json({ success: true, customer_id: customerId, new_customer: isNewCustomer });
}
