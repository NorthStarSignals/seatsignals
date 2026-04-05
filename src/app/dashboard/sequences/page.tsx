'use client';

import { useState, useEffect, useCallback } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { Button } from '@/components/ui/button';
import { SequenceDefinition } from '@/lib/types';
import {
  Zap,
  Mail,
  MessageSquare,
  Layers,
  Send,
  Eye,
  MousePointer,
  TrendingUp,
  Plus,
  X,
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

// ─── Toggle Switch ───────────────────────────────────────────────────────────

function ToggleSwitch({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E11D48] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B] disabled:opacity-50 disabled:cursor-not-allowed',
        enabled ? 'bg-[#E11D48]' : 'bg-zinc-700'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-in-out',
          enabled ? 'translate-x-4' : 'translate-x-0'
        )}
      />
    </button>
  );
}

// ─── Channel Badge ────────────────────────────────────────────────────────────

function ChannelBadge({ channel }: { channel: 'sms' | 'email' | 'both' }) {
  const map = {
    sms: { label: 'SMS', icon: MessageSquare, cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    email: { label: 'Email', icon: Mail, cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    both: { label: 'SMS + Email', icon: Layers, cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  };
  const { label, icon: Icon, cls } = map[channel] ?? map.sms;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border', cls)}>
      <Icon size={10} />
      {label}
    </span>
  );
}

// ─── Type Badge ───────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const label = type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
      {label}
    </span>
  );
}

// ─── Funnel Bar ───────────────────────────────────────────────────────────────

function FunnelBar({ stats }: { stats: NonNullable<SequenceDefinition['stats']> }) {
  const total = stats.sent || 1;
  const openPct = Math.round((stats.opened / total) * 100);
  const clickPct = Math.round((stats.clicked / total) * 100);
  const convPct = Math.round((stats.converted / total) * 100);

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-zinc-600 w-16">Opened</span>
        <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${openPct}%` }} />
        </div>
        <span className="text-[10px] text-zinc-500 w-8 text-right">{openPct}%</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-zinc-600 w-16">Clicked</span>
        <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${clickPct}%` }} />
        </div>
        <span className="text-[10px] text-zinc-500 w-8 text-right">{clickPct}%</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-zinc-600 w-16">Converted</span>
        <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-[#E11D48] rounded-full transition-all duration-500" style={{ width: `${convPct}%` }} />
        </div>
        <span className="text-[10px] text-zinc-500 w-8 text-right">{convPct}%</span>
      </div>
    </div>
  );
}

// ─── Sequence Card ────────────────────────────────────────────────────────────

