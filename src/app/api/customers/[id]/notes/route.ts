import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabase();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) {
    return NextResponse.json({ error: 'No restaurant' }, { status: 404 });
  }

  const { data: customer, error } = await supabase
    .from('customers')
    .select('enrichment_data, notes')
    .eq('customer_id', params.id)
    .eq('restaurant_id', restaurant.restaurant_id)
    .single();

  if (error || !customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  // Read notes from the dedicated column first, fall back to enrichment_data.notes
  const notes =
    customer.notes ||
    (customer.enrichment_data as Record<string, unknown>)?.notes ||
    '';

  return NextResponse.json({ notes });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabase();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) {
    return NextResponse.json({ error: 'No restaurant' }, { status: 404 });
  }

  const body = await request.json();
  const { notes } = body as { notes: string };

  if (typeof notes !== 'string') {
    return NextResponse.json({ error: 'notes must be a string' }, { status: 400 });
  }

  // First fetch existing enrichment_data so we can merge
  const { data: existing } = await supabase
    .from('customers')
    .select('enrichment_data')
    .eq('customer_id', params.id)
    .eq('restaurant_id', restaurant.restaurant_id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const currentEnrichment = (existing.enrichment_data as Record<string, unknown>) || {};
  const updatedEnrichment = { ...currentEnrichment, notes };

  // Update both the enrichment_data.notes and the notes column (if it exists)
  const { error } = await supabase
    .from('customers')
    .update({
      enrichment_data: updatedEnrichment,
      notes,
    })
    .eq('customer_id', params.id)
    .eq('restaurant_id', restaurant.restaurant_id);

  if (error) {
    // If notes column doesn't exist, try just enrichment_data
    const { error: fallbackError } = await supabase
      .from('customers')
      .update({
        enrichment_data: updatedEnrichment,
      })
      .eq('customer_id', params.id)
      .eq('restaurant_id', restaurant.restaurant_id);

    if (fallbackError) {
      return NextResponse.json({ error: fallbackError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, notes });
}
