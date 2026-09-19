import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2026-03-25.dahlia',
    });
  }
  return _stripe;
}

// Re-export as `stripe` proxy for convenience
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Plan definitions — these are the source of truth for pricing and limits.
// When pricing changes: update price + priceDisplay here, and create new Stripe
// Price IDs in the dashboard, then update STRIPE_*_PRICE_ID env vars.
export const PLANS = {
  starter: {
    name: 'Starter',
    price: 0,
    priceId: process.env.STRIPE_STARTER_PRICE_ID || '',
    priceDisplay: 'Free',
    features: ['Up to 100 customers', 'Reviews inbox (read-only)', 'Basic reservations', '1 user'],
    limits: { customers: 100, sequences: 3, users: 1, ai_requests: 10 },
  },
  growth: {
    name: 'Growth',
    price: 299,
    priceId: process.env.STRIPE_GROWTH_PRICE_ID || '',
    priceDisplay: '$299/mo',
    features: [
      'Up to 1,000 customers',
      'AI review responses (Reputation Shield)',
      'AI Sentiment Responder',
      'Dead Hour Optimizer',
      'Automated email/SMS sequences',
      'Gift cards, loyalty, referrals',
      'Reservations + waitlist',
      'Kitchen display + online orders',
      'Basic inventory + menu management',
      'Tables & floor plan',
      'Events, goals, dead hours',
      'Basic analytics dashboard',
      '3 users',
    ],
    limits: { customers: 1000, sequences: 20, users: 3, ai_requests: 100 },
  },
  pro: {
    name: 'Pro',
    price: 499,
    priceId: process.env.STRIPE_PRO_PRICE_ID || '',
    priceDisplay: '$499/mo',
    features: [
      'Everything in Growth',
      'Multi-location compare',
      'Corporate accounts (B2B)',
      'Catering client CRM',
      'Vendor contracts + purchase orders',
      'Maintenance tickets',
      'Recipe scaling & costing',
      'Performance reviews + payroll',
      'Full financial analytics stack',
      'Outreach pipeline',
      'Webhooks + API access',
      'Competitor tracking',
      'White-label reports',
      'Unlimited users',
      'Priority support',
    ],
    limits: { customers: Infinity, sequences: Infinity, users: Infinity, ai_requests: Infinity },
  },
  enterprise: {
    name: 'Enterprise',
    price: 0, // contact sales
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || '',
    priceDisplay: 'Contact us',
    features: [
      'Everything in Pro',
      'Custom integrations (Toast, Square, Oracle, NetSuite)',
      'SSO / SAML',
      'Dedicated success manager',
      'SLA + 24/7 phone support',
      'On-site training',
      'Custom reporting',
      'Custom security addenda (DPA, BAA on request)',
    ],
    limits: { customers: Infinity, sequences: Infinity, users: Infinity, ai_requests: Infinity },
  },
} as const;

export type PlanTier = keyof typeof PLANS;

export function getPlanLimits(tier: PlanTier) {
  return PLANS[tier].limits;
}

export function canAccess(tier: PlanTier, feature: string): boolean {
  const featureGates: Record<string, PlanTier[]> = {
    // Growth-and-above (core features)
    ai_review_response: ['growth', 'pro', 'enterprise'],
    sentiment_responder: ['growth', 'pro', 'enterprise'],
    dead_hours: ['growth', 'pro', 'enterprise'],
    catering: ['growth', 'pro', 'enterprise'],
    pdf_reports: ['growth', 'pro', 'enterprise'],
    referrals: ['growth', 'pro', 'enterprise'],
    surveys: ['growth', 'pro', 'enterprise'],
    sequence_builder: ['growth', 'pro', 'enterprise'],
    gift_cards: ['growth', 'pro', 'enterprise'],
    loyalty: ['growth', 'pro', 'enterprise'],
    events: ['growth', 'pro', 'enterprise'],
    goals: ['growth', 'pro', 'enterprise'],
    basic_analytics: ['growth', 'pro', 'enterprise'],

    // Pro-and-above (advanced features)
    multi_location: ['pro', 'enterprise'],
    corporate: ['pro', 'enterprise'],
    catering_clients: ['pro', 'enterprise'],
    vendors: ['pro', 'enterprise'],
    purchase_orders: ['pro', 'enterprise'],
    maintenance: ['pro', 'enterprise'],
    recipes: ['pro', 'enterprise'],
    performance_reviews: ['pro', 'enterprise'],
    payroll: ['pro', 'enterprise'],
    outreach: ['pro', 'enterprise'],
    deep_analytics: ['pro', 'enterprise'],
    ai_analytics: ['pro', 'enterprise'],
    webhooks: ['pro', 'enterprise'],
    api_access: ['pro', 'enterprise'],
    competitors: ['pro', 'enterprise'],

    // Enterprise-only
    sso: ['enterprise'],
    custom_integrations: ['enterprise'],
    sla: ['enterprise'],
  };
  const allowed = featureGates[feature] || ['starter', 'growth', 'pro', 'enterprise'];
  return allowed.includes(tier);
}
