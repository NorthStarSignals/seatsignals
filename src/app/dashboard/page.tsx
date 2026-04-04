'use client';

import { useState, useEffect } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Users, MessageSquare, Target, Building2, Clock, Cake, DollarSign, Mail, Smartphone, Zap } from 'lucide-react';

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
  integrations?: {
    connected_count: number;
    connected_providers: string[];
    delivery_count: number;
    pos_connected: boolean;
    pos_daily_revenue: number;
    crm_connected: boolean;
    email_subscribers: number;
    sms_subscribers: number;
    delivery_revenue: number;
  };
  activities: Array<{ text: string; time: string; type: string }>;
}

const TYPE_DOT_COLORS: Record<string, string> = {
  customer: 'bg-seat-red',
  review: 'bg-amber-500',
  catering: 'bg-purple-500',
  retention: 'bg-emerald-500',
  dead_hours: 'bg-orange-500',
  birthday: 'bg-pink-500',
  anniversary: 'bg-pink-500',
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
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white tracking-tight">Overview</h1>
          <p className="text-sm text-zinc-500 mt-1">Your restaurant at a glance</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-seat-card border border-seat-border rounded-xl p-5 animate-pulse">
              <div className="h-3 bg-zinc-800 rounded w-20 mb-3"></div>
              <div className="h-7 bg-zinc-800 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const m = data?.metrics || { total_customers: 0, response_rate: 0, active_leads: 0, corp_accounts: 0, dead_hours_filled: 0, upcoming_birthdays: 0 };
  const r = data?.revenue || { total: 0, repeat_visits: 0, catering: 0, corporate_recurring: 0, dead_hours: 0, birthdays: 0, delivery_uplift: 0 };
  const integrations = data?.integrations;
  const activities = data?.activities || [];

  const revenueBreakdown = [
    { label: 'Repeat Visits', value: r.repeat_visits, color: 'bg-emerald-500' },
    { label: 'Catering', value: r.catering, color: 'bg-purple-500' },
    { label: 'Corporate Recurring', value: r.corporate_recurring, color: 'bg-blue-500' },
    { label: 'Dead Hours', value: r.dead_hours, color: 'bg-seat-red' },
    { label: 'Birthdays', value: r.birthdays, color: 'bg-pink-500' },
    { label: 'Delivery Uplift', value: r.delivery_uplift, color: 'bg-amber-500' },
  ];

  const maxRevenue = Math.max(...revenueBreakdown.map(b => b.value), 1);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Overview</h1>
        <p className="text-sm text-zinc-500 mt-1">Your restaurant at a glance</p>
      </div>

      {/* Connected Integrations Summary */}
      {integrations && integrations.connected_count > 0 && (
        <div className="bg-seat-card border border-seat-border rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-red-500" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Connected Integrations</h2>
            <span className="text-xs text-zinc-500">{integrations.connected_count} active</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {integrations.connected_providers.map((name) => (
              <span key={name} className="inline-flex items-center gap-1.5 bg-zinc-800 text-zinc-300 text-xs px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <MetricCard title="Total Customers" value={m.total_customers} icon={<Users size={16} />} />
        <MetricCard title="Review Response" value={`${m.response_rate}%`} icon={<MessageSquare size={16} />} />
        <MetricCard title="Active Leads" value={m.active_leads} icon={<Target size={16} />} />
        <MetricCard title="Corp Accounts" value={m.corp_accounts} icon={<Building2 size={16} />} />
        <MetricCard title="Dead Hours Filled" value={m.dead_hours_filled} subtitle="This month" icon={<Clock size={16} />} />
        <MetricCard title="Upcoming Birthdays" value={m.upcoming_birthdays} subtitle="Next 30 days" icon={<Cake size={16} />} />
      </div>

      {/* Integration Metrics Row */}
      {integrations && (integrations.pos_connected || integrations.delivery_count > 0 || integrations.crm_connected) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {integrations.pos_connected && (
            <MetricCard title="POS Daily Revenue" value={formatCurrency(integrations.pos_daily_revenue)} subtitle="From connected POS" icon={<DollarSign size={16} />} />
          )}
          {integrations.delivery_count > 0 && (
            <MetricCard title="Delivery Revenue" value={formatCurrency(integrations.delivery_revenue)} subtitle={`${integrations.delivery_count} platform${integrations.delivery_count > 1 ? 's' : ''}`} icon={<DollarSign size={16} />} />
          )}
          {integrations.crm_connected && (
            <MetricCard title="Email Subscribers" value={integrations.email_subscribers.toLocaleString()} subtitle="From connected CRM" icon={<Mail size={16} />} />
          )}
          {integrations.crm_connected && (
            <MetricCard title="SMS Subscribers" value={integrations.sms_subscribers.toLocaleString()} subtitle="From connected CRM" icon={<Smartphone size={16} />} />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Attribution */}
        <div className="bg-seat-card border border-seat-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Revenue Attribution</h2>
            <span className="text-2xl font-bold text-seat-red tracking-tight">{formatCurrency(r.total)}</span>
          </div>
          <p className="text-xs text-zinc-600 mb-5">SeatSignals-attributed revenue this month</p>
          <div className="space-y-4">
            {revenueBreakdown.map((b) => (
              <div key={b.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-zinc-400">{b.label}</span>
                  <span className="text-white font-medium tabular-nums">{formatCurrency(b.value)}</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${b.color} rounded-full`}
                    style={{ width: `${(b.value / maxRevenue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-seat-card border border-seat-border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-5">Activity Feed</h2>
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
                <Clock size={18} className="text-zinc-500" />
              </div>
              <p className="text-zinc-500 text-sm">
                No activity yet. Complete your setup to start seeing events.
              </p>
            </div>
          ) : (
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {activities.map((a, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-zinc-800/40">
                  <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${TYPE_DOT_COLORS[a.type] || 'bg-zinc-600'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300 leading-snug">{a.text}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">{formatDate(a.time)}</p>
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
