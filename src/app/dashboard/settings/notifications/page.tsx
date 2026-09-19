'use client';

import { useState, useCallback } from 'react';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Clock,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

type Channel = 'email' | 'sms' | 'push' | 'inApp';
type Frequency = 'realtime' | 'hourly' | 'daily';

interface AlertConfig {
  label: string;
  key: string;
  channels: Record<Channel, boolean>;
}

interface CategoryConfig {
  id: string;
  label: string;
  description: string;
  alerts: AlertConfig[];
}

const CHANNEL_META: { key: Channel; label: string; icon: typeof Mail }[] = [
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'sms', label: 'SMS', icon: MessageSquare },
  { key: 'push', label: 'Push', icon: Smartphone },
  { key: 'inApp', label: 'In-App', icon: Bell },
];

const defaultChannels = (): Record<Channel, boolean> => ({
  email: true,
  sms: false,
  push: true,
  inApp: true,
});

const INITIAL_CATEGORIES: CategoryConfig[] = [
  {
    id: 'revenue',
    label: 'Revenue Alerts',
    description: 'Stay informed about your financial performance',
    alerts: [
      { label: 'Daily Summary', key: 'revenue_daily', channels: defaultChannels() },
      { label: 'Large Transactions', key: 'revenue_large', channels: defaultChannels() },
      { label: 'Refunds', key: 'revenue_refunds', channels: defaultChannels() },
    ],
  },
  {
    id: 'customer',
    label: 'Customer Alerts',
    description: 'Track customer activity and engagement',
    alerts: [
      { label: 'New Customer', key: 'customer_new', channels: defaultChannels() },
      { label: 'VIP Visit', key: 'customer_vip', channels: defaultChannels() },
      { label: 'Birthday', key: 'customer_birthday', channels: defaultChannels() },
    ],
  },
  {
    id: 'review',
    label: 'Review Alerts',
    description: 'Monitor your online reputation',
    alerts: [
      { label: 'New Review', key: 'review_new', channels: defaultChannels() },
      { label: 'Negative Review', key: 'review_negative', channels: defaultChannels() },
      { label: 'Response Needed', key: 'review_response', channels: defaultChannels() },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    description: 'Keep your restaurant running smoothly',
    alerts: [
      { label: 'Reservation', key: 'ops_reservation', channels: defaultChannels() },
      { label: 'Waitlist Full', key: 'ops_waitlist', channels: defaultChannels() },
      { label: 'Inventory Low', key: 'ops_inventory', channels: defaultChannels() },
      { label: 'Staff Schedule Change', key: 'ops_staff', channels: defaultChannels() },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    description: 'Track campaign performance and goals',
    alerts: [
      { label: 'Campaign Sent', key: 'mkt_sent', channels: defaultChannels() },
      { label: 'Campaign Results', key: 'mkt_results', channels: defaultChannels() },
      { label: 'Goal Achieved', key: 'mkt_goal', channels: defaultChannels() },
    ],
  },
  {
    id: 'system',
    label: 'System',
    description: 'Technical and account notifications',
    alerts: [
      { label: 'Error Alerts', key: 'sys_error', channels: defaultChannels() },
      { label: 'Billing', key: 'sys_billing', channels: defaultChannels() },
      { label: 'Integration Status', key: 'sys_integration', channels: defaultChannels() },
    ],
  },
];

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
        enabled ? 'bg-seat-red' : 'bg-zinc-700'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
          enabled ? 'translate-x-4' : 'translate-x-0'
        )}
      />
    </button>
  );
}

