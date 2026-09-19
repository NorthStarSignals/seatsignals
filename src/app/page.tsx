'use client';

import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Brain,
  Calendar,
  ChefHat,
  CreditCard,
  Gift,
  LineChart,
  MessageSquare,
  Package,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Zap,
  CheckCircle2,
} from 'lucide-react';

const PILLARS = [
  { icon: Calendar, title: 'Reservations & Floor', desc: 'Smart booking, capacity, no-show prevention, table-side payments.' },
  { icon: Package, title: 'Inventory & Ops', desc: 'Par levels, waste tracking, vendor contracts, recipe scaling.' },
  { icon: Users, title: 'Staff & Payroll', desc: 'Scheduling, time clock, tip pooling, performance reviews.' },
  { icon: MessageSquare, title: 'Marketing & CRM', desc: 'Email/SMS campaigns, segments, win-back, dead-hour offers.' },
  { icon: Gift, title: 'Loyalty & VIP', desc: 'Points, rewards, referrals, gift cards, birthday automation.' },
  { icon: ChefHat, title: 'Catering & Events', desc: 'Lead capture, packages, corporate accounts, proposals.' },
  { icon: LineChart, title: 'Analytics & AI', desc: 'Forecasting, sentiment, profitability, weather-aware insights.' },
];

