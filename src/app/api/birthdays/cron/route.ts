import { createServerSupabase } from '@/lib/supabase';
import { sendSMS, sendEmail } from '@/lib/messaging';
import { NextResponse } from 'next/server';

function generateCode(): string {
  return 'BD' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function POST() {
  const supabase = createServerSupabase();
  const now = new Date();
  const currentYear = now.getFullYear();

  // Get all customers with birthdays
  const { data: customers } = await supabase
    .from('customers')
    .select('customer_id, restaurant_id, first_name, email, phone, birthday, first_seen')
    .not('birthday', 'is', null);

  if (!customers) return NextResponse.json({ processed: 0 });

  let processed = 0;

  for (const customer of customers) {
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('name')
      .eq('restaurant_id', customer.restaurant_id)
      .single();

    if (!restaurant) continue;

    // Birthday check
    if (customer.birthday) {
      const bday = new Date(customer.birthday);
      const thisYearBday = new Date(currentYear, bday.getMonth(), bday.getDate());
      const diffDays = Math.round((thisYearBday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Check if event already exists this year
      const { data: existingEvent } = await supabase
        .from('birthday_events')
        .select('event_id')
        .eq('customer_id', customer.customer_id)
        .eq('event_type', 'birthday')
        .eq('year', currentYear)
        .single();

      if (!existingEvent) {
        const code = generateCode();

        if (diffDays === 7) {
          // 7 days before - send email
          const subject = `${customer.first_name || 'Hey'}, your birthday is coming up!`;
          const html = `<p>Celebrate with us at ${restaurant.name}. Your dessert is on the house when you dine in this week. Just show this message to your server.</p><p><strong>Code: ${code}</strong></p>`;
          await sendEmail(customer.email, subject, html);

          await supabase.from('birthday_events').insert({
            customer_id: customer.customer_id,
            restaurant_id: customer.restaurant_id,
            event_type: 'birthday',
            redemption_code: code,
            year: currentYear,
          });
          processed++;
        } else if (diffDays === 0 && customer.phone) {
          // Day of - send SMS
          const message = `Happy birthday ${customer.first_name || ''}! Your free dessert is waiting at ${restaurant.name}. Show this message to your server. Code: ${code}`;
          await sendSMS(customer.phone, message);

          await supabase.from('birthday_events').insert({
            customer_id: customer.customer_id,
            restaurant_id: customer.restaurant_id,
            event_type: 'birthday',
            redemption_code: code,
            year: currentYear,
          });
          processed++;
        } else if (diffDays === -1) {
          // 1 day after - check if redeemed, send follow-up email
          const { data: unredeemed } = await supabase
            .from('birthday_events')
            .select('event_id')
            .eq('customer_id', customer.customer_id)
            .eq('event_type', 'birthday')
            .eq('year', currentYear)
            .eq('redeemed', false)
            .single();

          if (unredeemed) {
            const subject = `Hope you had an amazing birthday!`;
            const html = `<p>Your free dessert offer at ${restaurant.name} is good through the end of the week. Show this email to your server!</p>`;
            await sendEmail(customer.email, subject, html);
          }
        }
      }
    }

    // Anniversary check
    if (customer.first_seen) {
      const firstVisit = new Date(customer.first_seen);
      const yearsAgo = currentYear - firstVisit.getFullYear();

      if (yearsAgo > 0) {
        const anniversary = new Date(currentYear, firstVisit.getMonth(), firstVisit.getDate());
        const diffDays = Math.round((anniversary.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          const { data: existingAnniv } = await supabase
            .from('birthday_events')
            .select('event_id')
            .eq('customer_id', customer.customer_id)
            .eq('event_type', 'anniversary')
            .eq('year', currentYear)
            .single();

          if (!existingAnniv) {
            const code = generateCode();
            const yearText = yearsAgo === 1 ? '1 year' : `${yearsAgo} years`;
            const message = `It's been ${yearText} since your first dinner with us, ${customer.first_name || 'friend'}. Your next appetizer is on the house as a thank you. Code: ${code}`;

            if (customer.phone) {
              await sendSMS(customer.phone, message);
            }
            await sendEmail(customer.email, `Happy Anniversary from ${restaurant.name}!`, `<p>${message}</p>`);

            await supabase.from('birthday_events').insert({
              customer_id: customer.customer_id,
              restaurant_id: customer.restaurant_id,
              event_type: 'anniversary',
              redemption_code: code,
              year: currentYear,
            });
            processed++;
          }
        }
      }
    }
  }

  return NextResponse.json({ success: true, processed });
}
