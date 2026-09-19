import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { stripe, PLANS, getPlanLimits } from '@/lib/stripe';
import type { PlanTier } from '@/lib/stripe';
import { NextResponse } from 'next/server';

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();

  const { data: restaurant, error } = await supabase
    .from('restaurants')
    .select('restaurant_id, name, subscription_tier, stripe_customer_id, stripe_subscription_id')
    .eq('clerk_user_id', userId)
    .single();

  if (error || !restaurant) {
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
  }

  const tier = (restaurant.subscription_tier || 'starter') as PlanTier;
  const plan = PLANS[tier];
  const limits = getPlanLimits(tier);

  // Fetch usage stats
  const [customerCount, sequenceCount] = await Promise.all([
    supabase
      .from('customers')
      .select('customer_id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurant.restaurant_id),
    supabase
      .from('sequence_definitions')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurant.restaurant_id),
  ]);

  return NextResponse.json({
    tier,
    plan: {
      name: plan.name,
      price: plan.price,
      priceDisplay: plan.priceDisplay,
      features: plan.features,
    },
    limits,
    usage: {
      customers: customerCount.count || 0,
      sequences: sequenceCount.count || 0,
      users: 1, // TODO: multi-user support
      ai_requests: 0, // TODO: track AI usage
    },
    stripe_customer_id: restaurant.stripe_customer_id,
    stripe_subscription_id: restaurant.stripe_subscription_id,
  });
}

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { plan } = await request.json();
  if (!plan || !PLANS[plan as PlanTier]) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const planConfig = PLANS[plan as PlanTier];
  if (planConfig.price === 0) {
    return NextResponse.json({ error: 'Cannot checkout for free plan' }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id, name, stripe_customer_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) {
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
  }

  // Create or get Stripe customer
  let customerId = restaurant.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: {
        clerk_user_id: userId,
        restaurant_id: restaurant.restaurant_id,
      },
    });
    customerId = customer.id;
    await supabase
      .from('restaurants')
      .update({ stripe_customer_id: customerId })
      .eq('restaurant_id', restaurant.restaurant_id);
  }

  // Create checkout session with the plan's priceId
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: planConfig.priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
    subscription_data: {
      metadata: { plan, restaurant_id: restaurant.restaurant_id },
    },
  });

  return NextResponse.json({ checkout_url: session.url });
}
