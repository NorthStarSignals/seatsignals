import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { addToDoNotContact, removeFromDoNotContact, getComplianceSummary, logConsent } from '@/lib/compliance';

async function getRestaurant(supabase: ReturnType<typeof createServerSupabase>, userId: string) {
  const { data } = await supabase.from('restaurants').select('restaurant_id').eq('clerk_user_id', userId).single();
  return data;
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const restaurantId = restaurant.restaurant_id;

  // Get DNC list with linked customer names
  const { data: dncList, error: dncError } = await supabase
    .from('do_not_contact')
    .select('*, customers(first_name, email)')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (dncError) return NextResponse.json({ error: dncError.message }, { status: 500 });

  // Get consent log
  const { data: consentLog, error: consentError } = await supabase
    .from('consent_log')
    .select('*, customers(first_name, email)')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (consentError) return NextResponse.json({ error: consentError.message }, { status: 500 });

  // Get compliance summary
  const summary = await getComplianceSummary(restaurantId);

  return NextResponse.json({
    dnc_list: dncList || [],
    consent_log: consentLog || [],
    summary,
  });
}

export async function POST(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();
  const { contact_type, contact_value, reason, customer_id } = body;

  if (!contact_type || !contact_value) {
    return NextResponse.json({ error: 'contact_type and contact_value required' }, { status: 400 });
  }

  try {
    await addToDoNotContact({
      restaurantId: restaurant.restaurant_id,
      contactType: contact_type,
      contactValue: contact_value,
      reason: reason || 'manual',
      customerId: customer_id,
      addedBy: userId,
    });

    // Log the consent change
    await logConsent({
      restaurantId: restaurant.restaurant_id,
      customerId: customer_id,
      consentType: contact_type === 'phone' ? 'sms_opt_in' : 'email_opt_in',
      consented: false,
      source: 'manual',
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  try {
    // Verify the DNC entry belongs to this restaurant
    const { data: entry } = await supabase
      .from('do_not_contact')
      .select('restaurant_id')
      .eq('id', id)
      .single();

    if (!entry || entry.restaurant_id !== restaurant.restaurant_id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await removeFromDoNotContact(id, restaurant.restaurant_id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
