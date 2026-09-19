'use client';

import Link from 'next/link';
import { Check, X, Sparkles, ArrowRight } from 'lucide-react';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'See your restaurant come alive',
    price: 0,
    priceLabel: 'Free',
    cta: 'Start free',
    badge: null,
    features: [
      { name: 'Up to 100 customers', included: true },
      { name: 'Reviews inbox (read-only)', included: true },
      { name: 'Basic reservations', included: true },
      { name: '1 user account', included: true },
      { name: '10 AI requests / month', included: true },
      { name: 'AI Sentiment Responder', included: false },
      { name: 'Dead Hour Optimizer', included: false },
      { name: 'Loyalty + Gift Cards', included: false },
      { name: 'Kitchen + Online Orders', included: false },
      { name: 'Multi-location + Corporate', included: false },
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    tagline: 'For the single-location operator',
    price: 299,
    priceLabel: '$299',
    cta: 'Start 14-day trial',
    badge: 'Most Popular',
    features: [
      { name: 'Up to 1,000 customers', included: true },
      { name: 'AI Sentiment Responder', included: true },
      { name: 'Reputation Shield (auto-reply)', included: true },
      { name: 'Dead Hour Optimizer', included: true },
      { name: 'Loyalty program + Gift Cards', included: true },
      { name: 'Reservations + Waitlist', included: true },
      { name: 'Kitchen display + Online Orders', included: true },
      { name: 'Inventory + Menu management', included: true },
      { name: 'Tables + Floor Plan', included: true },
      { name: 'Events, Goals, Dead Hours', included: true },
      { name: 'Basic analytics dashboard', included: true },
      { name: 'Email + SMS campaigns', included: true },
      { name: '3 user accounts', included: true },
      { name: 'Multi-location Compare', included: false },
      { name: 'Corporate Accounts (B2B)', included: false },
      { name: 'Deep financial analytics', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For multi-unit groups & data-hungry operators',
    price: 499,
    priceLabel: '$499',
    cta: 'Talk to sales',
    badge: null,
    features: [
      { name: 'Everything in Growth', included: true },
      { name: 'Multi-Location Compare', included: true },
      { name: 'Corporate Accounts (B2B)', included: true },
      { name: 'Catering Client CRM', included: true },
      { name: 'Vendor Contracts + POs', included: true },
      { name: 'Maintenance tickets', included: true },
      { name: 'Recipe scaling + costing', included: true },
      { name: 'Performance Reviews + Payroll', included: true },
      { name: 'Full financial analytics stack', included: true },
      { name: 'Outreach pipeline (Apollo sync)', included: true },
      { name: 'Webhooks + full API access', included: true },
      { name: 'Competitor tracking', included: true },
      { name: 'White-label reports', included: true },
      { name: 'Unlimited users', included: true },
      { name: 'Priority support', included: true },
    ],
  },
];

const FAQ = [
  { q: 'Do I need a credit card to start?', a: 'No. Starter is free forever and requires no credit card. Growth comes with a 14-day free trial.' },
  { q: 'Can I switch plans later?', a: 'Yes, instantly. Upgrades are prorated and downgrades take effect at the end of your billing cycle.' },
  { q: "What's the difference between Growth and Pro?", a: 'Growth is built for a single location running day-to-day ops. Pro adds multi-location comparison, B2B corporate accounts, deep financial analytics, vendor/PO workflows, and unlimited users — what you need when the business gets bigger than one building.' },
  { q: 'What integrations do you support?', a: 'Live today: Square POS, Klaviyo, Twilio, Yelp, Google Reviews, Stripe billing. On the roadmap: Toast, Clover, Resy, OpenTable, DoorDash, UberEats, QuickBooks, Xero. You can upvote roadmap integrations inside the app.' },
  { q: 'Is my data secure?', a: 'TLS in transit, encrypted at rest via our infrastructure providers (Vercel, Supabase, Clerk, Stripe). Multi-tenant isolation enforced at the database level. Your data never trains AI models. We are pursuing SOC 2 — ask us for the latest status.' },
  { q: 'How long does setup take?', a: 'Most restaurants are live in about 15 minutes via our 6-step onboarding wizard. Pro customers get a hands-on walkthrough call.' },
  { q: 'Do you offer enterprise pricing?', a: 'Yes. For groups with 5+ locations, custom integrations, SSO, or custom security addenda (DPA, etc.), contact hello@seatsignals.app.' },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-seat-black text-white">
      <nav className="border-b border-zinc-800 backdrop-blur-sm bg-seat-black/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Seat<span className="text-seat-red">Signals</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <Link href="/#features" className="text-zinc-400 hover:text-white transition">Features</Link>
            <Link href="/#pillars" className="text-zinc-400 hover:text-white transition">Platform</Link>
            <Link href="/#integrations" className="text-zinc-400 hover:text-white transition">Integrations</Link>
            <Link href="/pricing" className="text-white">Pricing</Link>
            <Link href="/changelog" className="text-zinc-400 hover:text-white transition">Changelog</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-sm text-zinc-400 hover:text-white transition">Sign in</Link>
            <Link href="/sign-up" className="px-4 py-2 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg text-sm font-medium">Start free</Link>
          </div>
        </div>
      </nav>

      <section className="pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-seat-red/10 border border-seat-red/30 rounded-full text-sm text-seat-red mb-6">
          <Sparkles className="w-4 h-4" />
          Start free, upgrade when AI pays for itself
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-4">Simple, honest pricing</h1>
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
          One flat price. Replaces $1,000+ of competing tools. Cancel anytime.
        </p>
      </section>

      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-seat-card border rounded-2xl p-8 ${
                  plan.badge ? 'border-seat-red ring-1 ring-seat-red/30 scale-[1.02]' : 'border-zinc-800'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-seat-red text-white text-xs font-bold rounded-full uppercase tracking-wider">
                    {plan.badge}
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-sm text-zinc-500">{plan.tagline}</p>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold">{plan.priceLabel}</span>
                    {plan.price > 0 && <span className="text-zinc-500">/mo</span>}
                  </div>
                  {plan.price === 0 && (
                    <div className="text-xs text-zinc-500 mt-1">forever, no card required</div>
                  )}
                </div>
                <Link
                  href={plan.id === 'pro' ? '/sign-up?plan=pro' : '/sign-up'}
                  className={`w-full block text-center py-3 rounded-lg font-semibold transition mb-6 ${
                    plan.badge
                      ? 'bg-seat-red hover:bg-seat-red/90 text-white'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                  }`}
                >
                  {plan.cta}
                </Link>
                <div className="space-y-3">
                  {plan.features.map((f) => (
                    <div key={f.name} className="flex items-start gap-2 text-sm">
                      {f.included ? (
                        <Check className="w-4 h-4 text-seat-red flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-4 h-4 text-zinc-700 flex-shrink-0 mt-0.5" />
                      )}
                      <span className={f.included ? 'text-zinc-300' : 'text-zinc-600'}>{f.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-zinc-500">
              Need 5+ locations, SSO, or a custom integration?{' '}
              <Link href="mailto:sales@seatsignals.app" className="text-seat-red hover:underline">
                Talk to us about Enterprise →
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-zinc-900 bg-zinc-950">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-3">Replace your entire stack</h2>
            <p className="text-zinc-400">Growth pays for itself in week one.</p>
          </div>

          <div className="bg-seat-card border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900">
                <tr className="text-zinc-400">
                  <th className="text-left py-4 px-6">Tool you&apos;re replacing</th>
                  <th className="text-right py-4 px-6">Typical cost/mo</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['OpenTable / Resy', '$249'],
                  ['Toast Marketing add-on', '$75'],
                  ['7shifts (staff)', '$70'],
                  ['MarginEdge (inventory)', '$330'],
                  ['Mailchimp + Klaviyo', '$120'],
                  ['Custom BI dashboards', '$200'],
                ].map(([tool, cost]) => (
                  <tr key={tool} className="border-t border-zinc-800">
                    <td className="py-4 px-6 text-white">{tool}</td>
                    <td className="py-4 px-6 text-right text-zinc-400">{cost}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-seat-red bg-seat-red/5">
                  <td className="py-4 px-6 font-bold">Total replaced</td>
                  <td className="py-4 px-6 text-right font-bold">$1,044/mo</td>
                </tr>
                <tr className="border-t border-zinc-800">
                  <td className="py-4 px-6 text-white font-semibold">SeatSignals Growth</td>
                  <td className="py-4 px-6 text-right text-seat-red font-bold text-lg">$299/mo</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-zinc-900">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-12">Frequently asked</h2>
          <div className="space-y-4">
            {FAQ.map((item) => (
              <div key={item.q} className="bg-seat-card border border-zinc-800 rounded-xl p-6">
                <h3 className="font-semibold mb-2">{item.q}</h3>
                <p className="text-sm text-zinc-400">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-zinc-900">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-4">Try it free for 14 days</h2>
          <p className="text-zinc-400 mb-8">No credit card. Full access to Growth. Cancel anytime.</p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-8 py-4 bg-seat-red hover:bg-seat-red/90 text-white rounded-xl font-semibold transition shadow-lg shadow-seat-red/20"
          >
            Start free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-zinc-900 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
          <div>© 2026 SeatSignals. All rights reserved.</div>
          <div className="flex items-center gap-6">
            <Link href="/pricing" className="hover:text-white transition">Pricing</Link>
            <a href="#" className="hover:text-white transition">Privacy</a>
            <a href="#" className="hover:text-white transition">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
