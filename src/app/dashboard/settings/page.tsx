'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useRestaurant } from '@/hooks/use-restaurant';
import { PLANS } from '@/lib/stripe';
import toast from 'react-hot-toast';
import { Download, QrCode, CreditCard, Zap } from 'lucide-react';

export default function SettingsPage() {
  const { restaurant, loading } = useRestaurant();
  const [qrSvg, setQrSvg] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [testMode, setTestMode] = useState(true);

  const generateQR = async () => {
    const res = await fetch('/api/qrcode');
    if (res.ok) {
      const data = await res.json();
      setQrSvg(data.svg);
      setQrUrl(data.url);
    }
  };

  useEffect(() => {
    if (!loading && restaurant) {
      generateQR();
    }
  }, [loading, restaurant]);

  const subscribeToPlan = async (plan: string) => {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } else {
      toast.error('Failed to create checkout session');
    }
  };

  if (loading) return <div className="text-slate-400">Loading settings...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Restaurant Profile */}
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Restaurant Profile</h2>
          {restaurant ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Name</p>
                <p className="text-white">{restaurant.name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Address</p>
                <p className="text-white">{restaurant.address}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Cuisine</p>
                <p className="text-white">{restaurant.cuisine_type}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Subscription</p>
                <p className="text-white capitalize">{restaurant.subscription_tier} Plan</p>
              </div>
              {restaurant.brand_voice && (
                <div className="md:col-span-2">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Brand Voice</p>
                  <p className="text-slate-300 text-sm">{restaurant.brand_voice}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-400">Complete onboarding to set up your profile.</p>
          )}
        </div>

        {/* Table Tents / QR Codes */}
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <QrCode size={20} className="text-accent-blue" />
            <h2 className="text-lg font-semibold text-white">Table Tents - QR Codes</h2>
          </div>
          {qrSvg ? (
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="bg-white p-4 rounded-lg" dangerouslySetInnerHTML={{ __html: qrSvg }} />
              <div className="flex-1">
                <p className="text-sm text-slate-300 mb-2">
                  Print this QR code on table tents. When customers scan it, they&apos;ll see your WiFi capture page.
                </p>
                <p className="text-xs text-slate-500 mb-4 font-mono break-all">{qrUrl}</p>
                <p className="text-sm text-slate-400 mb-4">
                  &quot;Scan for free WiFi + 10% off your next visit.&quot;
                </p>
                <Button variant="cta" size="sm" onClick={() => {
                  const w = window.open('', '_blank');
                  if (w) {
                    w.document.write(`
                      <html><head><title>SeatSignals QR Codes</title>
                      <style>body{margin:0;padding:20px;font-family:sans-serif}
                      .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:800px;margin:0 auto}
                      .card{border:2px solid #ccc;border-radius:12px;padding:20px;text-align:center}
                      .card h3{margin:0 0 10px;font-size:18px}
                      .card p{margin:5px 0;color:#666;font-size:14px}
                      svg{width:150px;height:150px}
                      @media print{.grid{gap:10px}.card{border:1px solid #999}}</style></head>
                      <body><div class="grid">
                      ${[1,2,3,4].map(() => `<div class="card"><h3>${restaurant?.name || 'Restaurant'}</h3>${qrSvg}<p>Scan for free WiFi + 10% off your next visit</p></div>`).join('')}
                      </div></body></html>
                    `);
                    w.document.close();
                    w.print();
                  }
                }}>
                  <Download size={16} className="mr-1" /> Print Table Tents (4 per page)
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-sm">Complete onboarding to generate your QR code.</p>
          )}
        </div>

        {/* Integrations */}
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={20} className="text-accent-blue" />
            <h2 className="text-lg font-semibold text-white">Integrations</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-navy-700 rounded-lg">
              <div>
                <p className="text-white font-medium">Google Business Profile</p>
                <p className="text-xs text-slate-400">Auto-monitor and respond to reviews</p>
              </div>
              <Button variant="secondary" size="sm">Connect</Button>
            </div>
            <div className="flex items-center justify-between p-4 bg-navy-700 rounded-lg">
              <div>
                <p className="text-white font-medium">Test Mode</p>
                <p className="text-xs text-slate-400">Simulate reviews without Google connection</p>
              </div>
              <button
                onClick={() => setTestMode(!testMode)}
                className={`relative w-12 h-6 rounded-full transition-colors ${testMode ? 'bg-accent-blue' : 'bg-navy-600'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${testMode ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Billing */}
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={20} className="text-accent-blue" />
            <h2 className="text-lg font-semibold text-white">Billing</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.entries(PLANS) as [string, typeof PLANS[keyof typeof PLANS]][]).map(([key, plan]) => (
              <div
                key={key}
                className={`border rounded-xl p-6 ${
                  restaurant?.subscription_tier === key
                    ? 'border-accent-blue bg-accent-blue/5'
                    : 'border-navy-700'
                }`}
              >
                <h3 className="text-white font-bold text-lg">{plan.name}</h3>
                <p className="text-2xl font-bold text-accent-amber mt-1">{plan.priceDisplay}</p>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((f, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <span className="text-accent-blue mt-0.5">&#10003;</span> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={restaurant?.subscription_tier === key ? 'secondary' : 'cta'}
                  className="w-full mt-4"
                  onClick={() => subscribeToPlan(key)}
                  disabled={restaurant?.subscription_tier === key}
                >
                  {restaurant?.subscription_tier === key ? 'Current Plan' : 'Upgrade'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