function SequenceCard({
  definition,
  onToggle,
}: {
  definition: SequenceDefinition;
  onToggle: (id: string, enabled: boolean) => Promise<void>;
}) {
  const [toggling, setToggling] = useState(false);
  const stats = definition.stats ?? { sent: 0, opened: 0, clicked: 0, converted: 0 };

  const handleToggle = async (val: boolean) => {
    setToggling(true);
    try {
      await onToggle(definition.id, val);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4 hover:border-zinc-700 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <TypeBadge type={definition.type} />
            <ChannelBadge channel={definition.channel} />
          </div>
          <h3 className="text-sm font-semibold text-white leading-tight">{definition.name}</h3>
          {definition.trigger_event && (
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Trigger: <span className="text-zinc-400">{definition.trigger_event.replace(/_/g, ' ')}</span>
              {definition.delay_days > 0 && (
                <span className="ml-1 text-zinc-500">· {definition.delay_days}d delay</span>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-zinc-500">{definition.enabled ? 'On' : 'Off'}</span>
          <ToggleSwitch enabled={definition.enabled} onChange={handleToggle} disabled={toggling} />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Sent', value: stats.sent, icon: Send, color: 'text-zinc-300' },
          { label: 'Opened', value: stats.opened, icon: Eye, color: 'text-blue-400' },
          { label: 'Clicked', value: stats.clicked, icon: MousePointer, color: 'text-purple-400' },
          { label: 'Converted', value: stats.converted, icon: TrendingUp, color: 'text-[#E11D48]' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-zinc-800/50 rounded-lg p-2 text-center">
            <Icon size={12} className={cn('mx-auto mb-1', color)} />
            <p className="text-sm font-bold text-white">{value.toLocaleString()}</p>
            <p className="text-[10px] text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Funnel bar */}
      {stats.sent > 0 && <FunnelBar stats={stats} />}
      {stats.sent === 0 && (
        <p className="text-[11px] text-zinc-600 text-center py-1">No messages sent yet</p>
      )}
    </div>
  );
}

// ─── Create Form ──────────────────────────────────────────────────────────────

interface CreateFormData {
  name: string;
  channel: 'sms' | 'email' | 'both';
  trigger_event: string;
  delay_days: string;
  subject: string;
  message_template: string;
}

function CreateSequenceForm({
  onSubmit,
  onCancel,
  submitting,
}: {
  onSubmit: (data: CreateFormData) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<CreateFormData>({
    name: '',
    channel: 'sms',
    trigger_event: 'manual',
    delay_days: '0',
    subject: '',
    message_template: '',
  });

  const set = (key: keyof CreateFormData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  const inputCls =
    'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#E11D48] focus:ring-1 focus:ring-[#E11D48] transition-colors';
  const labelCls = 'block text-xs font-medium text-zinc-400 mb-1';

  return (
    <div className="bg-zinc-900 border border-[#E11D48]/30 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Plus size={14} className="text-[#E11D48]" />
          Create Custom Sequence
        </h3>
        <button onClick={onCancel} className="text-zinc-500 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Sequence Name *</label>
            <input
              className={inputCls}
              placeholder="e.g. VIP Anniversary Offer"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              required
            />
          </div>

          <div>
            <label className={labelCls}>Channel *</label>
            <div className="relative">
              <select
                className={cn(inputCls, 'appearance-none pr-8')}
                value={form.channel}
                onChange={(e) => set('channel', e.target.value as CreateFormData['channel'])}
              >
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="both">SMS + Email</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Trigger Event</label>
            <div className="relative">
              <select
                className={cn(inputCls, 'appearance-none pr-8')}
                value={form.trigger_event}
                onChange={(e) => set('trigger_event', e.target.value)}
              >
                <option value="manual">Manual</option>
                <option value="first_visit">First Visit</option>
                <option value="birthday">Birthday</option>
                <option value="dead_hours">Dead Hours</option>
                <option value="days_since_visit">Days Since Visit</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Delay (days)</label>
            <input
              type="number"
              min="0"
              max="365"
              className={inputCls}
              placeholder="0"
              value={form.delay_days}
              onChange={(e) => set('delay_days', e.target.value)}
            />
          </div>
        </div>

        {(form.channel === 'email' || form.channel === 'both') && (
          <div>
            <label className={labelCls}>Email Subject</label>
            <input
              className={inputCls}
              placeholder="e.g. A special offer just for you, {{first_name}}!"
              value={form.subject}
              onChange={(e) => set('subject', e.target.value)}
            />
          </div>
        )}

        <div>
          <label className={labelCls}>Message Template</label>
          <textarea
            className={cn(inputCls, 'resize-none')}
            rows={3}
            placeholder="Use {{first_name}}, {{restaurant_name}} as placeholders..."
            value={form.message_template}
            onChange={(e) => set('message_template', e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={submitting || !form.name}>
            {submitting ? 'Creating...' : 'Create Sequence'}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SequencesPage() {
  const [definitions, setDefinitions] = useState<SequenceDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchDefinitions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sequences');
      if (!res.ok) throw new Error('Failed to load sequences');
      const data = await res.json();
      setDefinitions(data.definitions ?? []);
    } catch {
      toast.error('Could not load sequences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDefinitions();
  }, [fetchDefinitions]);

  // ── Aggregate metrics ──────────────────────────────────────────────────────

  const metrics = (() => {
    const totalSent = definitions.reduce((sum, d) => sum + (d.stats?.sent ?? 0), 0);
    const totalOpened = definitions.reduce((sum, d) => sum + (d.stats?.opened ?? 0), 0);
    const totalClicked = definitions.reduce((sum, d) => sum + (d.stats?.clicked ?? 0), 0);
    const totalConverted = definitions.reduce((sum, d) => sum + (d.stats?.converted ?? 0), 0);

    const safeDiv = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 100));

    return {
      totalSent,
      openRate: safeDiv(totalOpened, totalSent),
      clickRate: safeDiv(totalClicked, totalSent),
      convRate: safeDiv(totalConverted, totalSent),
    };
  })();

  // ── Toggle handler ─────────────────────────────────────────────────────────

  const handleToggle = async (id: string, enabled: boolean) => {
    // Optimistic update
    setDefinitions((prev) =>
      prev.map((d) => (d.id === id ? { ...d, enabled } : d))
    );

    const res = await fetch('/api/sequences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, enabled }),
    });

    if (!res.ok) {
      // Revert
      setDefinitions((prev) =>
        prev.map((d) => (d.id === id ? { ...d, enabled: !enabled } : d))
      );
      toast.error('Failed to update sequence');
    } else {
      toast.success(enabled ? 'Sequence enabled' : 'Sequence disabled');
    }
  };

  // ── Create handler ─────────────────────────────────────────────────────────

  const handleCreate = async (formData: {
    name: string;
    channel: 'sms' | 'email' | 'both';
    trigger_event: string;
    delay_days: string;
    subject: string;
    message_template: string;
  }) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          channel: formData.channel,
          trigger_event: formData.trigger_event,
          delay_days: parseInt(formData.delay_days, 10) || 0,
          subject: formData.subject || undefined,
          message_template: formData.message_template || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to create');
      }

      const { definition } = await res.json();
      setDefinitions((prev) => [
        ...prev,
        { ...definition, stats: { sent: 0, opened: 0, clicked: 0, converted: 0 } },
      ]);
      setShowCreate(false);
      toast.success('Sequence created!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create sequence');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#09090B] p-6 lg:p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap size={18} className="text-[#E11D48]" />
            <h1 className="text-xl font-bold text-white">Sequences & Campaigns</h1>
          </div>
          <p className="text-sm text-zinc-500">
            Automated messaging campaigns that drive repeat visits and revenue
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowCreate((v) => !v)}
          className="gap-1.5"
        >
          <Plus size={14} />
          Create Custom
        </Button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Total Sent"
          value={metrics.totalSent.toLocaleString()}
          subtitle="All time across sequences"
          icon={<Send size={14} />}
        />
        <MetricCard
          title="Avg Open Rate"
          value={`${metrics.openRate}%`}
          subtitle="Messages opened"
          icon={<Eye size={14} />}
        />
        <MetricCard
          title="Avg Click Rate"
          value={`${metrics.clickRate}%`}
          subtitle="Links clicked"
          icon={<MousePointer size={14} />}
        />
        <MetricCard
          title="Avg Conversion"
          value={`${metrics.convRate}%`}
          subtitle="Customers converted"
          icon={<TrendingUp size={14} />}
        />
      </div>

      {/* Create form (inline) */}
      {showCreate && (
        <CreateSequenceForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
          submitting={submitting}
        />
      )}

      {/* Sequence grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 h-52 animate-pulse"
            />
          ))}
        </div>
      ) : definitions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Zap size={40} className="text-zinc-700 mb-4" />
          <p className="text-white font-medium mb-1">No sequences yet</p>
          <p className="text-sm text-zinc-500">Create your first campaign to start engaging customers.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {definitions.map((def) => (
            <SequenceCard key={def.id} definition={def} onToggle={handleToggle} />
          ))}
        </div>
      )}
    </div>
  );
}
