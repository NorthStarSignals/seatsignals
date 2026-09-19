'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  Mail,
  MousePointerClick,
  Eye,
  UserMinus,
  Plus,
  X,
  Copy,
  Trash2,
  Clock,
  Send,
  FileEdit,
  Calendar,
} from 'lucide-react';

interface CampaignStats {
  sent: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
}

interface Campaign {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  segment_id: string;
  segment_name: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent';
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  stats: CampaignStats;
}

const SEGMENTS = [
  { id: 'all-customers', name: 'All Customers', count: 1842 },
  { id: 'vip', name: 'VIP Customers', count: 84 },
  { id: 'at-risk', name: 'At-Risk Regulars', count: 142 },
  { id: 'new', name: 'New Guests', count: 61 },
];

const initialCampaigns: Campaign[] = [
  {
    id: 'c1',
    name: 'Summer Menu Launch',
    subject: '🔥 New Summer Flavors Have Landed',
    body_html: '<h1>Summer Menu is Here</h1><p>Come try our fresh seasonal picks.</p>',
    segment_id: 'all-customers',
    segment_name: 'All Customers',
    status: 'sent',
    scheduled_at: null,
    sent_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    stats: { sent: 1820, opened: 847, clicked: 312, unsubscribed: 7 },
  },
  {
    id: 'c2',
    name: 'We Miss You',
    subject: "It's been a while — here's 15% off",
    body_html: '<h1>We Miss You</h1><p>Come back for 15% off your next visit.</p>',
    segment_id: 'at-risk',
    segment_name: 'At-Risk Regulars',
    status: 'scheduled',
    scheduled_at: new Date(Date.now() + 2 * 86400000).toISOString(),
    sent_at: null,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    stats: { sent: 0, opened: 0, clicked: 0, unsubscribed: 0 },
  },
  {
    id: 'c3',
    name: 'VIP Private Tasting Invite',
    subject: "You're Invited: Private Tasting Night",
    body_html: '<h1>VIP Tasting</h1><p>An exclusive tasting for our best guests.</p>',
    segment_id: 'vip',
    segment_name: 'VIP Customers',
    status: 'draft',
    scheduled_at: null,
    sent_at: null,
    created_at: new Date().toISOString(),
    stats: { sent: 0, opened: 0, clicked: 0, unsubscribed: 0 },
  },
];

function openRate(s: CampaignStats) {
  return s.sent === 0 ? '0%' : `${((s.opened / s.sent) * 100).toFixed(1)}%`;
}
function clickRate(s: CampaignStats) {
  return s.sent === 0 ? '0%' : `${((s.clicked / s.sent) * 100).toFixed(1)}%`;
}
function unsubRate(s: CampaignStats) {
  return s.sent === 0 ? '0%' : `${((s.unsubscribed / s.sent) * 100).toFixed(2)}%`;
}
function formatDate(d: string | null) {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function StatusBadge({ status }: { status: Campaign['status'] }) {
  const styles: Record<string, string> = {
    draft: 'bg-zinc-700/50 text-zinc-400',
    scheduled: 'bg-amber-500/10 text-amber-400',
    sending: 'bg-blue-500/10 text-blue-400',
    sent: 'bg-emerald-500/10 text-emerald-400',
  };
  const icons: Record<string, React.ReactNode> = {
    draft: <FileEdit className="w-3 h-3" />,
    scheduled: <Clock className="w-3 h-3" />,
    sending: <Send className="w-3 h-3" />,
    sent: <Mail className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${styles[status]}`}>
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function EmailPreview({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;padding:16px;background:#ffffff;">${html}</body></html>`);
        doc.close();
      }
    }
  }, [html]);
  return (
    <div className="border border-seat-border rounded-lg overflow-hidden bg-white">
      <div className="bg-zinc-800 px-3 py-1.5 flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        <span className="text-[10px] text-zinc-500 ml-2">Email Preview</span>
      </div>
      <iframe ref={iframeRef} className="w-full h-[400px] border-0" title="Email preview" sandbox="allow-same-origin" />
    </div>
  );
}

