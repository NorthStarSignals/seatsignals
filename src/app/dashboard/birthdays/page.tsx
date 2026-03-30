'use client';

import { useState, useEffect } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDate, formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

interface BirthdayEvent {
  event_id: string;
  event_type: string;
  offer_sent_at: string;
  redeemed: boolean;
  redemption_date?: string;
  party_size?: number;
  check_total?: number;
  redemption_code: string;
  customers?: { first_name: string; email: string };
}

interface UpcomingBirthday {
  customer_id: string;
  first_name: string;
  email: string;
  birthday: string;
}

export default function BirthdaysPage() {
  const [events, setEvents] = useState<BirthdayEvent[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingBirthday[]>([]);
  const [stats, setStats] = useState({
    this_month: 0,
    offers_sent: 0,
    redemption_rate: 0,
    avg_party_size: 0,
    total_revenue: 0,
  });
  const [redeemCode, setRedeemCode] = useState('');
  const [partySize, setPartySize] = useState('');
  const [checkTotal, setCheckTotal] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const res = await fetch('/api/birthdays');
    if (res.ok) {
      const data = await res.json();
      setEvents(data.events);
      setUpcoming(data.upcoming);
      setStats(data.stats);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!redeemCode) return;

    const res = await fetch('/api/birthdays/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: redeemCode,
        party_size: partySize ? parseInt(partySize) : undefined,
        check_total: checkTotal ? parseFloat(checkTotal) : undefined,
      }),
    });

    if (res.ok) {
      toast.success('Offer redeemed successfully!');
      setRedeemCode('');
      setPartySize('');
      setCheckTotal('');
      fetchData();
    } else {
      const data = await res.json();
      toast.error(data.error || 'Invalid code');
    }
  };

  const triggerCron = async () => {
    const res = await fetch('/api/birthdays/cron', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      toast.success(`Processed ${data.processed} birthday/anniversary events`);
      fetchData();
    } else {
      toast.error('Failed to run birthday check');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Birthdays & Anniversaries</h1>
        <Button variant="secondary" size="sm" onClick={triggerCron}>
          Run Birthday Check
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <MetricCard title="This Month" value={stats.this_month} />
        <MetricCard title="Offers Sent" value={stats.offers_sent} />
        <MetricCard title="Redemption Rate" value={`${stats.redemption_rate}%`} />
        <MetricCard title="Avg Party Size" value={stats.avg_party_size || '--'} />
        <MetricCard title="Birthday Revenue" value={formatCurrency(stats.total_revenue)} />
      </div>

      {/* Redemption form */}
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Redeem Offer Code</h2>
        <form onSubmit={handleRedeem} className="flex flex-wrap gap-3 items-end">
          <Input
            label="Redemption Code"
            placeholder="e.g. BD4X7KMN"
            value={redeemCode}
            onChange={(e) => setRedeemCode(e.target.value)}
          />
          <Input
            label="Party Size"
            type="number"
            placeholder="4"
            value={partySize}
            onChange={(e) => setPartySize(e.target.value)}
          />
          <Input
            label="Check Total"
            type="number"
            step="0.01"
            placeholder="285.00"
            value={checkTotal}
            onChange={(e) => setCheckTotal(e.target.value)}
          />
          <Button type="submit" variant="cta" disabled={!redeemCode}>Redeem</Button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming birthdays */}
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Upcoming Birthdays (30 days)</h2>
          {upcoming.length === 0 ? (
            <p className="text-slate-400 text-sm">No upcoming birthdays.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((c) => (
                <div key={c.customer_id} className="flex justify-between items-center p-3 bg-navy-700 rounded-lg">
                  <div>
                    <p className="text-white text-sm">{c.first_name || c.email}</p>
                    <p className="text-slate-400 text-xs">{c.email}</p>
                  </div>
                  <span className="text-accent-amber text-sm">{formatDate(c.birthday)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent events */}
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Events</h2>
          {loading ? (
            <p className="text-slate-400 text-sm">Loading...</p>
          ) : events.length === 0 ? (
            <p className="text-slate-400 text-sm">No birthday events yet. Customers who enter their birthday on the capture form will appear here.</p>
          ) : (
            <div className="space-y-2">
              {events.map((e) => (
                <div key={e.event_id} className="flex justify-between items-center p-3 bg-navy-700 rounded-lg">
                  <div>
                    <p className="text-white text-sm">
                      {e.customers?.first_name || 'Customer'} - {e.event_type}
                    </p>
                    <p className="text-slate-400 text-xs">
                      Code: {e.redemption_code} | Sent: {formatDate(e.offer_sent_at)}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    e.redeemed
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {e.redeemed ? `Redeemed${e.check_total ? ` - ${formatCurrency(e.check_total)}` : ''}` : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
