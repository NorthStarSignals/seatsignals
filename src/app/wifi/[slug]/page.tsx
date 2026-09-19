'use client';

import { useState } from 'react';
import { Wifi, Star, Gift } from 'lucide-react';

export default function WiFiSplashPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [optIn, setOptIn] = useState(true);

  const handleConnect = () => {
    if (!email) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Wifi size={28} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">You&apos;re Connected!</h1>
          <p className="text-gray-500">Enjoy free WiFi during your visit.</p>
          <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
            <Gift size={20} className="text-rose-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-900">Welcome Gift!</p>
            <p className="text-sm text-gray-600 mt-1">Show this to your server for a complimentary appetizer on your first visit.</p>
            <div className="mt-3 bg-white rounded-lg p-3 border border-rose-200">
              <p className="font-mono text-lg font-bold text-rose-600">WIFI-WELCOME</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-1 text-sm text-gray-400">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            <span>Don&apos;t forget to leave us a review!</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white flex items-center justify-center p-6">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wifi size={28} className="text-rose-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Free WiFi</h1>
          <p className="text-gray-500 mt-1">Connect to enjoy complimentary internet</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Your Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="John"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@email.com"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500" />
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={optIn} onChange={() => setOptIn(!optIn)}
              className="mt-0.5 rounded border-gray-300 text-rose-600 focus:ring-rose-500" />
            <span className="text-xs text-gray-500">Send me exclusive offers and updates. You can unsubscribe anytime.</span>
          </label>

          <button onClick={handleConnect} disabled={!email}
            className="w-full py-3 bg-rose-600 text-white rounded-xl font-semibold text-sm hover:bg-rose-700 disabled:opacity-50 transition-colors">
            Connect to WiFi
          </button>

          <p className="text-[10px] text-center text-gray-400">
            By connecting, you agree to our terms of use. Network: GuestWiFi
          </p>
        </div>

        <p className="text-center text-xs text-gray-400">Powered by SeatSignals</p>
      </div>
    </div>
  );
}