const STATS = [
  { value: '1', label: 'Dashboard, instead of 6 tools' },
  { value: '15 min', label: 'From signup to first insight' },
  { value: '7', label: 'Integrated revenue pillars' },
  { value: 'AI', label: 'Review replies in your brand voice' },
];

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/dashboard');
    }
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="min-h-screen bg-seat-black text-white">
      {/* Nav */}
      <nav className="border-b border-zinc-800 backdrop-blur-sm bg-seat-black/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Seat<span className="text-seat-red">Signals</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <a href="#features" className="text-zinc-400 hover:text-white transition">Features</a>
            <a href="#pillars" className="text-zinc-400 hover:text-white transition">Platform</a>
            <a href="#integrations" className="text-zinc-400 hover:text-white transition">Integrations</a>
            <Link href="/pricing" className="text-zinc-400 hover:text-white transition">Pricing</Link>
            <Link href="/changelog" className="text-zinc-400 hover:text-white transition">Changelog</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-sm text-zinc-400 hover:text-white transition">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="px-4 py-2 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg text-sm font-medium transition"
            >
              Start free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-seat-red/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-seat-red/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-seat-red/10 border border-seat-red/30 rounded-full text-sm text-seat-red mb-8">
            <Sparkles className="w-4 h-4" />
            <span>The Restaurant Revenue Operating System</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl mx-auto leading-[1.05]">
            Run your restaurant<br />
            <span className="bg-gradient-to-r from-seat-red to-orange-400 bg-clip-text text-transparent">
              like the future runs it
            </span>
          </h1>

          <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
            Reservations, inventory, staff, marketing, loyalty, catering, and AI analytics — in one
            dashboard. Connect Square, Klaviyo, and your review platforms in minutes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/sign-up"
              className="px-8 py-4 bg-seat-red hover:bg-seat-red/90 text-white rounded-xl font-semibold flex items-center gap-2 transition shadow-lg shadow-seat-red/20"
            >
              Start free — no credit card
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="mailto:hello@seatsignals.app?subject=Demo%20request"
              className="px-8 py-4 bg-seat-card border border-zinc-800 hover:border-zinc-600 text-white rounded-xl font-semibold transition"
            >
              Book a 15-min demo
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {STATS.map((s) => (
              <div key={s.label} className="bg-seat-card border border-zinc-800 rounded-xl p-5">
                <div className="text-3xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-zinc-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-sm text-seat-red font-semibold mb-3">ONE PLATFORM</div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">The whole restaurant, one screen</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              SeatSignals replaces your POS add-ons, reservation system, inventory app, payroll tool, marketing CRM, and BI dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Brain, title: 'AI Sentiment Responder', desc: 'Generate tone-perfect replies to every review in seconds. Trained on your brand voice.' },
              { icon: Zap, title: 'Dead Hour Optimizer', desc: 'Auto-trigger flash deals during slow periods. Average 23% revenue lift.' },
              { icon: TrendingUp, title: 'Revenue Forecasting', desc: 'Weather-aware predictions for staffing, prep, and reservations.' },
              { icon: Star, title: 'Reputation Management', desc: 'Monitor Yelp, Google, and TripAdvisor in one inbox. AI suggests responses.' },
              { icon: CreditCard, title: 'Tableside Payments', desc: 'Tap-to-pay, split checks, and instant tips — no extra hardware.' },
              { icon: Shield, title: 'Privacy first', desc: 'TLS in transit, encrypted at rest. Your data never trains AI models. Guest consent tooling built in.' },
            ].map((f) => (
              <div key={f.title} className="bg-seat-card border border-zinc-800 rounded-xl p-6 hover:border-seat-red/50 transition group">
                <div className="w-10 h-10 rounded-lg bg-seat-red/10 flex items-center justify-center mb-4 group-hover:bg-seat-red/20 transition">
                  <f.icon className="w-5 h-5 text-seat-red" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7 Pillars */}
      <section id="pillars" className="py-24 border-t border-zinc-900 bg-gradient-to-b from-seat-black to-zinc-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-sm text-seat-red font-semibold mb-3">SEVEN PILLARS</div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Built for every part of the operation</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PILLARS.map((p) => (
              <div key={p.title} className="bg-seat-card border border-zinc-800 rounded-xl p-6">
                <p.icon className="w-6 h-6 text-seat-red mb-3" />
                <h3 className="font-semibold mb-2">{p.title}</h3>
                <p className="text-sm text-zinc-400">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations strip */}
      <section id="integrations" className="py-24 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="text-sm text-seat-red font-semibold mb-3">CONNECTS TO YOUR STACK</div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Works with the tools you already use</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Live today: Square POS, Klaviyo, Twilio, Yelp, Google Reviews. Coming next: Toast, Clover, Resy,
              OpenTable, QuickBooks.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[
              { name: 'Square', live: true },
              { name: 'Klaviyo', live: true },
              { name: 'Twilio', live: true },
              { name: 'Yelp', live: true },
              { name: 'Google', live: true },
              { name: 'Toast', live: false },
              { name: 'Clover', live: false },
              { name: 'Resy', live: false },
              { name: 'OpenTable', live: false },
              { name: 'QuickBooks', live: false },
            ].map((i) => (
              <div
                key={i.name}
                className={`bg-seat-card border rounded-xl py-5 px-4 text-center ${
                  i.live ? 'border-green-500/30' : 'border-zinc-800 opacity-60'
                }`}
              >
                <div className="font-semibold text-sm">{i.name}</div>
                <div className={`text-[10px] mt-1 font-medium ${i.live ? 'text-green-400' : 'text-zinc-500'}`}>
                  {i.live ? '● Live' : 'Coming soon'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-zinc-900">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready in 3 minutes</h2>
          <p className="text-xl text-zinc-400 mb-10">
            Free forever for solo operators. No credit card. No setup fees.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link
              href="/sign-up"
              className="px-8 py-4 bg-seat-red hover:bg-seat-red/90 text-white rounded-xl font-semibold flex items-center gap-2 transition shadow-lg shadow-seat-red/20"
            >
              Start free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-4 bg-seat-card border border-zinc-800 hover:border-zinc-600 text-white rounded-xl font-semibold transition"
            >
              View pricing
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-500">
            {['No credit card', 'Cancel anytime', 'Encrypted at rest', 'Export your data anytime'].map((b) => (
              <div key={b} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                {b}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
          <div>© 2026 SeatSignals. All rights reserved.</div>
          <div className="flex items-center gap-6">
            <Link href="/pricing" className="hover:text-white transition">Pricing</Link>
            <Link href="/changelog" className="hover:text-white transition">Changelog</Link>
            <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition">Terms</Link>
            <a href="mailto:hello@seatsignals.app" className="hover:text-white transition">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
