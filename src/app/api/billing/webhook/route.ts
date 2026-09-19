import { stripe, PLANS } from '@/lib/stripe';
import type { PlanTier } from '@/lib/stripe';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// Map Stripe price IDs back to plan tiers
function tierFromPriceId(priceId: string): PlanTier {
  for (const [tier, plan] of Object.entries(PLANS)) {
    if (plan.priceId === priceId) return tier as PlanTier;
  }
  return 'starter';
}

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createServerSupabase();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const plan = session.metadata?.plan || (session as any).subscription_details?.metadata?.plan;

      const tier = (plan && plan in PLANS ? plan : 'growth') as PlanTier;

      await supabase
        .from('restaurants')
        .update({
          subscription_tier: tier,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
        })
        .eq('stripe_customer_id', customerId);

      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const customerId = subscription.customer as string;

      // Determine tier from the subscription's current price
      const priceId = subscription.items?.data?.[0]?.price?.id;
      const plan = subscription.metadata?.plan;
      let tier: PlanTier = 'starter';

      if (plan && plan in PLANS) {
        tier = plan as PlanTier;
      } else if (priceId) {
        tier = tierFromPriceId(priceId);
      }

      await supabase
        .from('restaurants')
        .update({ subscription_tier: tier })
        .eq('stripe_customer_id', customerId);

      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const customerId = subscription.customer as string;

      await supabase
        .from('restaurants')
        .update({
          subscription_tier: 'starter',
          stripe_subscription_id: null,
        })
        .eq('stripe_customer_id', customerId);

      break;
    }
  }

  return NextResponse.json({ received: true });
}
