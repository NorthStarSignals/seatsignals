'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function CapturePage() {
  const params = useParams();
  const restaurantId = params.restaurantId as string;
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [restaurantName, setRestaurantName] = useState('');
  const [error, setError] = useState('');

  // Fetch restaurant name on mount
  useEffect(() => {
    fetch(`/api/capture/restaurant?id=${restaurantId}`)
      .then(res => res.json())
      .then(data => {
        if (data.name) setRestaurantName(data.name);
      })
      .catch(() => {});
  }, [restaurantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          first_name: firstName,
          email,
          phone: phone || undefined,
          birthday: birthday || undefined,
          source: 'wifi',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Something went wrong');
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">You&apos;re connected!</h2>
          <p className="text-slate-400 mb-4">
            Thanks for visiting {restaurantName || 'us'}! Check your phone for a special welcome offer.
          </p>
          <p className="text-sm text-accent-amber font-medium">
            Show this screen to your server for 10% off your next visit.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">
            {restaurantName || 'Welcome!'}
          </h1>
          <p className="text-slate-400 text-sm">
            Connect to free WiFi + get 10% off your next visit
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-navy-800 border border-navy-700 rounded-xl p-6 space-y-4">
          <Input
            label="First Name"
            placeholder="Your first name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            placeholder="your@email.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Phone (optional)"
            type="tel"
            placeholder="(555) 123-4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <div>
            <Input
              label="Birthday (optional)"
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
            />
            <p className="text-xs text-accent-amber mt-1">
              Enter your birthday for a free dessert on your special day!
            </p>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" variant="cta" className="w-full" disabled={loading || !email}>
            {loading ? 'Connecting...' : 'Connect to WiFi'}
          </Button>
        </form>

        <p className="text-xs text-slate-600 text-center mt-4">
          By connecting, you agree to receive occasional offers from {restaurantName || 'this restaurant'}.
          Unsubscribe anytime.
        </p>
      </div>
    </div>
  );
}
