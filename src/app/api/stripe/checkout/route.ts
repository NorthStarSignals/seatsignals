import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { stripe, PLANS } from '@/lib/stripe';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { plan } = await request.json();
  if (!plan || !PLANS[plan as keyof typeof PLANS]) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id, name, stripe_customer_id')
    .eq('clerk_user_id', userId)
    .single();

  const planConfig = PLANS[plan as keyof typeof PLANS];

  // Create or get Stripe customer
  let customerId = restaurant?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { clerk_user_id: userId, restaurant_id: restaurant?.restaurant_id || '' },
    });
    customerId = customer.id;

    if (restaurant) {
      await supabase
        .from('restaurants')
        .update({ stripe_customer_id: customerId })
        .eq('restaurant_id', restaurant.restaurant_id);
    }
  }

  // Create a price on the fly (in production, use pre-created Stripe prices)
  const price = await stripe.prices.create({
    unit_amount: planConfig.price,
    currency: 'usd',
    recurring: { interval: 'month' },
    product_data: { name: `SeatSignals ${planConfig.name}` },
  });

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: price.id, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?billing=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`,
    subscription_data: {
      trial_period_days: 30,
      metadata: { plan, restaurant_id: restaurant?.restaurant_id || '' },
    },
  });

  return NextResponse.json({ url: session.url });
}
