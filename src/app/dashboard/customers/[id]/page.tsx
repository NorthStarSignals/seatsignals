'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { MetricCard } from '@/components/ui/metric-card';
import { Button } from '@/components/ui/button';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Customer, Visit, Sequence, BirthdayEvent } from '@/lib/types';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Tag,
  X,
  CheckCircle2,
  Globe,
  Sparkles,
  Clock,
  DollarSign,
  Eye,
  MousePointerClick,
  TrendingUp,
  User,
  Briefcase,
  MessageSquare,
  Shield,
  Trash2,
  Save,
  PenLine,
  Cake,
  Wifi,
  QrCode,
  UserPlus,
  BarChart3,
  AlertTriangle,
  Bell,
  BellOff,
  MailCheck,
  MailX,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Extended customer type for this page
interface CustomerProfile extends Customer {
  last_name?: string;
  tags?: string[];
  notes?: string;
  sms_opt_in?: boolean;
  email_opt_in?: boolean;
}

interface SequenceWithChannel extends Sequence {
  channel?: string;
}

interface CustomerTag {
  tag: string;
}

const SOURCE_CONFIG: Record<string, { label: string; icon: typeof Wifi; color: string }> = {
  wifi: { label: 'WiFi', icon: Wifi, color: 'bg-blue-500/10 text-blue-400' },
  qr: { label: 'QR Code', icon: QrCode, color: 'bg-purple-500/10 text-purple-400' },
  manual: { label: 'Manual', icon: UserPlus, color: 'bg-amber-500/10 text-amber-400' },
};

const TAG_COLORS = [
  'bg-red-500/15 text-red-400 border-red-500/20',
  'bg-blue-500/15 text-blue-400 border-blue-500/20',
  'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  'bg-purple-500/15 text-purple-400 border-purple-500/20',
  'bg-amber-500/15 text-amber-400 border-amber-500/20',
  'bg-pink-500/15 text-pink-400 border-pink-500/20',
  'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  'bg-orange-500/15 text-orange-400 border-orange-500/20',
];

function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

const inputClass =
  'bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 w-full placeholder-zinc-500';

