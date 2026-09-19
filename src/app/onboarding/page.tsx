'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';

const TOTAL_STEPS = 6;

const CUISINE_TYPES = [
  'Italian', 'Mexican', 'American', 'Asian', 'Mediterranean',
  'Seafood', 'BBQ', 'Pizza', 'Other',
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_FULL: Record<string, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday',
  Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
};
const TIME_BLOCKS = [
  { label: 'Breakfast', key: 'breakfast', range: '6am-11am' },
  { label: 'Lunch', key: 'lunch', range: '11am-2pm' },
  { label: 'Afternoon', key: 'afternoon', range: '2pm-5pm' },
  { label: 'Dinner', key: 'dinner', range: '5pm-9pm' },
  { label: 'Late Night', key: 'late_night', range: '9pm-12am' },
];

const TIME_BLOCK_RANGES: Record<string, { start: string; end: string }> = {
  breakfast: { start: '06:00', end: '11:00' },
  lunch: { start: '11:00', end: '14:00' },
  afternoon: { start: '14:00', end: '17:00' },
  dinner: { start: '17:00', end: '21:00' },
  late_night: { start: '21:00', end: '00:00' },
};

const TONE_PILLS = [
  {
    label: 'Professional',
    template: 'We maintain a polished, professional tone. Our communication is clear, respectful, and service-oriented. We value precision and consistency in everything we do.',
  },
  {
    label: 'Casual & Fun',
    template: "We keep things light and friendly! Expect some humor, a relaxed vibe, and language that feels like chatting with a good friend. We don't take ourselves too seriously.",
  },
  {
    label: 'Upscale & Elegant',
    template: 'Our voice reflects sophistication and refinement. We use elevated language that conveys exclusivity, attention to detail, and a premium dining experience.',
  },
  {
    label: 'Family Friendly',
    template: "We're warm, welcoming, and inclusive. Our tone is approachable and inviting for guests of all ages. Think Sunday dinner at grandma's house — everyone belongs here.",
  },
  {
    label: 'Trendy & Modern',
    template: "We're on the pulse of what's new and exciting. Our voice is fresh, bold, and culturally aware. We speak to a younger, social-media-savvy crowd.",
  },
];

const PLANS = [
  {
    id: 'starter' as const,
    name: 'Starter',
    price: 'Free',
    priceNote: 'No credit card required',
    features: [
      'Basic dashboard',
      'Up to 100 customers',
      'Review monitoring',
      'Email support',
    ],
    badge: null,
  },
  {
    id: 'growth' as const,
    name: 'Growth',
    price: '$299',
    priceNote: '/month',
    features: [
      'Everything in Starter',
      'Unlimited customers',
      'AI review responses',
      'Dead hour promotions',
      'Automated sequences',
      'Priority support',
    ],
    badge: 'Most Popular',
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: '$499',
    priceNote: '/month',
    features: [
      'Everything in Growth',
      'Catering lead gen',
      'Corporate accounts',
      'Delivery optimization',
      'Customer enrichment',
      'Dedicated account manager',
    ],
    badge: null,
  },
];

// CSS-only confetti
function ConfettiPiece({ index }: { index: number }) {
  const colors = ['#E11D48', '#F43F5E', '#FB923C', '#FACC15', '#4ADE80', '#38BDF8', '#A78BFA'];
  const color = colors[index % colors.length];
  const left = `${10 + (index * 17) % 80}%`;
  const delay = `${(index * 0.15) % 2}s`;
  const duration = `${2.5 + (index * 0.3) % 1.5}s`;

  return (
    <div
      className="absolute w-2.5 h-2.5 opacity-0"
      style={{
        left,
        top: '-10px',
        backgroundColor: color,
        borderRadius: index % 3 === 0 ? '50%' : '2px',
        animation: `confetti-fall ${duration} ${delay} ease-out forwards`,
        transform: `rotate(${index * 45}deg)`,
      }}
    />
  );
}

