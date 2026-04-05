import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { enrichCustomer } from '@/lib/enrichment';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { userId } = auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { customer_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { customer_id } = body;

  if (!customer_id) {
    return NextResponse.json({ error: 'customer_id is required' }, { status: 400 });
  }

  const supabase = createServerSupabase();

  // Look up the restaurant for this Clerk user
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (restaurantError || !restaurant) {
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
  }

  // Verify the customer belongs to this restaurant
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('customer_id')
    .eq('customer_id', customer_id)
    .eq('restaurant_id', restaurant.restaurant_id)
    .single();

  if (customerError || !customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  try {
    const result = await enrichCustomer(customer_id);
    return NextResponse.json({ success: true, enrichment: result });
  } catch (err) {
    console.error('[Enrich API] Enrichment failed:', err);
    return NextResponse.json(
      { error: 'Enrichment failed', detail: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
