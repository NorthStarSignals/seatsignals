import { createServerSupabase } from '@/lib/supabase';
import { sendSMS } from '@/lib/messaging';
import { NextResponse } from 'next/server';

function generateCode(): string {
  return 'DH' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function POST() {
  const supabase = createServerSupabase();
  const now = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDay = dayNames[now.getDay()];
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinutes;

  // Get all restaurants with dead hours config
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('restaurant_id, name, dead_hours_config');

  if (!restaurants) return NextResponse.json({ processed: 0 });

  let totalSent = 0;

  for (const restaurant of restaurants) {
    // Check if dead_hours sequence is enabled
    const { data: seqDef } = await supabase
      .from('sequence_definitions')
      .select('enabled')
      .eq('restaurant_id', restaurant.restaurant_id)
      .eq('type', 'dead_hours')
      .single();

    if (seqDef && !seqDef.enabled) continue;

    const config = restaurant.dead_hours_config || [];

    for (const window of config) {
      if (window.day !== currentDay) continue;

      // Parse start time
      const [startH, startM] = window.start.split(':').map(Number);
      const windowStartMinutes = startH * 60 + startM;
      const twoHoursBefore = windowStartMinutes - 120;

      // Trigger if we're within 2 hours before the window starts
      if (currentTimeMinutes < twoHoursBefore || currentTimeMinutes > windowStartMinutes) continue;

      // Get customers with phone numbers for this restaurant
      const { data: customers } = await supabase
        .from('customers')
        .select('customer_id, phone, first_name')
        .eq('restaurant_id', restaurant.restaurant_id)
        .not('phone', 'is', null)
        .limit(500);

      if (!customers) continue;

      for (const customer of customers) {
        if (!customer.phone) continue;

        const code = generateCode();
        const message = `${restaurant.name} has open tables right now. Show this text for 15% off your meal. Valid until ${window.end} today. Code: ${code}`;

        await sendSMS(customer.phone, message);

        await supabase.from('dead_hours').insert({
          restaurant_id: restaurant.restaurant_id,
          day_of_week: currentDay,
          time_start: window.start,
          time_end: window.end,
          promotion_type: '15% off',
          channel: 'sms',
          redemption_code: code,
        });

        await supabase.from('sequences').insert({
          customer_id: customer.customer_id,
          restaurant_id: restaurant.restaurant_id,
          type: 'dead_hours',
          message: `Dead hours SMS: 15% off, code ${code}`,
        });

        totalSent++;
      }
    }
  }

  return NextResponse.json({ success: true, sent: totalSent });
}
