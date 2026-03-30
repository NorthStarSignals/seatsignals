'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';

const CUISINE_TYPES = [
  'American', 'BBQ', 'Mexican', 'Italian', 'Asian Fusion', 'Japanese',
  'Chinese', 'Thai', 'Indian', 'Mediterranean', 'Seafood', 'Southern',
  'Steakhouse', 'Pizza', 'Burger', 'Vegan/Vegetarian', 'French', 'Other',
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface DeadHourEntry {
  day: string;
  start: string;
  end: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Restaurant info
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [brandVoice, setBrandVoice] = useState('');

  // Step 2: Dead hours
  const [deadHours, setDeadHours] = useState<DeadHourEntry[]>([]);
  const [dhDay, setDhDay] = useState('Monday');
  const [dhStart, setDhStart] = useState('14:00');
  const [dhEnd, setDhEnd] = useState('16:00');

  const addDeadHour = () => {
    setDeadHours([...deadHours, { day: dhDay, start: dhStart, end: dhEnd }]);
  };

  const removeDeadHour = (index: number) => {
    setDeadHours(deadHours.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          address,
          cuisine_type: cuisineType,
          brand_voice: brandVoice,
          dead_hours_config: deadHours,
        }),
      });

      if (!res.ok) throw new Error('Failed to save');
      toast.success('Restaurant setup complete!');
      router.push('/dashboard');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = 3;

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1A2332', color: '#E2E8F0', border: '1px solid #243044' } }} />
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">
            Seat<span className="text-accent-blue">Signals</span>
          </h1>
          <p className="text-slate-400 mt-2">Let&apos;s set up your restaurant</p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < step ? 'bg-accent-blue' : 'bg-navy-700'
              }`}
            />
          ))}
        </div>

        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white mb-4">Restaurant Details</h2>
              <Input
                label="Restaurant Name"
                placeholder="e.g. Smokey Joe's BBQ"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                label="Address"
                placeholder="123 Main St, Dallas, TX 75201"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <div className="space-y-1">
                <label className="block text-sm text-slate-300">Cuisine Type</label>
                <select
                  value={cuisineType}
                  onChange={(e) => setCuisineType(e.target.value)}
                  className="w-full bg-navy-700 border border-navy-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-accent-blue"
                >
                  <option value="">Select cuisine type</option>
                  {CUISINE_TYPES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-sm text-slate-300">Brand Voice</label>
                <textarea
                  placeholder="e.g. Laid-back BBQ spot, keep it casual and friendly. We call everyone 'friend' and love a good pun."
                  value={brandVoice}
                  onChange={(e) => setBrandVoice(e.target.value)}
                  rows={3}
                  className="w-full bg-navy-700 border border-navy-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-blue"
                />
                <p className="text-xs text-slate-500">This shapes how AI writes your review responses and outreach emails.</p>
              </div>
              <Button
                variant="cta"
                className="w-full mt-4"
                onClick={() => setStep(2)}
                disabled={!name || !address || !cuisineType}
              >
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white mb-2">Dead Hours</h2>
              <p className="text-sm text-slate-400 mb-4">
                When are your slowest times? We&apos;ll automatically run promotions to fill these windows.
              </p>

              <div className="flex gap-2">
                <select
                  value={dhDay}
                  onChange={(e) => setDhDay(e.target.value)}
                  className="bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <Input
                  type="time"
                  value={dhStart}
                  onChange={(e) => setDhStart(e.target.value)}
                  className="flex-1"
                />
                <span className="text-slate-400 self-center">to</span>
                <Input
                  type="time"
                  value={dhEnd}
                  onChange={(e) => setDhEnd(e.target.value)}
                  className="flex-1"
                />
                <Button variant="secondary" size="sm" onClick={addDeadHour}>Add</Button>
              </div>

              {deadHours.length > 0 && (
                <div className="space-y-2 mt-4">
                  {deadHours.map((dh, i) => (
                    <div key={i} className="flex items-center justify-between bg-navy-700 rounded-lg px-4 py-2">
                      <span className="text-sm text-slate-300">
                        {dh.day} {dh.start} - {dh.end}
                      </span>
                      <button
                        onClick={() => removeDeadHour(i)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button variant="cta" className="flex-1" onClick={() => setStep(3)}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white mb-2">Review Your Setup</h2>
              <div className="space-y-3">
                <div className="bg-navy-700 rounded-lg p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Restaurant</p>
                  <p className="text-white font-medium">{name}</p>
                  <p className="text-sm text-slate-400">{address}</p>
                  <p className="text-sm text-slate-400">{cuisineType}</p>
                </div>
                {brandVoice && (
                  <div className="bg-navy-700 rounded-lg p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Brand Voice</p>
                    <p className="text-sm text-slate-300">{brandVoice}</p>
                  </div>
                )}
                {deadHours.length > 0 && (
                  <div className="bg-navy-700 rounded-lg p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Dead Hours</p>
                    {deadHours.map((dh, i) => (
                      <p key={i} className="text-sm text-slate-300">
                        {dh.day}: {dh.start} - {dh.end}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                <Button
                  variant="cta"
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? 'Setting up...' : 'Launch SeatSignals'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
