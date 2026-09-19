'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { Mail, MessageSquare, Bell, Phone } from 'lucide-react';

const channels = [
  { id: 'email', name: 'Email', icon: Mail, optedIn: 8240, total: 9120 },
  { id: 'sms', name: 'SMS', icon: MessageSquare, optedIn: 6180, total: 9120 },
  { id: 'push', name: 'Push Notification', icon: Bell, optedIn: 2840, total: 9120 },
  { id: 'phone', name: 'Phone Call', icon: Phone, optedIn: 1290, total: 9120 },
];

const categories = [
  { id: 'reservations', name: 'Reservation Confirmations', desc: 'Booking confirmations, reminders, changes', defaultEmail: true, defaultSms: true, defaultPush: false },
  { id: 'marketing', name: 'Marketing & Promotions', desc: 'Special offers, new menu items, events', defaultEmail: true, defaultSms: false, defaultPush: false },
  { id: 'birthday', name: 'Birthday & Anniversary', desc: 'Personal celebration offers and recognition', defaultEmail: true, defaultSms: true, defaultPush: false },
  { id: 'loyalty', name: 'Loyalty & Rewards', desc: 'Points balance, tier updates, reward availability', defaultEmail: true, defaultSms: false, defaultPush: true },
  { id: 'feedback', name: 'Feedback Requests', desc: 'Post-visit surveys and review invitations', defaultEmail: true, defaultSms: false, defaultPush: false },
  { id: 'newsletter', name: 'Newsletter', desc: 'Monthly news, chef stories, recipes', defaultEmail: true, defaultSms: false, defaultPush: false },
];

export default function CommPrefsPage() {
  const [prefs, setPrefs] = useState(
    Object.fromEntries(categories.map(c => [c.id, { email: c.defaultEmail, sms: c.defaultSms, push: c.defaultPush }]))
  );

  const toggle = (cat: string, channel: 'email' | 'sms' | 'push') => {
    setPrefs(p => ({ ...p, [cat]: { ...p[cat], [channel]: !p[cat][channel] } }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Communication Preferences</h1>
        <p className="text-seat-muted mt-1">Manage how you reach your customers across channels</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {channels.map(c => {
          const rate = ((c.optedIn / c.total) * 100).toFixed(0);
          return (
            <MetricCard
              key={c.id}
              title={c.name}
              value={`${rate}%`}
              subtitle={`${c.optedIn.toLocaleString()} opted in`}
            />
          );
        })}
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-1">Default Customer Preferences</h3>
        <p className="text-sm text-seat-muted mb-4">These defaults apply to new customers. Existing customers can adjust their own preferences.</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-seat-border text-seat-muted">
                <th className="text-left py-3 px-2">Category</th>
                <th className="text-center py-3 px-2 w-24">Email</th>
                <th className="text-center py-3 px-2 w-24">SMS</th>
                <th className="text-center py-3 px-2 w-24">Push</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat.id} className="border-b border-seat-border/50">
                  <td className="py-4 px-2">
                    <div className="text-white font-medium">{cat.name}</div>
                    <div className="text-xs text-seat-muted">{cat.desc}</div>
                  </td>
                  {(['email', 'sms', 'push'] as const).map(ch => (
                    <td key={ch} className="py-4 px-2 text-center">
                      <button
                        onClick={() => toggle(cat.id, ch)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                          prefs[cat.id][ch] ? 'bg-seat-red' : 'bg-seat-border'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          prefs[cat.id][ch] ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button className="px-4 py-2 text-seat-muted hover:text-white">Reset to Defaults</button>
          <button className="px-6 py-2 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg font-medium">Save Changes</button>
        </div>
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Compliance & Consent</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-seat-black border border-seat-border rounded-lg p-4">
            <div className="text-2xl font-bold text-white">CAN-SPAM</div>
            <div className="text-sm text-green-500 mt-1">Compliant</div>
            <div className="text-xs text-seat-muted mt-2">All emails include unsubscribe link</div>
          </div>
          <div className="bg-seat-black border border-seat-border rounded-lg p-4">
            <div className="text-2xl font-bold text-white">TCPA</div>
            <div className="text-sm text-green-500 mt-1">Compliant</div>
            <div className="text-xs text-seat-muted mt-2">SMS requires explicit opt-in</div>
          </div>
          <div className="bg-seat-black border border-seat-border rounded-lg p-4">
            <div className="text-2xl font-bold text-white">GDPR</div>
            <div className="text-sm text-green-500 mt-1">Compliant</div>
            <div className="text-xs text-seat-muted mt-2">Right to deletion supported</div>
          </div>
        </div>
      </div>
    </div>
  );
}