export default function EmailCampaignsPage() {
  const { items: campaigns, add, update, remove } = useCrudList<Campaign>(
    'seatsignals_email_campaigns',
    initialCampaigns
  );

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form state
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [segmentId, setSegmentId] = useState('all-customers');
  const [scheduledAt, setScheduledAt] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  function resetForm() {
    setName('');
    setSubject('');
    setBodyHtml('');
    setSegmentId('all-customers');
    setScheduledAt('');
    setShowPreview(false);
    setEditingId(null);
  }

  function handleCreate() {
    resetForm();
    setShowModal(true);
  }

  function handleView(c: Campaign) {
    setEditingId(c.id);
    setName(c.name);
    setSubject(c.subject);
    setBodyHtml(c.body_html);
    setSegmentId(c.segment_id);
    setScheduledAt(c.scheduled_at ? c.scheduled_at.slice(0, 16) : '');
    setShowModal(true);
  }

  function handleSave(status: 'draft' | 'scheduled') {
    if (!name.trim() || !subject.trim()) {
      toast.error('Name and subject are required');
      return;
    }
    if (status === 'scheduled' && !scheduledAt) {
      toast.error('Select a date/time to schedule');
      return;
    }
    const segment = SEGMENTS.find((s) => s.id === segmentId);
    const payload = {
      name,
      subject,
      body_html: bodyHtml,
      segment_id: segmentId,
      segment_name: segment?.name || segmentId,
      status,
      scheduled_at: status === 'scheduled' ? new Date(scheduledAt).toISOString() : null,
    };

    if (editingId) {
      update(editingId, payload);
      toast.success('Campaign updated');
    } else {
      add({
        id: `c_${Date.now()}`,
        sent_at: null,
        created_at: new Date().toISOString(),
        stats: { sent: 0, opened: 0, clicked: 0, unsubscribed: 0 },
        ...payload,
      });
      toast.success(status === 'scheduled' ? 'Campaign scheduled' : 'Campaign saved as draft');
    }

    setShowModal(false);
    resetForm();
  }

  function handleSendNow(id: string) {
    const campaign = campaigns.find((c) => c.id === id);
    if (!campaign) return;
    const segment = SEGMENTS.find((s) => s.id === campaign.segment_id);
    const recipients = segment?.count || 500;
    update(id, {
      status: 'sent',
      sent_at: new Date().toISOString(),
      stats: {
        sent: recipients,
        opened: Math.round(recipients * 0.42),
        clicked: Math.round(recipients * 0.12),
        unsubscribed: Math.round(recipients * 0.004),
      },
    });
    toast.success('Campaign sent!');
  }

  function handleDuplicate(c: Campaign) {
    add({
      ...c,
      id: `c_${Date.now()}`,
      name: `${c.name} (Copy)`,
      status: 'draft',
      scheduled_at: null,
      sent_at: null,
      created_at: new Date().toISOString(),
      stats: { sent: 0, opened: 0, clicked: 0, unsubscribed: 0 },
    });
    toast.success('Campaign duplicated as draft');
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this campaign?')) return;
    remove(id);
    toast.success('Campaign deleted');
  }

  const filteredCampaigns = useMemo(() => {
    return filterStatus === 'all' ? campaigns : campaigns.filter((c) => c.status === filterStatus);
  }, [campaigns, filterStatus]);

  const sentCampaigns = campaigns.filter((c) => c.status === 'sent');
  const totalSent = sentCampaigns.reduce((sum, c) => sum + c.stats.sent, 0);
  const totalOpened = sentCampaigns.reduce((sum, c) => sum + c.stats.opened, 0);
  const totalClicked = sentCampaigns.reduce((sum, c) => sum + c.stats.clicked, 0);
  const totalUnsub = sentCampaigns.reduce((sum, c) => sum + c.stats.unsubscribed, 0);
  const avgOpenRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0';
  const avgClickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : '0';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Email Campaigns</h1>
          <p className="text-sm text-zinc-500 mt-1">Create, schedule, and track email marketing campaigns</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4" />
          New Campaign
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Sent" value={totalSent.toLocaleString()} subtitle={`${sentCampaigns.length} campaigns`} icon={<Send className="w-4 h-4" />} />
        <MetricCard title="Avg Open Rate" value={`${avgOpenRate}%`} subtitle={`${totalOpened.toLocaleString()} total opens`} trend={{ value: 3.2, positive: true }} icon={<Eye className="w-4 h-4" />} />
        <MetricCard title="Avg Click Rate" value={`${avgClickRate}%`} subtitle={`${totalClicked.toLocaleString()} total clicks`} trend={{ value: 1.8, positive: true }} icon={<MousePointerClick className="w-4 h-4" />} />
        <MetricCard title="Unsubscribes" value={totalUnsub} subtitle={totalSent > 0 ? `${((totalUnsub / totalSent) * 100).toFixed(2)}% rate` : '0% rate'} icon={<UserMinus className="w-4 h-4" />} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-zinc-500 uppercase tracking-wider mr-1">Filter:</span>
        {['all', 'draft', 'scheduled', 'sent'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${filterStatus === status ? 'bg-seat-red text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'}`}
          >
            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== 'all' && (
              <span className="ml-1 opacity-60">({campaigns.filter((c) => c.status === status).length})</span>
            )}
          </button>
        ))}
      </div>

      {filteredCampaigns.length === 0 ? (
        <div className="bg-seat-card border border-seat-border rounded-xl p-12 text-center">
          <Mail className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium">No campaigns found</p>
          <p className="text-sm text-zinc-600 mt-1">
            {filterStatus === 'all' ? 'Create your first email campaign to get started' : `No ${filterStatus} campaigns`}
          </p>
          {filterStatus === 'all' && (
            <Button onClick={handleCreate} className="mt-4">
              <Plus className="w-4 h-4" />
              Create Campaign
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredCampaigns.map((c) => {
            const isSent = c.status === 'sent';
            return (
              <div key={c.id} className="bg-seat-card border border-seat-border rounded-xl p-5 hover:border-zinc-600 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleView(c)}>
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={c.status} />
                      <span className="text-xs text-zinc-600">{c.segment_name}</span>
                    </div>
                    <h3 className="text-white font-semibold truncate">{c.name}</h3>
                    <p className="text-sm text-zinc-500 truncate mt-0.5">{c.subject}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {(c.status === 'draft' || c.status === 'scheduled') && (
                      <button onClick={() => handleSendNow(c.id)} className="p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 rounded-lg transition-colors" title="Send now">
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => handleDuplicate(c)} className="p-1.5 text-zinc-600 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors" title="Duplicate">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isSent && (
                  <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-seat-border">
                    <div>
                      <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Sent</p>
                      <p className="text-sm text-white font-mono">{c.stats.sent.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Open Rate</p>
                      <p className="text-sm text-white font-mono">{openRate(c.stats)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Click Rate</p>
                      <p className="text-sm text-white font-mono">{clickRate(c.stats)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Unsub</p>
                      <p className="text-sm text-white font-mono">{unsubRate(c.stats)}</p>
                    </div>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-seat-border">
                  <p className="text-xs text-zinc-600">
                    {c.status === 'scheduled'
                      ? `Scheduled for ${formatDate(c.scheduled_at)}`
                      : c.status === 'sent'
                        ? `Sent ${formatDate(c.sent_at)}`
                        : `Created ${formatDate(c.created_at)}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-seat-card border border-seat-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-seat-border">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-seat-red" />
                <h2 className="text-lg font-semibold text-white">{editingId ? 'Edit Campaign' : 'Create Campaign'}</h2>
              </div>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Campaign Name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Summer Menu Launch" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Target Segment</label>
                  <select
                    value={segmentId}
                    onChange={(e) => setSegmentId(e.target.value)}
                    className="w-full h-9 px-3 text-sm rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-seat-red"
                  >
                    {SEGMENTS.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.count.toLocaleString()})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Subject Line</label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Your compelling email subject line" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-zinc-500 uppercase tracking-wider">Email Body (HTML)</label>
                  <button onClick={() => setShowPreview(!showPreview)} className="text-xs text-seat-red hover:text-red-400 transition-colors flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {showPreview ? 'Hide Preview' : 'Show Preview'}
                  </button>
                </div>

                {showPreview ? (
                  <EmailPreview html={bodyHtml} />
                ) : (
                  <textarea
                    value={bodyHtml}
                    onChange={(e) => setBodyHtml(e.target.value)}
                    rows={12}
                    placeholder="<div>Your email HTML content here...</div>"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-seat-red/50 focus:border-seat-red transition-colors font-mono"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Schedule Date & Time (optional)</label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-zinc-500" />
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-seat-red/50 focus:border-seat-red transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-seat-border">
                <Button variant="ghost" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</Button>
                <Button variant="secondary" onClick={() => handleSave('draft')}>
                  <FileEdit className="w-3.5 h-3.5" />
                  Save Draft
                </Button>
                <Button onClick={() => handleSave('scheduled')}>
                  <Clock className="w-3.5 h-3.5" />
                  Schedule
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
