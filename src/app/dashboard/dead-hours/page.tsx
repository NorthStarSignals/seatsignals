'use client';

import { useState, useEffect } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

interface DeadHourWindow {
  day: string;
  start: string;
  end: string;
}

interface DeadHourRecord {
  dead_hour_id: string;
  day_of_week: string;
  time_start: string;
  time_end: string;
  promotion_type: string;
  seats_filled: number;
  revenue: number;
  redemption_code: string;
  triggered_at: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function DeadHoursPage() {
  const [config, setConfig] = useState<DeadHourWindow[]>([]);
  const [deadHours, setDeadHours] = useState<DeadHourRecord[]>([]);
  const [stats, setStats] = useState({ total_revenue: 0, redemption_rate: 0, messages_sent: 0, best_window: '--' });
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemRevenue, setRedeemRevenue] = useState('');
  const fetchData = async () => {
    const res = await fetch('/api/dead-hours');
    if (res.ok) {
      const data = await res.json();
      setConfig(data.config);
      setDeadHours(data.dead_hours);
      setStats(data.stats);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const triggerNow = async () => {
    const res = await fetch('/api/dead-hours/trigger', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      toast.success(`Sent ${data.sent} dead hours promotions`);
      fetchData();
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!redeemCode) return;
    const res = await fetch('/api/dead-hours/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: redeemCode, revenue: redeemRevenue ? parseFloat(redeemRevenue) : 0 }),
    });
    if (res.ok) {
      toast.success('Code redeemed!');
      setRedeemCode('');
      setRedeemRevenue('');
      fetchData();
    } else {
      toast.error('Invalid or already redeemed code');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Dead Hours Engine</h1>
        <Button variant="secondary" size="sm" onClick={triggerNow}>
          Trigger Now
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Revenue This Month" value={formatCurrency(stats.total_revenue)} />
        <MetricCard title="Avg Redemption Rate" value={`${stats.redemption_rate}%`} />
        <MetricCard title="Messages Sent" value={stats.messages_sent} />
        <MetricCard title="Best Window" value={stats.best_window} />
      </div>

      {/* Weekly calendar view */}
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Weekly Dead Hours</h2>
        {config.length === 0 ? (
          <p className="text-slate-400 text-sm">No dead hours configured. Update your settings in the onboarding flow.</p>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {DAYS.map(day => {
              const windows = config.filter(w => w.day === day);
              return (
                <div key={day} className="bg-navy-700 rounded-lg p-3 min-h-[100px]">
                  <p className="text-xs text-slate-400 font-medium mb-2">{day.slice(0, 3)}</p>
                  {windows.length === 0 ? (
                    <p className="text-xs text-slate-600">No windows</p>
                  ) : (
                    windows.map((w, i) => (
                      <div key={i} className="bg-red-500/10 text-red-400 rounded px-2 py-1 text-xs mb-1">
                        {w.start} - {w.end}
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Redeem code */}
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Redeem Code</h2>
        <form onSubmit={handleRedeem} className="flex flex-wrap gap-3 items-end">
          <Input label="Code" placeholder="DH4X7KMN" value={redeemCode} onChange={e => setRedeemCode(e.target.value)} />
          <Input label="Check Amount" type="number" step="0.01" placeholder="45.00" value={redeemRevenue} onChange={e => setRedeemRevenue(e.target.value)} />
          <Button type="submit" variant="cta" disabled={!redeemCode}>Redeem</Button>
        </form>
      </div>

      {/* Geo-ads placeholder */}
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-6 opacity-60">
        <h2 className="text-lg font-semibold text-white mb-2">Automated Geo-Ads (Coming Soon)</h2>
        <p className="text-slate-400 text-sm">
          Automatically launch geo-targeted Meta ads during dead hours. Set a budget cap per window and the system handles the rest.
        </p>
      </div>

      {/* Recent promotions */}
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Promotions</h2>
        {deadHours.length === 0 ? (
          <p className="text-slate-400 text-sm">No promotions sent yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-700">
                  <th className="text-left p-3 text-slate-400">Window</th>
                  <th className="text-left p-3 text-slate-400">Code</th>
                  <th className="text-left p-3 text-slate-400">Status</th>
                  <th className="text-left p-3 text-slate-400">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {deadHours.slice(0, 20).map(d => (
                  <tr key={d.dead_hour_id} className="border-b border-navy-700/50">
                    <td className="p-3 text-white">{d.day_of_week} {d.time_start}-{d.time_end}</td>
                    <td className="p-3 text-slate-300 font-mono text-xs">{d.redemption_code}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${d.seats_filled > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                        {d.seats_filled > 0 ? 'Redeemed' : 'Sent'}
                      </span>
                    </td>
                    <td className="p-3 text-white">{d.revenue > 0 ? formatCurrency(d.revenue) : '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
