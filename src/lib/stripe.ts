import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-03-25.dahlia',
    });
  }
  return _stripe;
}

// Re-export as `stripe` getter for convenience
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const PLANS = {
  starter: {
    name: 'Starter',
    price: 14900, // cents
    priceDisplay: '$149/mo',
    features: [
      'Data Trap (Customer Capture)',
      'Reputation Shield (Review AI)',
      'Birthday & Anniversary Automation',
      'Unlimited contacts',
      'Monthly revenue report',
    ],
  },
  growth: {
    name: 'Growth',
    price: 29900,
    priceDisplay: '$299/mo',
    features: [
      'Everything in Starter',
      'Catering Hunter (B2B Outbound)',
      'Dead Hours Engine',
      'Full demand generation',
    ],
  },
  pro: {
    name: 'Pro',
    price: 49900,
    priceDisplay: '$499/mo',
    features: [
      'Everything in Growth',
      'Corporate Account Dashboard',
      'Delivery Audit',
      'Priority support',
      'Full operating system',
    ],
  },
} as const;
