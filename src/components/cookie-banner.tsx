'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'seat_cookie_consent_v1';

/**
 * Minimal cookie banner. Shows once, dismisses on Accept or Reject, remembers
 * the choice in localStorage. We don't actually load third-party trackers, so
 * "Reject" mostly signals respect for the user — the functional difference
 * is honoring localStorage as the user's preference going forward.
 */
export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setShow(true);
    } catch {
      // incognito / storage disabled — don't show the banner rather than risk an infinite loop
    }
  }, []);

  const record = (choice: 'accept' | 'reject') => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice, at: new Date().toISOString() }));
    } catch {}
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-4">
      <p className="text-xs text-zinc-300 leading-relaxed">
        We use essential cookies to keep you signed in and measure aggregate usage. No third-party ad
        trackers. See our{' '}
        <Link href="/privacy" className="text-seat-red hover:underline">Privacy Policy</Link>.
      </p>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => record('reject')}
          className="flex-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium"
        >
          Essential only
        </button>
        <button
          onClick={() => record('accept')}
          className="flex-1 px-3 py-1.5 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg text-xs font-medium"
        >
          Accept all
        </button>
      </div>
    </div>
  );
}
