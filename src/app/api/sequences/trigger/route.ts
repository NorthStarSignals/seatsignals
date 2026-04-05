import { createServerSupabase } from '@/lib/supabase';
import { sendSMS, sendEmail } from '@/lib/messaging';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = createServerSupabase();

  // Check if retention sequences are enabled globally
  // (runs across all restaurants, so check per-restaurant below)
  const now = new Date();

  // 1. Thank you SMS - customers captured within the last 2 hours who haven't gotten a thank-you yet
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);

  const { data: recentCustomers } = await supabase
    .from('customers')
    .select('customer_id, restaurant_id, first_name, phone, email')
    .gte('first_seen', twoHoursAgo.toISOString())
    .lte('first_seen', oneHourAgo.toISOString())
    .not('phone', 'is', null);

  if (recentCustomers) {
    for (const customer of recentCustomers) {
      // Check if already sent
      const { data: existing } = await supabase
        .from('sequences')
        .select('sequence_id')
        .eq('customer_id', customer.customer_id)
        .eq('type', 'retention')
        .like('message', '%Thanks for visiting%')
        .single();

      if (existing) continue;

      // Check if retention sequence is enabled for this restaurant
      const { data: seqDef } = await supabase
        .from('sequence_definitions')
        .select('enabled, message_template')
        .eq('restaurant_id', customer.restaurant_id)
        .eq('type', 'retention')
        .single();

      if (seqDef && !seqDef.enabled) continue;

      // Get restaurant name
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('name')
        .eq('restaurant_id', customer.restaurant_id)
        .single();

      if (!restaurant || !customer.phone) continue;

      const template = seqDef?.message_template || 'Thanks for visiting {{restaurant_name}}! Show this text next time for 10% off.';
      const message = template.replace('{{restaurant_name}}', restaurant.name).replace('{{first_name}}', customer.first_name || 'friend');
      await sendSMS(customer.phone, message);

      await supabase.from('sequences').insert({
        customer_id: customer.customer_id,
        restaurant_id: customer.restaurant_id,
        type: 'retention',
        message,
        opened: false,
        clicked: false,
        converted: false,
      });
    }
  }

  // 2. Day 14 come-back email
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const thirteenDaysAgo = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000);

  const { data: day14Customers } = await supabase
    .from('customers')
    .select('customer_id, restaurant_id, first_name, email')
    .gte('first_seen', fourteenDaysAgo.toISOString())
    .lte('first_seen', thirteenDaysAgo.toISOString());

  if (day14Customers) {
    for (const customer of day14Customers) {
      const { data: existing } = await supabase
        .from('sequences')
        .select('sequence_id')
        .eq('customer_id', customer.customer_id)
        .eq('type', 'retention')
        .like('message', '%couple weeks%')
        .single();

      if (existing) continue;

      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('name')
        .eq('restaurant_id', customer.restaurant_id)
        .single();

      if (!restaurant) continue;

      const subject = `It's been a couple weeks, ${customer.first_name || 'friend'}!`;
      const html = `<p>It's been a couple weeks since your last visit to ${restaurant.name}. Here's 10% off to come back!</p><p>Just show this email to your server.</p>`;

      await sendEmail(customer.email, subject, html);

      await supabase.from('sequences').insert({
        customer_id: customer.customer_id,
        restaurant_id: customer.restaurant_id,
        type: 'retention',
        message: `Day 14 come-back email: couple weeks since visit, 10% off`,
      });
    }
  }

  // 3. Day 30 we-miss-you SMS
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const twentyNineDaysAgo = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);

  const { data: day30Customers } = await supabase
    .from('customers')
    .select('customer_id, restaurant_id, first_name, phone')
    .gte('first_seen', thirtyDaysAgo.toISOString())
    .lte('first_seen', twentyNineDaysAgo.toISOString())
    .not('phone', 'is', null);

  if (day30Customers) {
    for (const customer of day30Customers) {
      const { data: existing } = await supabase
        .from('sequences')
        .select('sequence_id')
        .eq('customer_id', customer.customer_id)
        .eq('type', 'retention')
        .like('message', '%miss you%')
        .single();

      if (existing) continue;

      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('name')
        .eq('restaurant_id', customer.restaurant_id)
        .single();

      if (!restaurant || !customer.phone) continue;

      const message = `We miss you at ${restaurant.name}! Stop by this week and your appetizer is on us.`;
      await sendSMS(customer.phone, message);

      await supabase.from('sequences').insert({
        customer_id: customer.customer_id,
        restaurant_id: customer.restaurant_id,
        type: 'retention',
        message: `Day 30 we-miss-you SMS: appetizer on us`,
      });
    }
  }

  return NextResponse.json({ success: true });
}
