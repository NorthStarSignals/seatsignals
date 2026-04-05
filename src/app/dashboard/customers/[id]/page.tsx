'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { MetricCard } from '@/components/ui/metric-card';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { Customer, Visit, Sequence } from '@/lib/types';
import { ArrowLeft, Mail, Phone, Calendar, Tag, X, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

// Extended customer type to include fields editable on this page
interface CustomerProfile extends Customer {
  last_name?: string;
  tags?: string[];
  notes?: string;
}

interface SequenceWithChannel extends Sequence {
  channel?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  wifi: 'WiFi',
  qr: 'QR Code',
  manual: 'Manual',
};

const inputClass =
  'bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 w-full';

function daysSince(dateStr: string): number {
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export default function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();

  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [messages, setMessages] = useState<SequenceWithChannel[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    birthday: '',
  });

  // Tag state
  const [tags, setTags] = useState<string[]>([]);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');

  // Notes
  const [notes, setNotes] = useState('');

  // Quick-send forms
  const [showSmsForm, setShowSmsForm] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [smsBody, setSmsBody] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sending, setSending] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${id}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setCustomer(data.customer);
      setVisits(data.visits || []);
      setMessages(data.messages || []);
      setTags(data.customer.tags || []);
      setNotes(data.customer.notes || '');
      setEditForm({
        first_name: data.customer.first_name || '',
        last_name: data.customer.last_name || '',
        email: data.customer.email || '',
        phone: data.customer.phone || '',
        birthday: data.customer.birthday || '',
      });
    } catch {
      toast.error('Could not load customer profile');
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const saveEdits = async () => {
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error);
      }
      const updated = await res.json();
      setCustomer((prev) => ({ ...prev!, ...updated }));
      setEditing(false);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const saveTags = async (nextTags: string[]) => {
    setTags(nextTags);
    try {
      await fetch(`/api/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: nextTags }),
      });
    } catch {
      // silent — tags are local until next load
    }
  };

  const addTag = () => {
    const trimmed = newTag.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    const next = [...tags, trimmed];
    saveTags(next);
    setNewTag('');
    setShowTagInput(false);
  };

  const removeTag = (tag: string) => {
    saveTags(tags.filter((t) => t !== tag));
  };

  const saveNotes = async () => {
    try {
      await fetch(`/api/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      toast.success('Notes saved');
    } catch {
      toast.error('Failed to save notes');
    }
  };

  const sendMessage = async (channel: 'sms' | 'email') => {
    const message = channel === 'sms' ? smsBody : emailBody;
    if (!message.trim()) {
      toast.error('Message cannot be empty');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/customers/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          message,
          subject: channel === 'email' ? emailSubject || 'Message from us' : undefined,
        }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error);
      }
      toast.success(`${channel === 'sms' ? 'SMS' : 'Email'} sent`);
      if (channel === 'sms') {
        setSmsBody('');
        setShowSmsForm(false);
      } else {
        setEmailSubject('');
        setEmailBody('');
        setShowEmailForm(false);
      }
      // Refresh message history
      fetchProfile();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Send failed');
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-zinc-400">Loading profile...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-zinc-400">Customer not found.</p>
        <Link href="/dashboard/customers" className="text-red-400 hover:underline text-sm">
          ← Back to Customers
        </Link>
      </div>
    );
  }

  const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Unnamed';
  const daysSinceLast = customer.last_seen ? daysSince(customer.last_seen) : null;
  const totalSpend = typeof customer.total_spend === 'number' ? customer.total_spend : 0;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back button */}
      <Link
        href="/dashboard/customers"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Customers
      </Link>

      {/* Profile header card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <input
                  className={inputClass}
                  placeholder="First Name"
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                />
                <input
                  className={inputClass}
                  placeholder="Last Name"
                  value={editForm.last_name}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                />
                <input
                  className={inputClass}
                  placeholder="Email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
                <input
                  className={inputClass}
                  placeholder="Phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
                <input
                  className={inputClass}
                  placeholder="Birthday (YYYY-MM-DD)"
                  value={editForm.birthday}
                  onChange={(e) => setEditForm({ ...editForm, birthday: e.target.value })}
                />
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-white mb-2">{fullName}</h1>
                <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
                  {customer.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail size={13} />
                      {customer.email}
                    </span>
                  )}
                  {customer.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone size={13} />
                      {customer.phone}
                    </span>
                  )}
                  {customer.birthday && (
                    <span className="flex items-center gap-1.5">
                      <Calendar size={13} />
                      {customer.birthday}
                    </span>
                  )}
                </div>
              </>
            )}

            {/* Source badge */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="bg-red-500/10 text-red-400 rounded-full px-2 py-0.5 text-xs">
                {SOURCE_LABELS[customer.source] ?? customer.source}
              </span>

              {/* Tags */}
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-zinc-800 text-zinc-300 rounded-full px-2 py-0.5 text-xs flex items-center gap-1"
                >
                  <Tag size={10} />
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="text-zinc-500 hover:text-red-400 ml-0.5"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}

              {showTagInput ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    className="bg-zinc-800 border border-zinc-700 rounded-lg text-white text-xs px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red-500 w-28"
                    placeholder="Tag name"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addTag();
                      if (e.key === 'Escape') { setShowTagInput(false); setNewTag(''); }
                    }}
                  />
                  <button onClick={addTag} className="text-xs text-emerald-400 hover:underline">Add</button>
                  <button onClick={() => { setShowTagInput(false); setNewTag(''); }} className="text-xs text-zinc-500 hover:underline">Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => setShowTagInput(true)}
                  className="text-xs text-zinc-500 hover:text-red-400 border border-dashed border-zinc-700 rounded-full px-2 py-0.5 transition-colors"
                >
                  + Add Tag
                </button>
              )}
            </div>
          </div>

          {/* Edit / Save buttons */}
          <div className="flex gap-2 flex-shrink-0">
            {editing ? (
              <>
                <Button variant="primary" size="sm" onClick={saveEdits}>Save</Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              </>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Edit</Button>
            )}
          </div>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <MetricCard title="Total Visits" value={customer.visit_count ?? 0} />
        <MetricCard
          title="Total Spend"
          value={`$${totalSpend.toFixed(2)}`}
        />
        <MetricCard
          title="Days Since Last Visit"
          value={daysSinceLast !== null ? daysSinceLast : '--'}
          subtitle={customer.last_seen ? `Last: ${formatDate(customer.last_seen)}` : undefined}
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — wider column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Visit History */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">Visit History</h2>
            {visits.length === 0 ? (
              <p className="text-zinc-500 text-sm">No visits recorded yet.</p>
            ) : (
              <ol className="relative border-l border-zinc-700 ml-3 space-y-4">
                {visits.map((v) => (
                  <li key={v.visit_id} className="ml-4">
                    <span className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-red-500/60 border border-zinc-800" />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-zinc-300">{formatDate(v.timestamp)}</span>
                      {typeof v.spend_amount === 'number' && v.spend_amount > 0 && (
                        <span className="text-xs text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5">
                          ${v.spend_amount.toFixed(2)}
                        </span>
                      )}
                    </div>
                    {v.source && (
                      <p className="text-xs text-zinc-500 mt-0.5">via {v.source}</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Message History */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">Message History</h2>
            {messages.length === 0 ? (
              <p className="text-zinc-500 text-sm">No messages sent yet.</p>
            ) : (
              <div className="space-y-3">
                {messages.map((m) => (
                  <div key={m.sequence_id} className="bg-zinc-800/60 rounded-lg p-3">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="bg-red-500/10 text-red-400 rounded-full px-2 py-0.5 text-xs capitalize">
                        {m.type}
                      </span>
                      {m.channel && (
                        <span className="bg-zinc-700 text-zinc-300 rounded-full px-2 py-0.5 text-xs capitalize">
                          {m.channel}
                        </span>
                      )}
                      <span className="text-xs text-zinc-500 ml-auto">{formatDate(m.sent_at)}</span>
                    </div>
                    <p className="text-sm text-zinc-300 line-clamp-2">{m.message}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <StatusDot active={m.opened} label="Opened" />
                      <StatusDot active={m.clicked} label="Clicked" />
                      <StatusDot active={m.converted} label="Converted" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Notes */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-3">Notes</h2>
            <textarea
              className="bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 px-3 py-2 w-full resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
              rows={5}
              placeholder="Add private notes about this customer..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
            />
            <p className="text-xs text-zinc-600 mt-1">Auto-saves on blur</p>
          </div>

          {/* Quick Actions */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              {/* SMS */}
              <div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => { setShowSmsForm((v) => !v); setShowEmailForm(false); }}
                >
                  <Phone size={14} className="mr-2" /> Send SMS
                </Button>
                {showSmsForm && (
                  <div className="mt-2 space-y-2">
                    <textarea
                      className="bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 px-3 py-2 w-full resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
                      rows={3}
                      placeholder="Type your SMS message..."
                      value={smsBody}
                      onChange={(e) => setSmsBody(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => sendMessage('sms')}
                        disabled={sending}
                      >
                        {sending ? 'Sending…' : 'Send'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setShowSmsForm(false); setSmsBody(''); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Email */}
              <div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => { setShowEmailForm((v) => !v); setShowSmsForm(false); }}
                >
                  <Mail size={14} className="mr-2" /> Send Email
                </Button>
                {showEmailForm && (
                  <div className="mt-2 space-y-2">
                    <input
                      className={inputClass}
                      placeholder="Subject (optional)"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                    />
                    <textarea
                      className="bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 px-3 py-2 w-full resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
                      rows={4}
                      placeholder="Type your email message..."
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => sendMessage('email')}
                        disabled={sending}
                      >
                        {sending ? 'Sending…' : 'Send'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setShowEmailForm(false); setEmailSubject(''); setEmailBody(''); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusDot({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`flex items-center gap-1 text-xs ${
        active ? 'text-emerald-400' : 'text-zinc-600'
      }`}
    >
      <CheckCircle2 size={11} className={active ? 'text-emerald-400' : 'text-zinc-700'} />
      {label}
    </span>
  );
}