// Checkmark icon
function Check({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [animating, setAnimating] = useState(false);

  // Step 2: Restaurant info
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [phone, setPhone] = useState('');

  // Step 3: Brand voice
  const [brandVoice, setBrandVoice] = useState('');
  const [selectedTone, setSelectedTone] = useState('');

  // Step 4: Dead hours grid — set of "day|block" keys
  const [deadHourBlocks, setDeadHourBlocks] = useState<Set<string>>(new Set());

  // Step 5: Plan
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'growth' | 'pro'>('starter');

  // Fade-in on mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const toggleDeadHour = (day: string, block: string) => {
    const key = `${day}|${block}`;
    setDeadHourBlocks(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const buildDeadHoursConfig = () => {
    return Array.from(deadHourBlocks).map(key => {
      const [day, block] = key.split('|');
      const range = TIME_BLOCK_RANGES[block];
      return { day: DAY_FULL[day], start: range.start, end: range.end };
    });
  };

  const goNext = () => {
    // Validation for step 2
    if (step === 2) {
      const errs: Record<string, string> = {};
      if (!name.trim()) errs.name = 'Restaurant name is required';
      if (!address.trim()) errs.address = 'Address is required';
      if (!cuisineType) errs.cuisineType = 'Please select a cuisine type';
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        return;
      }
      setErrors({});
    }

    setDirection('forward');
    setAnimating(true);
    setTimeout(() => {
      setStep(s => Math.min(s + 1, TOTAL_STEPS));
      setAnimating(false);
    }, 200);
  };

  const goBack = () => {
    setDirection('back');
    setAnimating(true);
    setTimeout(() => {
      setStep(s => Math.max(s - 1, 1));
      setAnimating(false);
    }, 200);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim(),
          cuisine_type: cuisineType,
          phone: phone.trim(),
          brand_voice: brandVoice.trim(),
          dead_hours_config: buildDeadHoursConfig(),
          subscription_tier: selectedPlan,
        }),
      });

      if (!res.ok) throw new Error('Failed to save');
      // Move to completion step
      setDirection('forward');
      setAnimating(true);
      setTimeout(() => {
        setStep(6);
        setAnimating(false);
      }, 200);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const stepTransformClass = animating
    ? direction === 'forward'
      ? 'opacity-0 translate-x-8'
      : 'opacity-0 -translate-x-8'
    : 'opacity-100 translate-x-0';

  return (
    <div className="min-h-screen bg-seat-black flex flex-col items-center justify-center p-4">
      <Toaster position="top-right" toastOptions={{ style: { background: '#18181B', color: '#FAFAFA', border: '1px solid #27272A' } }} />

      {/* Confetti keyframes */}
      <style>{`
        @keyframes confetti-fall {
          0% { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(85vh) rotate(720deg); }
        }
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">
            Seat<span className="text-seat-red">Signals</span>
          </h1>
        </div>

        {/* Progress bar — steps 1-6 as circles connected by lines */}
        {step < 6 && (
          <div className="flex items-center justify-center mb-8 px-4">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
              const stepNum = i + 1;
              const isCompleted = step > stepNum;
              const isActive = step === stepNum;
              return (
                <div key={i} className="flex items-center">
                  {/* Circle */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 shrink-0 ${
                      isCompleted
                        ? 'bg-seat-red text-white'
                        : isActive
                        ? 'bg-seat-red text-white ring-2 ring-seat-red/40 ring-offset-2 ring-offset-seat-black'
                        : 'bg-seat-card text-zinc-500 border border-seat-border'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
                  </div>
                  {/* Connecting line */}
                  {i < TOTAL_STEPS - 1 && (
                    <div
                      className={`h-0.5 w-8 sm:w-12 transition-colors duration-300 ${
                        step > stepNum ? 'bg-seat-red' : 'bg-seat-border'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Card */}
        <div
          className={`bg-seat-card border border-seat-border rounded-2xl p-6 sm:p-8 transition-all duration-200 ease-out ${stepTransformClass}`}
        >
          {/* STEP 1: Welcome */}
          {step === 1 && (
            <div
              className="text-center py-8"
              style={{
                animation: mounted ? 'fade-in-up 0.6s ease-out forwards' : undefined,
                opacity: mounted ? undefined : 0,
              }}
            >
              {/* Logo icon */}
              <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-seat-red/10 border border-seat-red/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-seat-red" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <path d="M9 9h.01M15 9h.01" strokeLinecap="round" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">
                Welcome to SeatSignals
              </h2>
              <p className="text-zinc-400 text-lg mb-8">
                Let&apos;s set up your restaurant in under 3 minutes
              </p>
              <Button variant="cta" size="lg" className="px-10 h-12 text-base" onClick={goNext}>
                Get Started
              </Button>
            </div>
          )}

          {/* STEP 2: Restaurant Info */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-white">Restaurant Info</h2>
                <p className="text-sm text-zinc-500 mt-1">Tell us about your restaurant</p>
              </div>
              <Input
                label="Restaurant Name *"
                placeholder="e.g. Smokey Joe's BBQ"
                value={name}
                onChange={(e) => { setName(e.target.value); setErrors(prev => ({ ...prev, name: '' })); }}
                error={errors.name}
              />
              <Input
                label="Address *"
                placeholder="123 Main St, Dallas, TX 75201"
                value={address}
                onChange={(e) => { setAddress(e.target.value); setErrors(prev => ({ ...prev, address: '' })); }}
                error={errors.address}
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-400">Cuisine Type *</label>
                <select
                  value={cuisineType}
                  onChange={(e) => { setCuisineType(e.target.value); setErrors(prev => ({ ...prev, cuisineType: '' })); }}
                  className={`w-full bg-zinc-900 border rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-seat-red/50 focus:border-seat-red transition-colors ${
                    errors.cuisineType ? 'border-red-500' : 'border-zinc-800'
                  }`}
                >
                  <option value="">Select cuisine type</option>
                  {CUISINE_TYPES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {errors.cuisineType && <p className="text-xs text-red-400">{errors.cuisineType}</p>}
              </div>
              <Input
                label="Phone Number"
                placeholder="(214) 555-0100"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
              />
              <div className="flex gap-3 mt-6 pt-2">
                <Button variant="ghost" onClick={goBack}>Back</Button>
                <Button variant="cta" className="flex-1" onClick={goNext}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Brand Voice */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-white">Brand Voice</h2>
                <p className="text-sm text-zinc-500 mt-1">Describe your restaurant&apos;s personality</p>
              </div>
              {/* Tone pills */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Quick-select a tone</label>
                <div className="flex flex-wrap gap-2">
                  {TONE_PILLS.map((pill) => (
                    <button
                      key={pill.label}
                      onClick={() => {
                        setSelectedTone(pill.label);
                        setBrandVoice(pill.template);
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-150 border ${
                        selectedTone === pill.label
                          ? 'bg-seat-red text-white border-seat-red'
                          : 'bg-seat-card text-zinc-400 border-seat-border hover:border-zinc-600 hover:text-zinc-300'
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-400">Your brand voice</label>
                <textarea
                  placeholder="e.g., We're a family-friendly Italian spot that's been in the neighborhood for 20 years. Warm, welcoming, and a little bit old-school."
                  value={brandVoice}
                  onChange={(e) => { setBrandVoice(e.target.value); setSelectedTone(''); }}
                  rows={4}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-seat-red/50 focus:border-seat-red transition-colors resize-none"
                />
                <p className="text-xs text-zinc-600">This shapes how AI writes your review responses and outreach emails.</p>
              </div>
              <div className="flex gap-3 mt-6 pt-2">
                <Button variant="ghost" onClick={goBack}>Back</Button>
                <Button variant="cta" className="flex-1" onClick={goNext}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Dead Hours */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-white">Dead Hours</h2>
                <p className="text-sm text-zinc-500 mt-1">When are your slowest times? Click to toggle blocks.</p>
              </div>

              {/* Grid header */}
              <div className="overflow-x-auto -mx-2 px-2">
                <div className="min-w-[500px]">
                  <div className="grid grid-cols-[70px_repeat(5,1fr)] gap-1.5 mb-1.5">
                    <div /> {/* Corner spacer */}
                    {TIME_BLOCKS.map((tb) => (
                      <div key={tb.key} className="text-center">
                        <p className="text-xs font-medium text-zinc-400">{tb.label}</p>
                        <p className="text-[10px] text-zinc-600">{tb.range}</p>
                      </div>
                    ))}
                  </div>

                  {/* Grid rows */}
                  {DAYS.map((day) => (
                    <div key={day} className="grid grid-cols-[70px_repeat(5,1fr)] gap-1.5 mb-1.5">
                      <div className="flex items-center text-sm font-medium text-zinc-400">
                        {day}
                      </div>
                      {TIME_BLOCKS.map((tb) => {
                        const key = `${day}|${tb.key}`;
                        const isActive = deadHourBlocks.has(key);
                        return (
                          <button
                            key={tb.key}
                            onClick={() => toggleDeadHour(day, tb.key)}
                            className={`h-10 rounded-lg border transition-all duration-150 ${
                              isActive
                                ? 'bg-seat-red/20 border-seat-red text-seat-red'
                                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 text-zinc-700'
                            }`}
                          >
                            {isActive && (
                              <svg className="w-4 h-4 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {deadHourBlocks.size > 0 && (
                <p className="text-xs text-zinc-500">
                  {deadHourBlocks.size} time block{deadHourBlocks.size !== 1 ? 's' : ''} selected
                </p>
              )}

              <div className="flex gap-3 mt-6 pt-2">
                <Button variant="ghost" onClick={goBack}>Back</Button>
                <Button variant="cta" className="flex-1" onClick={goNext}>
                  Continue
                </Button>
              </div>
              <button
                onClick={goNext}
                className="w-full text-center text-sm text-zinc-500 hover:text-zinc-400 transition-colors"
              >
                I&apos;ll set this up later
              </button>
            </div>
          )}

          {/* STEP 5: Choose Your Plan */}
          {step === 5 && (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-white">Choose Your Plan</h2>
                <p className="text-sm text-zinc-500 mt-1">Start free, upgrade anytime</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PLANS.map((plan) => {
                  const isSelected = selectedPlan === plan.id;
                  return (
                    <div
                      key={plan.id}
                      className={`relative rounded-xl border p-4 transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'border-seat-red bg-seat-red/5 ring-1 ring-seat-red/30'
                          : 'border-seat-border bg-zinc-900 hover:border-zinc-600'
                      }`}
                      onClick={() => setSelectedPlan(plan.id)}
                    >
                      {plan.badge && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-seat-red text-white text-[10px] font-semibold rounded-full uppercase tracking-wider whitespace-nowrap">
                          {plan.badge}
                        </div>
                      )}
                      <div className="text-center mb-3 pt-1">
                        <h3 className="text-sm font-semibold text-white">{plan.name}</h3>
                        <div className="mt-1">
                          <span className="text-2xl font-bold text-white">{plan.price}</span>
                          {plan.priceNote && (
                            <span className="text-xs text-zinc-500">{plan.priceNote}</span>
                          )}
                        </div>
                      </div>
                      <ul className="space-y-1.5 mb-4">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-xs text-zinc-400">
                            <Check className="w-3.5 h-3.5 text-seat-red shrink-0 mt-0.5" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <Button
                        variant={isSelected ? 'cta' : 'secondary'}
                        size="sm"
                        className="w-full"
                        onClick={(e) => { e.stopPropagation(); setSelectedPlan(plan.id); }}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 mt-6 pt-2">
                <Button variant="ghost" onClick={goBack}>Back</Button>
                <Button
                  variant="cta"
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? 'Setting up...' : 'Complete Setup'}
                </Button>
              </div>
              <button
                onClick={() => { setSelectedPlan('starter'); handleSubmit(); }}
                className="w-full text-center text-sm text-zinc-500 hover:text-zinc-400 transition-colors"
              >
                Start with free plan
              </button>
            </div>
          )}

          {/* STEP 6: All Done */}
          {step === 6 && (
            <div className="text-center py-8 relative overflow-hidden">
              {/* Confetti */}
              <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
                {Array.from({ length: 30 }).map((_, i) => (
                  <ConfettiPiece key={i} index={i} />
                ))}
              </div>

              <div
                style={{ animation: 'fade-in-up 0.5s ease-out forwards' }}
              >
                {/* Success icon */}
                <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <h2 className="text-3xl font-bold text-white mb-3">
                  You&apos;re all set!
                </h2>
                <p className="text-zinc-400 mb-8">
                  Your restaurant is ready to go. Here&apos;s a summary:
                </p>

                {/* Summary cards */}
                <div className="text-left space-y-3 mb-8 max-w-md mx-auto">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Restaurant</p>
                    <p className="text-white font-medium">{name}</p>
                    <p className="text-sm text-zinc-400">{address}</p>
                    <p className="text-sm text-zinc-500">{cuisineType}{phone ? ` \u00b7 ${phone}` : ''}</p>
                  </div>
                  {brandVoice && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Brand Voice</p>
                      <p className="text-sm text-zinc-300 line-clamp-2">{brandVoice}</p>
                    </div>
                  )}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Plan</p>
                    <p className="text-white font-medium capitalize">{selectedPlan}</p>
                  </div>
                  {deadHourBlocks.size > 0 && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Dead Hours</p>
                      <p className="text-sm text-zinc-300">
                        {deadHourBlocks.size} time block{deadHourBlocks.size !== 1 ? 's' : ''} configured
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  variant="cta"
                  size="lg"
                  className="px-10 h-12 text-base"
                  onClick={() => router.push('/dashboard')}
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
