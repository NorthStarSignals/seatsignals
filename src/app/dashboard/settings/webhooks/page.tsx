'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import {
  Link2, Zap, CheckCircle, XCircle, Send, Trash2, Plus, RefreshCw,
  ChevronDown, ChevronUp, Copy, Eye, EyeOff,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────

interface WebhookLog {
  id: string;
  event: string;
  response_status: number;
  response_body: string;
  created_at: string;
}

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string | null;
  active: boolean;
  last_triggered: string | null;
  last_status: number | null;
  failure_count: number;
  created_at: string;
  recent_logs: WebhookLog[];
}

// ── Event categories ───────────────────────────────────────────────────

const EVENT_CATEGORIES: { label: string; events: { value: string; label: string }[] }[] = [
  {
    label: 'Customer',
    events: [
      { value: 'customer.created', label: 'Customer Created' },
      { value: 'customer.updated', label: 'Customer Updated' },
    ],
  },
  {
    label: 'Reviews',
    events: [
      { value: 'review.received', label: 'Review Received' },
      { value: 'review.responded', label: 'Review Responded' },
    ],
  },
  {
    label: 'Leads',
    events: [
      { value: 'lead.created', label: 'Lead Created' },
      { value: 'lead.converted', label: 'Lead Converted' },
    ],
  },
  {
    label: 'Orders',
    events: [
      { value: 'order.placed', label: 'Order Placed' },
      { value: 'order.completed', label: 'Order Completed' },
    ],
  },
  {
    label: 'Visits',
    events: [
      { value: 'visit.recorded', label: 'Visit Recorded' },
    ],
  },
  {
    label: 'Birthdays',
    events: [
      { value: 'birthday.upcoming', label: 'Birthday Upcoming' },
      { value: 'birthday.redeemed', label: 'Birthday Redeemed' },
    ],
  },
  {
    label: 'Surveys',
    events: [
      { value: 'survey.completed', label: 'Survey Completed' },
    ],
  },
];

const ALL_EVENTS = EVENT_CATEGORIES.flatMap((c) => c.events.map((e) => e.value));

// ── Helpers ────────────────────────────────────────────────────────────

function generateSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'whsec_';
  for (let i = 0; i < 32; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function statusColor(status: number | null): string {
  if (!status) return 'text-zinc-500';
  if (status >= 200 && status < 300) return 'text-emerald-400';
  return 'text-red-400';
}

function statusDot(wh: Webhook): string {
  if (!wh.last_triggered) return 'bg-zinc-500';
  if (wh.last_status && wh.last_status >= 200 && wh.last_status < 300) return 'bg-emerald-400';
  return 'bg-red-400';
}

// ── Component ──────────────────────────────────────────────────────────

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);


  // Form state
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [formSecret, setFormSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch('/api/webhooks');
      const data = await res.json();
      setWebhooks(data.webhooks || []);
    } catch {
      toast.error('Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const toggleEvent = (ev: string) => {
    setFormEvents((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]
    );
  };

  const resetForm = () => {
    setFormName('');
    setFormUrl('');
    setFormEvents([]);
    setFormSecret('');
    setShowSecret(false);
  };

  const handleSave = async () => {
    if (!formName.trim()) return toast.error('Name is required');
    if (!formUrl.trim()) return toast.error('URL is required');
    try {
      new URL(formUrl);
    } catch {
      return toast.error('Invalid URL format');
    }
    if (formEvents.length === 0) return toast.error('Select at least one event');

    setSaving(true);
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          url: formUrl.trim(),
          events: formEvents,
          secret: formSecret || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }
      toast.success('Webhook created');
      setShowModal(false);
      resetForm();
      fetchWebhooks();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (wh: Webhook) => {
    try {
      const res = await fetch('/api/webhooks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: wh.id, active: !wh.active }),
      });
      if (!res.ok) throw new Error();
      setWebhooks((prev) =>
        prev.map((w) => (w.id === wh.id ? { ...w, active: !w.active } : w))
      );
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this webhook? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/webhooks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      toast.success('Webhook deleted');
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleTest = async (webhookId: string) => {
    setTestingId(webhookId);
    try {
      const res = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_id: webhookId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Test successful (${data.status_code})`);
      } else {
        toast.error(`Test failed: ${data.status_code || data.error}`);
      }
      fetchWebhooks();
    } catch {
      toast.error('Test request failed');
    } finally {
      setTestingId(null);
    }
  };

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    // Fetch more logs if needed -- the GET returns 5, but we want 10 for expanded view
    // For now, use what we have. Could add a dedicated logs endpoint later.
  };

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-seat-black text-white p-6 md:p-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-seat-card flex items-center justify-center border border-seat-border">
            <Link2 size={20} className="text-seat-red" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Webhooks</h1>
            <p className="text-sm text-zinc-400">Connect SeatSignals to external services</p>
          </div>
        </div>
        <Button onClick={() => setShowModal(true)} size="sm">
          <Plus size={14} />
          Add Webhook
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={20} className="animate-spin text-zinc-500" />
        </div>
      )}

      {/* Empty state */}
      {!loading && webhooks.length === 0 && (
        <div className="text-center py-20 border border-dashed border-seat-border rounded-xl">
          <Zap size={32} className="mx-auto text-zinc-600 mb-3" />
          <p className="text-zinc-400 mb-1">No webhooks configured</p>
          <p className="text-xs text-zinc-500 mb-4">
            Add a webhook to send real-time events to Zapier, Make, or your own endpoints
          </p>
          <Button onClick={() => setShowModal(true)} size="sm">
            <Plus size={14} />
            Create Your First Webhook
          </Button>
        </div>
      )}

      {/* Webhook list */}
      <div className="space-y-3">
        {webhooks.map((wh) => (
          <div
            key={wh.id}
            className="bg-seat-card border border-seat-border rounded-xl overflow-hidden"
          >
            {/* Card header */}
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDot(wh)}`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{wh.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 shrink-0">
                      {wh.events.length} event{wh.events.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 truncate max-w-[300px]">{wh.url}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {wh.last_triggered && (
                  <span className="text-[11px] text-zinc-500 hidden sm:block">
                    {timeAgo(wh.last_triggered)}
                  </span>
                )}
                {/* Active toggle */}
                <button
                  onClick={() => handleToggleActive(wh)}
                  className={`w-9 h-5 rounded-full transition-colors relative ${
                    wh.active ? 'bg-emerald-600' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      wh.active ? 'left-[18px]' : 'left-0.5'
                    }`}
                  />
                </button>
                <button
                  onClick={() => handleExpand(wh.id)}
                  className="text-zinc-400 hover:text-white p-1"
                >
                  {expandedId === wh.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>

            {/* Expanded details */}
            {expandedId === wh.id && (
              <div className="border-t border-seat-border px-5 py-4 space-y-4">
                {/* Full URL */}
                <div>
                  <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Endpoint URL</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-zinc-300 bg-zinc-900 px-2 py-1 rounded break-all flex-1">
                      {wh.url}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(wh.url);
                        toast.success('URL copied');
                      }}
                      className="text-zinc-500 hover:text-white p-1"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>

                {/* Events */}
                <div>
                  <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1.5">Events</p>
                  <div className="flex flex-wrap gap-1.5">
                    {wh.events.map((ev) => (
                      <span
                        key={ev}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700"
                      >
                        {ev}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Recent logs */}
                <div>
                  <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1.5">
                    Recent Deliveries
                  </p>
                  {wh.recent_logs.length === 0 ? (
                    <p className="text-xs text-zinc-600">No deliveries yet</p>
                  ) : (
                    <div className="space-y-1">
                      {wh.recent_logs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center gap-3 text-xs bg-zinc-900/50 rounded px-3 py-2"
                        >
                          {log.response_status >= 200 && log.response_status < 300 ? (
                            <CheckCircle size={13} className="text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle size={13} className="text-red-400 shrink-0" />
                          )}
                          <span className="text-zinc-400 w-24 shrink-0 truncate">{log.event}</span>
                          <span className={`font-mono ${statusColor(log.response_status)} shrink-0`}>
                            {log.response_status || 'ERR'}
                          </span>
                          <span className="text-zinc-600 truncate flex-1">
                            {log.response_body?.slice(0, 80)}
                          </span>
                          <span className="text-zinc-600 shrink-0">
                            {timeAgo(log.created_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleTest(wh.id)}
                    disabled={testingId === wh.id}
                  >
                    {testingId === wh.id ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <Send size={13} />
                    )}
                    Send Test
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    onClick={() => handleDelete(wh.id)}
                  >
                    <Trash2 size={13} />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Add Webhook Modal ───────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-seat-dark border border-seat-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-seat-border">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Link2 size={18} className="text-seat-red" />
                Add Webhook
              </h2>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="text-zinc-400 hover:text-white text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Name */}
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Zapier - New Customer"
                  className="w-full bg-seat-black border border-seat-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-seat-red"
                />
              </div>

              {/* URL */}
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Endpoint URL</label>
                <input
                  type="url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://hooks.zapier.com/..."
                  className="w-full bg-seat-black border border-seat-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-seat-red"
                />
              </div>

              {/* Events */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-zinc-400">Events</label>
                  <button
                    onClick={() =>
                      setFormEvents((prev) =>
                        prev.length === ALL_EVENTS.length ? [] : [...ALL_EVENTS]
                      )
                    }
                    className="text-[11px] text-seat-red hover:text-red-300"
                  >
                    {formEvents.length === ALL_EVENTS.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="space-y-3">
                  {EVENT_CATEGORIES.map((cat) => (
                    <div key={cat.label}>
                      <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">
                        {cat.label}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.events.map((ev) => {
                          const selected = formEvents.includes(ev.value);
                          return (
                            <button
                              key={ev.value}
                              onClick={() => toggleEvent(ev.value)}
                              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                                selected
                                  ? 'bg-seat-red/20 border-seat-red text-red-300'
                                  : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                              }`}
                            >
                              {ev.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Secret */}
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">
                  Signing Secret <span className="text-zinc-600">(optional)</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={formSecret}
                      onChange={(e) => setFormSecret(e.target.value)}
                      placeholder="Enter or generate a secret"
                      className="w-full bg-seat-black border border-seat-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-seat-red pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                    >
                      {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const s = generateSecret();
                      setFormSecret(s);
                      setShowSecret(true);
                    }}
                  >
                    Generate
                  </Button>
                </div>
                <p className="text-[11px] text-zinc-600 mt-1">
                  Used to sign payloads with HMAC SHA-256 via the X-SeatSignals-Signature header
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 p-5 border-t border-seat-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowModal(false); resetForm(); }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
                {saving ? 'Creating...' : 'Create Webhook'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
