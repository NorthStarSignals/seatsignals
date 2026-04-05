import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { sendSMS, sendEmail } from '@/lib/messaging';
import { NextRequest, NextResponse } from 'next/server';

async function getRestaurant(supabase: ReturnType<typeof createServerSupabase>, userId: string) {
  const { data } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();
  return data;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();
  const { channel, message, subject } = body as {
    channel: 'sms' | 'email';
    message: string;
    subject?: string;
  };

  if (!channel || !message) {
    return NextResponse.json({ error: 'channel and message are required' }, { status: 400 });
  }

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('customer_id', params.id)
    .eq('restaurant_id', restaurant.restaurant_id)
    .single();

  if (customerError || !customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  let sent = false;
  if (channel === 'sms') {
    if (!customer.phone) {
      return NextResponse.json({ error: 'Customer has no phone number' }, { status: 400 });
    }
    sent = await sendSMS(customer.phone, message);
  } else if (channel === 'email') {
    if (!customer.email) {
      return NextResponse.json({ error: 'Customer has no email address' }, { status: 400 });
    }
    sent = await sendEmail(customer.email, subject || 'Message from us', message);
  }

  const { error: insertError } = await supabase.from('sequences').insert({
    customer_id: params.id,
    restaurant_id: restaurant.restaurant_id,
    type: 'manual',
    message,
    channel,
    sent_at: new Date().toISOString(),
    opened: false,
    clicked: false,
    converted: false,
  });

  if (insertError) {
    console.error('[send] insert error:', insertError.message);
  }

  return NextResponse.json({ success: true, delivered: sent });
}
