'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function QRCapturePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [restaurant, setRestaurant] = useState<{ restaurant_id: string; name: string; logo_url?: string } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/capture/restaurant?id=${slug}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        if (data.name) {
          setRestaurant({ restaurant_id: slug, name: data.name, logo_url: data.logo_url });
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !firstName) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: slug,
          first_name: firstName,
          email,
          phone: phone || undefined,
          birthday: birthday || undefined,
          source: 'qr',
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
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-rose-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Page Not Found</h2>
          <p className="text-gray-500">This QR code doesn&apos;t seem to be linked to an active restaurant.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          {restaurant?.logo_url && (
            <img
              src={restaurant.logo_url}
              alt={restaurant.name}
              className="w-16 h-16 rounded-full object-cover mx-auto mb-4"
            />
          )}
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re in!</h2>
          <p className="text-gray-500">
            Watch for exclusive offers coming your way from {restaurant?.name}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          {restaurant?.logo_url && (
            <img
              src={restaurant.logo_url}
              alt={restaurant.name}
              className="w-20 h-20 rounded-full object-cover mx-auto mb-4 shadow-md"
            />
          )}
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Welcome to {restaurant?.name}!
          </h1>
          <p className="text-gray-500 text-sm">
            Get exclusive offers and updates
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-2xl p-6 space-y-4 shadow-sm border border-gray-100">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">First Name</label>
            <input
              type="text"
              placeholder="Your first name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              placeholder="your@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Phone <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="tel"
              placeholder="(555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Birthday <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-colors"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !email || !firstName}
            className="w-full bg-rose-600 text-white font-semibold py-3 rounded-lg hover:bg-rose-700 active:bg-rose-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {submitting ? 'Joining...' : 'Join'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-4 px-4">
          We respect your privacy. Unsubscribe anytime.
        </p>
      </div>
    </div>
  );
}