export default function NotificationsPage() {
  const [categories, setCategories] = useState<CategoryConfig[]>(
    () => INITIAL_CATEGORIES.map(c => ({
      ...c,
      alerts: c.alerts.map(a => ({ ...a, channels: { ...a.channels } })),
    }))
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ revenue: true });
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('07:00');
  const [frequency, setFrequency] = useState<Frequency>('realtime');

  const toggleExpanded = useCallback((id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleChannel = useCallback((categoryId: string, alertKey: string, channel: Channel) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id !== categoryId
          ? cat
          : {
              ...cat,
              alerts: cat.alerts.map(a =>
                a.key !== alertKey
                  ? a
                  : { ...a, channels: { ...a.channels, [channel]: !a.channels[channel] } }
              ),
            }
      )
    );
  }, []);

  const toggleAllInCategory = useCallback((categoryId: string, enabled: boolean) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id !== categoryId
          ? cat
          : {
              ...cat,
              alerts: cat.alerts.map(a => ({
                ...a,
                channels: { email: enabled, sms: enabled, push: enabled, inApp: enabled },
              })),
            }
      )
    );
  }, []);

  const isCategoryAllEnabled = (cat: CategoryConfig) =>
    cat.alerts.every(a => Object.values(a.channels).every(Boolean));

  const saveSettings = () => {
    toast.success('Notification preferences saved');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
          <Bell className="w-5 h-5 text-seat-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-sm text-zinc-500">
            Configure how and when you receive alerts
          </p>
        </div>
      </div>

      {/* Frequency */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-zinc-400" />
          Delivery Frequency
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {([
            { value: 'realtime', label: 'Real-time', desc: 'Instant delivery' },
            { value: 'hourly', label: 'Hourly Digest', desc: 'Batched every hour' },
            { value: 'daily', label: 'Daily Digest', desc: 'Once per day summary' },
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => setFrequency(opt.value)}
              className={cn(
                'flex flex-col items-center gap-1 p-4 rounded-xl border transition-all text-center',
                frequency === opt.value
                  ? 'border-seat-red bg-seat-red/5 ring-1 ring-seat-red/20'
                  : 'border-seat-border bg-zinc-800/30 hover:border-zinc-600'
              )}
            >
              <span className={cn('text-sm font-medium', frequency === opt.value ? 'text-white' : 'text-zinc-400')}>
                {opt.label}
              </span>
              <span className="text-xs text-zinc-500">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            {quietHoursEnabled ? (
              <VolumeX className="w-4 h-4 text-seat-red" />
            ) : (
              <Volume2 className="w-4 h-4 text-zinc-400" />
            )}
            Quiet Hours
          </h3>
          <Toggle enabled={quietHoursEnabled} onChange={() => setQuietHoursEnabled(prev => !prev)} />
        </div>
        <p className="text-xs text-zinc-500">Silence non-critical notifications during set hours</p>
        {quietHoursEnabled && (
          <div className="flex items-center gap-4 pt-1">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-500">Start</label>
              <input
                type="time"
                value={quietStart}
                onChange={e => setQuietStart(e.target.value)}
                className="bg-zinc-800 border border-seat-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-seat-red"
              />
            </div>
            <span className="text-zinc-500 mt-5">to</span>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-500">End</label>
              <input
                type="time"
                value={quietEnd}
                onChange={e => setQuietEnd(e.target.value)}
                className="bg-zinc-800 border border-seat-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-seat-red"
              />
            </div>
          </div>
        )}
      </div>

      {/* Alert Categories */}
      <div className="space-y-3">
        {categories.map(cat => {
          const isOpen = expanded[cat.id] ?? false;
          const allEnabled = isCategoryAllEnabled(cat);

          return (
            <div key={cat.id} className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
              {/* Category Header */}
              <button
                type="button"
                onClick={() => toggleExpanded(cat.id)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-zinc-800/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{cat.label}</h3>
                    <p className="text-xs text-zinc-500">{cat.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div onClick={e => e.stopPropagation()}>
                    <Toggle
                      enabled={allEnabled}
                      onChange={() => toggleAllInCategory(cat.id, !allEnabled)}
                    />
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  )}
                </div>
              </button>

              {/* Expanded Alerts */}
              {isOpen && (
                <div className="border-t border-seat-border">
                  {/* Channel headers */}
                  <div className="grid grid-cols-[1fr_repeat(4,64px)] items-center px-5 py-2 border-b border-seat-border/50">
                    <span className="text-xs text-zinc-500 font-medium">Alert Type</span>
                    {CHANNEL_META.map(ch => (
                      <span key={ch.key} className="text-xs text-zinc-500 font-medium text-center">
                        {ch.label}
                      </span>
                    ))}
                  </div>

                  {cat.alerts.map(alert => (
                    <div
                      key={alert.key}
                      className="grid grid-cols-[1fr_repeat(4,64px)] items-center px-5 py-3 hover:bg-zinc-800/20 transition-colors"
                    >
                      <span className="text-sm text-zinc-300">{alert.label}</span>
                      {CHANNEL_META.map(ch => (
                        <div key={ch.key} className="flex justify-center">
                          <Toggle
                            enabled={alert.channels[ch.key]}
                            onChange={() => toggleChannel(cat.id, alert.key, ch.key)}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Channel Legend */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Channel Legend</h3>
        <div className="flex flex-wrap gap-4">
          {CHANNEL_META.map(ch => (
            <div key={ch.key} className="flex items-center gap-2 text-xs text-zinc-400">
              <ch.icon className="w-3.5 h-3.5" />
              <span>{ch.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          className="px-6 py-2.5 bg-seat-red text-white text-sm font-medium rounded-lg hover:bg-seat-red/90 transition-colors"
        >
          Save Preferences
        </button>
      </div>
    </div>
  );
}