function daysSince(dateStr: string): number {
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function daysUntilNextBirthday(birthdayStr: string): number {
  const today = new Date();
  const bday = new Date(birthdayStr);
  const nextBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
  if (nextBday < today) {
    nextBday.setFullYear(today.getFullYear() + 1);
  }
  const diff = nextBday.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [messages, setMessages] = useState<SequenceWithChannel[]>([]);
  const [birthdayEvents, setBirthdayEvents] = useState<BirthdayEvent[]>([]);
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
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesDirty, setNotesDirty] = useState(false);

  // Communication preferences
  const [smsOptIn, setSmsOptIn] = useState(true);
  const [emailOptIn, setEmailOptIn] = useState(true);

  // Quick-send forms
  const [showSmsForm, setShowSmsForm] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [smsBody, setSmsBody] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sending, setSending] = useState(false);

  // Enrichment state
  const [enriching, setEnriching] = useState(false);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, tagsRes] = await Promise.all([
        fetch(`/api/customers/${id}`),
        fetch(`/api/customers/tags?customer_id=${id}`),
      ]);

      if (!profileRes.ok) throw new Error('Failed to load');
      const data = await profileRes.json();
      setCustomer(data.customer);
      setVisits(data.visits || []);
      setMessages(data.messages || []);
      setBirthdayEvents(data.birthday_events || []);

      // Notes from enrichment_data
      const enrichNotes = data.customer?.enrichment_data?.notes || '';
      setNotes(data.customer?.notes || enrichNotes);

      // Communication prefs
      setSmsOptIn(data.customer?.sms_opt_in !== false);
      setEmailOptIn(data.customer?.email_opt_in !== false);

      setEditForm({
        first_name: data.customer.first_name || '',
        last_name: data.customer.last_name || '',
        email: data.customer.email || '',
        phone: data.customer.phone || '',
        birthday: data.customer.birthday || '',
      });

      // Tags from customer_tags table
      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        const customerTags: string[] =
          tagsData.tags?.map((t: CustomerTag) => t.tag) || data.customer.tags || [];
        setTags(customerTags);
      } else {
        setTags(data.customer.tags || []);
      }
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

  const addTag = async () => {
    const trimmed = newTag.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    try {
      await fetch('/api/customers/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: id, tags: [trimmed] }),
      });
      setTags((prev) => [...prev, trimmed]);
      setNewTag('');
      setShowTagInput(false);
      toast.success(`Tag "${trimmed}" added`);
    } catch {
      toast.error('Failed to add tag');
    }
  };

  const removeTag = async (tag: string) => {
    try {
      await fetch('/api/customers/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: id, remove_tags: [tag] }),
      });
      setTags((prev) => prev.filter((t) => t !== tag));
    } catch {
      toast.error('Failed to remove tag');
    }
  };

  const saveNotes = async () => {
    setNotesSaving(true);
    try {
      await fetch(`/api/customers/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      setNotesDirty(false);
      toast.success('Notes saved');
    } catch {
      toast.error('Failed to save notes');
    }
    setNotesSaving(false);
  };

  const togglePreference = async (field: 'sms_opt_in' | 'email_opt_in', value: boolean) => {
    try {
      await fetch(`/api/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (field === 'sms_opt_in') setSmsOptIn(value);
      else setEmailOptIn(value);
      toast.success('Preferences updated');
    } catch {
      toast.error('Failed to update preferences');
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
      fetchProfile();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Send failed');
    }
    setSending(false);
  };

  const triggerEnrichment = async () => {
    setEnriching(true);
    try {
      const res = await fetch('/api/enrich/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: id }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? 'Enrichment failed');
      }
      toast.success('Enrichment complete');
      await fetchProfile();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Enrichment failed');
    }
    setEnriching(false);
  };

  const deleteCustomer = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || 'Delete failed');
      }
      toast.success('Customer deleted');
      router.push('/dashboard/customers');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-zinc-600 border-t-red-500 rounded-full animate-spin" />
          <p className="text-zinc-400 text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <User size={40} className="text-zinc-600" />
        <p className="text-zinc-400">Customer not found.</p>
        <Link href="/dashboard/customers" className="text-red-400 hover:underline text-sm">
          Back to Customers
        </Link>
      </div>
    );
  }

  const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Unnamed';
  const daysSinceLast = customer.last_seen ? daysSince(customer.last_seen) : null;
  const totalSpend = typeof customer.total_spend === 'number' ? customer.total_spend : 0;
  const visitCount = customer.visit_count ?? 0;
  const avgPerVisit = visitCount > 0 ? totalSpend / visitCount : 0;
  const isEnriched = Boolean(customer.enriched_at);
  const sourceConfig = SOURCE_CONFIG[customer.source] || SOURCE_CONFIG.manual;
  const SourceIcon = sourceConfig.icon;

  const enrichmentData = customer.enrichment_data || {};
  const hasEnrichmentInfo =
    customer.company ||
    customer.job_title ||
    customer.linkedin_url ||
    customer.instagram_handle ||
    customer.twitter_handle;

  const birthdayDays = customer.birthday ? daysUntilNextBirthday(customer.birthday) : null;

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Back button */}
      <Link
        href="/dashboard/customers"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Customers
      </Link>

      {/* ─── Profile Header ─── */}
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
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">{fullName}</h1>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${sourceConfig.color}`}
                  >
                    <SourceIcon size={12} />
                    {sourceConfig.label}
                  </span>
                </div>

                {/* Company / Job Title */}
                {(customer.company || customer.job_title) && (
                  <p className="text-sm text-zinc-400 mb-2 flex items-center gap-1.5">
                    <Briefcase size={13} />
                    {[customer.job_title, customer.company].filter(Boolean).join(' at ')}
                  </p>
                )}

                <div className="flex flex-wrap gap-4 text-sm text-zinc-400 mb-2">
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
                  {customer.first_seen && (
                    <span className="flex items-center gap-1.5">
                      <Calendar size={13} />
                      Member since {formatDate(customer.first_seen)}
                    </span>
                  )}
                </div>

                {/* Tags row */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className={`rounded-full px-2.5 py-0.5 text-xs flex items-center gap-1.5 border ${getTagColor(tag)}`}
                    >
                      <Tag size={10} />
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:text-white ml-0.5 transition-colors"
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
                          if (e.key === 'Escape') {
                            setShowTagInput(false);
                            setNewTag('');
                          }
                        }}
                      />
                      <button onClick={addTag} className="text-xs text-emerald-400 hover:underline">
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setShowTagInput(false);
                          setNewTag('');
                        }}
                        className="text-xs text-zinc-500 hover:underline"
                      >
                        Cancel
                      </button>
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
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-shrink-0 flex-wrap">
            {editing ? (
              <>
                <Button variant="primary" size="sm" onClick={saveEdits}>
                  <Save size={13} />
                  Save
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                  <PenLine size={13} />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={triggerEnrichment}
                  disabled={enriching}
                >
                  <Sparkles size={13} />
                  {enriching ? 'Enriching...' : 'Re-enrich'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── Quick Stats Row ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Visits"
          value={visitCount}
          icon={<Eye size={16} />}
          subtitle={customer.last_seen ? `Last: ${formatDate(customer.last_seen)}` : undefined}
        />
        <MetricCard
          title="Total Spend"
          value={formatCurrency(totalSpend)}
          icon={<DollarSign size={16} />}
        />
        <MetricCard
          title="Avg Per Visit"
          value={formatCurrency(avgPerVisit)}
          icon={<BarChart3 size={16} />}
        />
        <MetricCard
          title="Days Since Last Visit"
          value={daysSinceLast !== null ? daysSinceLast : '--'}
          icon={<Clock size={16} />}
          subtitle={
            daysSinceLast !== null
              ? daysSinceLast > 30
                ? 'At risk of churning'
                : daysSinceLast > 14
                  ? 'Getting cold'
                  : 'Active'
              : undefined
          }
        />
      </div>

      {/* ─── Two-Column Layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Left Column (2/3) ─── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Visit History Timeline */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Clock size={16} className="text-zinc-500" />
                Visit History
              </h2>
              <span className="text-xs text-zinc-500">{visits.length} visits</span>
            </div>
            {visits.length === 0 ? (
              <div className="text-center py-8">
                <Clock size={32} className="text-zinc-700 mx-auto mb-2" />
                <p className="text-zinc-500 text-sm">No visits recorded yet.</p>
              </div>
            ) : (
              <ol className="relative border-l border-zinc-700 ml-3 space-y-4">
                {visits.map((v, idx) => (
                  <li key={v.visit_id} className="ml-6">
                    <span
                      className={`absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full border-2 border-zinc-900 ${
                        idx === 0 ? 'bg-red-500' : 'bg-zinc-600'
                      }`}
                    />
                    <div className="bg-zinc-800/40 rounded-lg p-3 hover:bg-zinc-800/60 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-zinc-300 font-medium">
                            {formatDate(v.timestamp)}
                          </span>
                          <span className="text-xs text-zinc-600">
                            {new Date(v.timestamp).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {typeof v.spend_amount === 'number' && v.spend_amount > 0 && (
                          <span className="text-xs text-emerald-400 bg-emerald-500/10 rounded-full px-2.5 py-0.5 font-medium">
                            {formatCurrency(v.spend_amount)}
                          </span>
                        )}
                      </div>
                      {v.source && (
                        <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                          {SOURCE_CONFIG[v.source]
                            ? (() => {
                                const Icon = SOURCE_CONFIG[v.source].icon;
                                return <Icon size={10} />;
                              })()
                            : null}
                          via {SOURCE_CONFIG[v.source]?.label || v.source}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Interaction / Message History */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <MessageSquare size={16} className="text-zinc-500" />
                Interaction History
              </h2>
              <span className="text-xs text-zinc-500">{messages.length} messages</span>
            </div>
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare size={32} className="text-zinc-700 mx-auto mb-2" />
                <p className="text-zinc-500 text-sm">No messages sent yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((m) => (
                  <div
                    key={m.sequence_id}
                    className="bg-zinc-800/40 rounded-lg p-4 hover:bg-zinc-800/60 transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="bg-red-500/10 text-red-400 rounded-full px-2.5 py-0.5 text-xs capitalize font-medium">
                        {m.type}
                      </span>
                      {m.channel && (
                        <span className="bg-zinc-700 text-zinc-300 rounded-full px-2.5 py-0.5 text-xs capitalize">
                          {m.channel}
                        </span>
                      )}
                      <span className="text-xs text-zinc-500 ml-auto">{formatDate(m.sent_at)}</span>
                    </div>
                    <p className="text-sm text-zinc-300 line-clamp-2 mb-3">{m.message}</p>
                    <div className="flex items-center gap-4">
                      <StatusBadge
                        active={m.opened}
                        label="Opened"
                        icon={<Eye size={11} />}
                        activeColor="text-blue-400"
                      />
                      <StatusBadge
                        active={m.clicked}
                        label="Clicked"
                        icon={<MousePointerClick size={11} />}
                        activeColor="text-purple-400"
                      />
                      <StatusBadge
                        active={m.converted}
                        label="Converted"
                        icon={<TrendingUp size={11} />}
                        activeColor="text-emerald-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions — Send message */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Mail size={16} className="text-zinc-500" />
              Quick Send
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* SMS */}
              <div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setShowSmsForm((v) => !v);
                    setShowEmailForm(false);
                  }}
                >
                  <Phone size={14} /> Send SMS
                </Button>
                {showSmsForm && (
                  <div className="mt-2 space-y-2">
                    <textarea
                      className={`${inputClass} resize-none`}
                      rows={3}
                      placeholder="Type your SMS message..."
                      value={smsBody}
                      onChange={(e) => setSmsBody(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button variant="primary" size="sm" onClick={() => sendMessage('sms')} disabled={sending}>
                        {sending ? 'Sending...' : 'Send'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowSmsForm(false);
                          setSmsBody('');
                        }}
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
                  onClick={() => {
                    setShowEmailForm((v) => !v);
                    setShowSmsForm(false);
                  }}
                >
                  <Mail size={14} /> Send Email
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
                      className={`${inputClass} resize-none`}
                      rows={4}
                      placeholder="Type your email message..."
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button variant="primary" size="sm" onClick={() => sendMessage('email')} disabled={sending}>
                        {sending ? 'Sending...' : 'Send'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowEmailForm(false);
                          setEmailSubject('');
                          setEmailBody('');
                        }}
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

        {/* ─── Right Column (1/3) ─── */}
        <div className="space-y-6">
          {/* Birthday / Anniversary */}
          {customer.birthday && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Cake size={16} className="text-pink-400" />
                Birthday
              </h2>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-300">{formatDate(customer.birthday)}</span>
                {birthdayDays !== null && (
                  <span
                    className={`text-xs font-medium rounded-full px-2.5 py-0.5 ${
                      birthdayDays <= 7
                        ? 'bg-pink-500/10 text-pink-400'
                        : birthdayDays <= 30
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-zinc-700 text-zinc-400'
                    }`}
                  >
                    {birthdayDays === 0
                      ? 'Today!'
                      : birthdayDays === 1
                        ? 'Tomorrow!'
                        : `${birthdayDays} days away`}
                  </span>
                )}
              </div>
              {birthdayEvents.length > 0 && (
                <div className="mt-3 pt-3 border-t border-zinc-800 space-y-2">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide">Past Birthday Events</p>
                  {birthdayEvents.map((evt) => (
                    <div key={evt.event_id} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">{formatDate(evt.offer_sent_at)}</span>
                      <span
                        className={`text-xs rounded-full px-2 py-0.5 ${
                          evt.redeemed
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-zinc-700 text-zinc-500'
                        }`}
                      >
                        {evt.redeemed ? 'Redeemed' : 'Not redeemed'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Enrichment Data */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" />
                Enrichment
              </h2>
              {isEnriched ? (
                <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 rounded-full px-2.5 py-0.5 text-xs font-medium">
                  <CheckCircle2 size={11} />
                  Enriched
                </span>
              ) : (
                <Button variant="primary" size="sm" onClick={triggerEnrichment} disabled={enriching}>
                  <Sparkles size={12} />
                  {enriching ? 'Running...' : 'Enrich'}
                </Button>
              )}
            </div>

            {isEnriched && customer.enriched_at && (
              <p className="text-xs text-zinc-600 mb-3">Last enriched: {formatDate(customer.enriched_at)}</p>
            )}

            {hasEnrichmentInfo ? (
              <div className="space-y-3">
                {customer.company && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wide mb-0.5">Company</p>
                    <p className="text-sm text-zinc-200 flex items-center gap-1.5">
                      <Briefcase size={13} className="text-zinc-500" />
                      {customer.company}
                    </p>
                  </div>
                )}
                {customer.job_title && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wide mb-0.5">Job Title</p>
                    <p className="text-sm text-zinc-200">{customer.job_title}</p>
                  </div>
                )}
                {customer.linkedin_url && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wide mb-0.5">LinkedIn</p>
                    <a
                      href={customer.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-blue-400 hover:underline"
                    >
                      <Briefcase size={13} />
                      View Profile
                    </a>
                  </div>
                )}
                {customer.instagram_handle && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wide mb-0.5">Instagram</p>
                    <a
                      href={`https://instagram.com/${customer.instagram_handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-pink-400 hover:underline"
                    >
                      <Globe size={13} />
                      @{customer.instagram_handle}
                    </a>
                  </div>
                )}
                {customer.twitter_handle && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wide mb-0.5">X / Twitter</p>
                    <a
                      href={`https://x.com/${customer.twitter_handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-sky-400 hover:underline"
                    >
                      <Globe size={13} />
                      @{customer.twitter_handle}
                    </a>
                  </div>
                )}
                {/* Extra enrichment_data fields */}
                {Object.entries(enrichmentData)
                  .filter(([k]) => !['notes'].includes(k))
                  .map(([key, val]) =>
                    val && typeof val === 'string' ? (
                      <div key={key}>
                        <p className="text-xs text-zinc-500 uppercase tracking-wide mb-0.5">
                          {key.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm text-zinc-200">{val}</p>
                      </div>
                    ) : null
                  )}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">
                No enrichment data yet. Run enrichment to discover social profiles and company info.
              </p>
            )}
          </div>

          {/* Communication Preferences */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Shield size={16} className="text-zinc-500" />
              Communication Preferences
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {smsOptIn ? (
                    <Bell size={14} className="text-emerald-400" />
                  ) : (
                    <BellOff size={14} className="text-zinc-600" />
                  )}
                  <span className="text-sm text-zinc-300">SMS Notifications</span>
                </div>
                <button
                  onClick={() => togglePreference('sms_opt_in', !smsOptIn)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    smsOptIn ? 'bg-emerald-500' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      smsOptIn ? 'translate-x-4' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {emailOptIn ? (
                    <MailCheck size={14} className="text-emerald-400" />
                  ) : (
                    <MailX size={14} className="text-zinc-600" />
                  )}
                  <span className="text-sm text-zinc-300">Email Notifications</span>
                </div>
                <button
                  onClick={() => togglePreference('email_opt_in', !emailOptIn)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    emailOptIn ? 'bg-emerald-500' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      emailOptIn ? 'translate-x-4' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="pt-3 border-t border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Email</span>
                  <span className="text-zinc-300">{customer.email || 'Not set'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Phone</span>
                  <span className="text-zinc-300">{customer.phone || 'Not set'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
              <PenLine size={16} className="text-zinc-500" />
              Notes
            </h2>
            <textarea
              className={`${inputClass} resize-none`}
              rows={5}
              placeholder="Add private notes about this customer..."
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setNotesDirty(true);
              }}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-zinc-600">
                {notesDirty ? 'Unsaved changes' : 'Saved'}
              </p>
              <Button variant="secondary" size="sm" onClick={saveNotes} disabled={notesSaving || !notesDirty}>
                <Save size={12} />
                {notesSaving ? 'Saving...' : 'Save Notes'}
              </Button>
            </div>
          </div>

          {/* Tag Editor */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Tag size={16} className="text-zinc-500" />
              Tags
            </h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.length === 0 && <p className="text-xs text-zinc-500">No tags yet.</p>}
              {tags.map((tag) => (
                <span
                  key={tag}
                  className={`rounded-full px-2.5 py-1 text-xs flex items-center gap-1.5 border ${getTagColor(tag)}`}
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:text-white transition-colors"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className={`${inputClass} flex-1`}
                placeholder="Add a tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addTag();
                }}
              />
              <Button variant="secondary" size="sm" onClick={addTag} disabled={!newTag.trim()}>
                Add
              </Button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-zinc-900 border border-red-900/30 rounded-xl p-5">
            <h2 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle size={16} />
              Danger Zone
            </h2>
            <p className="text-xs text-zinc-500 mb-4">
              Permanently delete this customer and all associated data. This action cannot be undone.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-900/30"
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 size={13} />
              Delete Customer
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Delete Confirmation Modal ─── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Delete Customer</h3>
                <p className="text-xs text-zinc-500">This action is irreversible</p>
              </div>
            </div>
            <p className="text-sm text-zinc-400 mb-4">
              Type <span className="text-white font-mono bg-zinc-800 px-1.5 py-0.5 rounded">DELETE</span> to confirm deletion of <span className="text-white font-medium">{fullName}</span> and all their data.
            </p>
            <input
              className={inputClass}
              placeholder="Type DELETE to confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
            />
            <div className="flex gap-2 mt-4">
              <Button
                variant="primary"
                size="sm"
                className="bg-red-600 hover:bg-red-700"
                onClick={deleteCustomer}
                disabled={deleteConfirmText !== 'DELETE' || deleting}
              >
                <Trash2 size={13} />
                {deleting ? 'Deleting...' : 'Delete Forever'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({
  active,
  label,
  icon,
  activeColor,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  activeColor: string;
}) {
  return (
    <span
      className={`flex items-center gap-1 text-xs ${
        active ? activeColor : 'text-zinc-600'
      }`}
    >
      {active ? icon : <CheckCircle2 size={11} className="text-zinc-700" />}
      {label}
    </span>
  );
}
