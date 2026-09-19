'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

const tiers = [
  {
    name: 'Bronze',
    pointsRequired: 0,
    color: 'from-amber-700 to-amber-600',
    border: 'border-amber-300',
    bg: 'bg-amber-50',
    badge: 'bg-amber-100 text-amber-800',
    icon: '🥉',
    benefits: [
      'Earn 1 point per $1 spent',
      'Birthday reward — free dessert',
      'Early access to new menu items',
      'Monthly newsletter with exclusive content',
    ],
  },
  {
    name: 'Silver',
    pointsRequired: 500,
    color: 'from-gray-500 to-gray-400',
    border: 'border-gray-300',
    bg: 'bg-gray-50',
    badge: 'bg-gray-100 text-gray-700',
    icon: '🥈',
    benefits: [
      'Earn 1.5x points per $1 spent',
      'Free appetizer every 5th visit',
      'Priority seating on weekdays',
      '10% off catering orders',
      'All Bronze benefits included',
    ],
  },
  {
    name: 'Gold',
    pointsRequired: 1500,
    color: 'from-yellow-500 to-amber-400',
    border: 'border-yellow-300',
    bg: 'bg-yellow-50',
    badge: 'bg-yellow-100 text-yellow-800',
    icon: '🥇',
    benefits: [
      'Earn 2x points per $1 spent',
      'Complimentary drink with every meal',
      'Priority seating anytime',
      'Exclusive seasonal tasting invites',
      '15% off catering orders',
      'All Silver benefits included',
    ],
  },
  {
    name: 'Platinum',
    pointsRequired: 5000,
    color: 'from-slate-800 to-slate-600',
    border: 'border-slate-400',
    bg: 'bg-slate-50',
    badge: 'bg-slate-200 text-slate-800',
    icon: '💎',
    benefits: [
      'Earn 3x points per $1 spent',
      'Complimentary entree on every 3rd visit',
      'Private dining room access',
      'Chef\'s table experience once per quarter',
      'Dedicated concierge booking line',
      '25% off catering orders',
      'All Gold benefits included',
    ],
  },
];

interface FormData {
  name: string;
  email: string;
  phone: string;
  birthday: string;
  marketingOptIn: boolean;
}

export default function LoyaltySignupPage() {
  const params = useParams();
  const slug = params.slug as string;
  const restaurantName = slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const [form, setForm] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    birthday: '',
    marketingOptIn: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!form.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\d\s\-+()]{7,}$/.test(form.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1200));
    setSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-white font-sans">
        {/* Success Header */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
          <div className="max-w-3xl mx-auto px-6 py-20 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur rounded-full mb-6">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-3">
              Welcome to the family, {form.name.split(' ')[0]}!
            </h1>
            <p className="text-lg text-emerald-100 max-w-md mx-auto">
              You&apos;ve successfully joined the {restaurantName} loyalty program.
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 -mt-8">
          {/* Points Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Your Current Tier</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">Bronze Member</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Points Balance</p>
                <p className="text-4xl font-bold text-emerald-600 mt-1">50</p>
              </div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <p className="text-emerald-800 text-sm font-medium">
                🎉 Welcome bonus! You&apos;ve received 50 points just for signing up.
                Earn 450 more points to reach Silver status.
              </p>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-16">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">What&apos;s Next?</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-emerald-700 font-bold text-sm">1</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Check your email</p>
                  <p className="text-sm text-gray-500">We sent a confirmation to {form.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-emerald-700 font-bold text-sm">2</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Dine with us</p>
                  <p className="text-sm text-gray-500">Earn points on every visit — just mention your name or phone number</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-emerald-700 font-bold text-sm">3</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Unlock rewards</p>
                  <p className="text-sm text-gray-500">Level up through tiers for bigger perks and exclusive experiences</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
          Powered by SeatSignals
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-3">
            {restaurantName}
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Join Our Loyalty Program
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Earn points with every visit, unlock exclusive rewards, and enjoy
            a dining experience tailored to you.
          </p>
        </div>
      </div>

      {/* Tiers Section */}
      <div className="max-w-6xl mx-auto px-6 -mt-10 mb-16 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl border ${tier.border} ${tier.bg} p-6 shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{tier.icon}</span>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{tier.name}</h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {tier.pointsRequired === 0
                      ? 'Starting tier'
                      : `${tier.pointsRequired.toLocaleString()} points`}
                  </p>
                </div>
              </div>
              <ul className="space-y-2">
                {tier.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <svg
                      className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Signup Form */}
      <div className="max-w-xl mx-auto px-6 pb-20">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
            Start Earning Today
          </h2>
          <p className="text-gray-500 mt-2">
            Sign up in seconds and get 50 bonus points instantly.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 space-y-5"
        >
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Jane Smith"
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.name ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-200'
              } bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition`}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jane@example.com"
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.email ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-200'
              } bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition`}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(555) 123-4567"
              className={`w-full px-4 py-3 rounded-xl border ${
                errors.phone ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-200'
              } bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition`}
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>

          {/* Birthday */}
          <div>
            <label htmlFor="birthday" className="block text-sm font-medium text-gray-700 mb-1.5">
              Birthday <span className="text-gray-400 text-xs font-normal">(optional — for your birthday reward!)</span>
            </label>
            <input
              id="birthday"
              type="date"
              value={form.birthday}
              onChange={(e) => setForm({ ...form, birthday: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition"
            />
          </div>

          {/* Marketing Opt-in */}
          <div className="flex items-start gap-3 pt-1">
            <input
              id="marketing"
              type="checkbox"
              checked={form.marketingOptIn}
              onChange={(e) => setForm({ ...form, marketingOptIn: e.target.checked })}
              className="mt-1 w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="marketing" className="text-sm text-gray-600 leading-snug">
              I&apos;d like to receive exclusive offers, event invitations, and updates
              via email and text. You can unsubscribe anytime.
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-base hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md shadow-emerald-200"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Signing up...
              </span>
            ) : (
              'Join & Earn 50 Bonus Points'
            )}
          </button>

          <p className="text-xs text-gray-400 text-center pt-1">
            By signing up you agree to our terms of service and privacy policy.
          </p>
        </form>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        Powered by SeatSignals
      </footer>
    </div>
  );
}
