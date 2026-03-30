'use client';

import { useState, useEffect } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { formatCurrency, formatDate } from '@/lib/utils';
interface OverviewData {
  metrics: {
    total_customers: number;
    response_rate: number;
    active_leads: number;
    corp_accounts: number;
    dead_hours_filled: number;
    upcoming_birthdays: number;
  };
  revenue: {
    total: number;
    repeat_visits: number;
    catering: number;
    corporate_recurring: number;
    dead_hours: number;
    birthdays: number;
    delivery_uplift: number;
  };
  activities: Array<{ text: string; time: string; type: string }>;
}

const TYPE_ICONS: Record<string, string> = {
  customer: 'bg-blue-500/10 text-blue-400',
  review: 'bg-amber-500/10 text-amber-400',
  catering: 'bg-purple-500/10 text-purple-400',
  retention: 'bg-emerald-500/10 text-emerald-400',
  dead_hours: 'bg-red-500/10 text-red-400',
  birthday: 'bg-pink-500/10 text-pink-400',
  anniversary: 'bg-pink-500/10 text-pink-400',
};

export default function DashboardOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/overview')
      .then(res => res.ok ? res.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-6">Overview</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-navy-800 border border-navy-700 rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-navy-700 rounded w-20 mb-2"></div>
              <div className="h-8 bg-navy-700 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const m = data?.metrics || { total_customers: 0, response_rate: 0, active_leads: 0, corp_accounts: 0, dead_hours_filled: 0, upcoming_birthdays: 0 };
  const r = data?.revenue || { total: 0, repeat_visits: 0, catering: 0, corporate_recurring: 0, dead_hours: 0, birthdays: 0, delivery_uplift: 0 };
  const activities = data?.activities || [];

  const revenueBreakdown = [
    { label: 'Repeat Visits', value: r.repeat_visits, color: 'bg-emerald-500' },
    { label: 'Catering', value: r.catering, color: 'bg-purple-500' },
    { label: 'Corporate Recurring', value: r.corporate_recurring, color: 'bg-blue-500' },
    { label: 'Dead Hours', value: r.dead_hours, color: 'bg-red-500' },
    { label: 'Birthdays', value: r.birthdays, color: 'bg-pink-500' },
    { label: 'Delivery Uplift', value: r.delivery_uplift, color: 'bg-amber-500' },
  ];

  const maxRevenue = Math.max(...revenueBreakdown.map(b => b.value), 1);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Overview</h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <MetricCard title="Total Customers" value={m.total_customers} />
        <MetricCard title="Review Response" value={`${m.response_rate}%`} />
        <MetricCard title="Active Leads" value={m.active_leads} />
        <MetricCard title="Corp Accounts" value={m.corp_accounts} />
        <MetricCard title="Dead Hours Filled" value={m.dead_hours_filled} subtitle="This month" />
        <MetricCard title="Upcoming Birthdays" value={m.upcoming_birthdays} subtitle="Next 30 days" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Attribution */}
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Revenue Attribution</h2>
            <span className="text-2xl font-bold text-accent-amber">{formatCurrency(r.total)}</span>
          </div>
          <p className="text-xs text-slate-500 mb-4">SeatSignals-attributed revenue this month</p>
          <div className="space-y-3">
            {revenueBreakdown.map((b) => (
              <div key={b.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">{b.label}</span>
                  <span className="text-white font-medium">{formatCurrency(b.value)}</span>
                </div>
                <div className="h-2 bg-navy-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${b.color} rounded-full transition-all`}
                    style={{ width: `${(b.value / maxRevenue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Activity Feed</h2>
          {activities.length === 0 ? (
            <p className="text-slate-500 text-sm">
              No activity yet. Complete your setup to start seeing events across all seven pillars.
            </p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {activities.map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${TYPE_ICONS[a.type]?.split(' ')[0] || 'bg-slate-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300 truncate">{a.text}</p>
                    <p className="text-xs text-slate-500">{formatDate(a.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
