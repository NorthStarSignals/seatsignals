'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import {
  MessageSquare,
  Plus,
  X,
  Send,
  Users,
  Clock,
  CheckCircle,
  Pencil,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useCrudList } from '@/hooks/use-local-storage-state';

interface SMSCampaign {
  id: string;
  name: string;
  message: string;
  audience: string;
  recipient_count: number;
  sent_count: number;
  delivered_count: number;
  status: 'draft' | 'scheduled' | 'sending' | 'sent';
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
}

const MOCK_CAMPAIGNS: SMSCampaign[] = [
  {
    id: '1', name: 'Weekend Special', message: 'Hey {name}! This weekend only: 20% off all entrees. Show this text to redeem. - SeatSignals Demo', audience: 'all',
    recipient_count: 150, sent_count: 148, delivered_count: 142, status: 'sent', scheduled_at: null, sent_at: '2026-04-05T18:00:00Z', created_at: '2026-04-05T12:00:00Z',
  },
  {
    id: '2', name: 'Happy Hour Alert', message: 'Happy Hour starts NOW! $5 cocktails until 7pm. See you soon!', audience: 'regulars',
    recipient_count: 85, sent_count: 0, delivered_count: 0, status: 'scheduled', scheduled_at: '2026-04-08T16:00:00Z', sent_at: null, created_at: '2026-04-06T10:00:00Z',
  },
  {
    id: '3', name: 'New Menu Launch', message: 'Our new spring menu is here! Come try our fresh seasonal dishes this week.', audience: 'vip',
    recipient_count: 42, sent_count: 0, delivered_count: 0, status: 'draft', scheduled_at: null, sent_at: null, created_at: '2026-04-07T09:00:00Z',
  },
];

const AUDIENCES = [
  { value: 'all', label: 'All Customers' },
  { value: 'regulars', label: 'Regulars (5+ visits)' },
  { value: 'vip', label: 'VIP ($500+ spend)' },
  { value: 'inactive', label: 'Inactive (30+ days)' },
  { value: 'new', label: 'New (last 30 days)' },
];

const AUDIENCE_COUNTS: Record<string, number> = {
  all: 1842, regulars: 384, vip: 84, inactive: 217, new: 61,
};

export default function SMSCampaignsPage() {
  const { items: campaigns, add, update, remove } = useCrudList<SMSCampaign>(
    'seatsignals_sms_campaigns',
    MOCK_CAMPAIGNS
  );

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('all');

  function resetForm() {
    setName('');
    setMessage('');
    setAudience('all');
    setEditingId(null);
  }

  function openCreate() {
    resetForm();
    setShowCreate(true);
  }

  function openEdit(c: SMSCampaign) {
    setEditingId(c.id);
    setName(c.name);
    setMessage(c.message);
    setAudience(c.audience);
    setShowCreate(true);
  }

  function saveCampaign() {
    if (!name.trim() || !message.trim()) {
      toast.error('Name and message required');
      return;
    }
    if (editingId) {
      update(editingId, {
        name,
        message,
        audience,
        recipient_count: AUDIENCE_COUNTS[audience] || 100,
      });
      toast.success('Campaign updated');
    } else {
      add({
        id: `sms_${Date.now()}`,
        name,
        message,
        audience,
        recipient_count: AUDIENCE_COUNTS[audience] || 100,
        sent_count: 0,
        delivered_count: 0,
        status: 'draft',
        scheduled_at: null,
        sent_at: null,
        created_at: new Date().toISOString(),
      });
      toast.success('Campaign created');
    }
    resetForm();
    setShowCreate(false);
  }

  function sendCampaign(id: string) {
    const c = campaigns.find((x) => x.id === id);
    if (!c) return;
    update(id, {
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_count: c.recipient_count,
      delivered_count: Math.floor(c.recipient_count * 0.96),
    });
    toast.success('Campaign sent!');
  }

  function deleteCampaign(id: string) {
    if (!confirm('Delete this campaign?')) return;
    remove(id);
    toast.success('Campaign deleted');
  }

  const totalSent = campaigns.filter((c) => c.status === 'sent').reduce((s, c) => s + c.sent_count, 0);
  const totalDelivered = campaigns.filter((c) => c.status === 'sent').reduce((s, c) => s + c.delivered_count, 0);
  const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;

  const STATUS_STYLES: Record<string, string> = {
    draft: 'bg-zinc-800 text-zinc-400',
    scheduled: 'bg-blue-500/10 text-blue-400',
    sending: 'bg-amber-500/10 text-amber-400',
    sent: 'bg-green-500/10 text-green-400',
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">SMS Campaigns</h1>
            <p className="text-sm text-zinc-500">Send targeted SMS to your customers</p>
          </div>
        </div>
        <button
          onClick={() => (showCreate ? (setShowCreate(false), resetForm()) : openCreate())}
          className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 transition-colors"
        >
          {showCreate ? <X size={16} /> : <Plus size={16} />}
          {showCreate ? 'Cancel' : 'New Campaign'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total Campaigns" value={campaigns.length} icon={<MessageSquare size={18} />} />
        <MetricCard title="Messages Sent" value={totalSent} icon={<Send size={18} />} />
        <MetricCard title="Delivery Rate" value={`${deliveryRate}%`} icon={<CheckCircle size={18} />} />
        <MetricCard title="Scheduled" value={campaigns.filter((c) => c.status === 'scheduled').length} icon={<Clock size={18} />} />
      </div>

      {showCreate && (
        <div className="bg-seat-card border border-seat-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">{editingId ? 'Edit SMS Campaign' : 'Create SMS Campaign'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Campaign name"
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-seat-red"
            />
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-seat-red"
            >
              {AUDIENCES.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
          <div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message (160 chars max for single SMS)"
              rows={3}
              maxLength={320}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-seat-red resize-none"
            />
            <p className="text-[10px] text-zinc-600 mt-1">
              {message.length}/160 characters {message.length > 160 ? '(2 SMS)' : '(1 SMS)'}
            </p>
          </div>
          <button
            onClick={saveCampaign}
            disabled={!name || !message}
            className="px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 disabled:opacity-50 transition-colors"
          >
            {editingId ? 'Save Changes' : 'Create Campaign'}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {campaigns.length === 0 && (
          <div className="bg-seat-card border border-seat-border rounded-xl p-8 text-center text-zinc-400 text-sm">
            No SMS campaigns yet. Create one to get started.
          </div>
        )}
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="bg-seat-card border border-seat-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-white">{campaign.name}</h3>
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', STATUS_STYLES[campaign.status])}>
                  {campaign.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                  <button
                    onClick={() => sendCampaign(campaign.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-seat-red text-white rounded-lg hover:bg-seat-red/90 transition-colors"
                  >
                    <Send size={12} /> Send Now
                  </button>
                )}
                {campaign.status !== 'sent' && (
                  <button onClick={() => openEdit(campaign)} className="p-1.5 text-zinc-500 hover:text-white rounded">
                    <Pencil size={14} />
                  </button>
                )}
                <button onClick={() => deleteCampaign(campaign.id)} className="p-1.5 text-zinc-500 hover:text-red-400 rounded">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <p className="text-xs text-zinc-400 mb-3 bg-zinc-800/50 p-3 rounded-lg font-mono">{campaign.message}</p>
            <div className="flex items-center gap-4 text-xs text-zinc-500 flex-wrap">
              <span className="flex items-center gap-1"><Users size={10} /> {campaign.recipient_count} recipients</span>
              <span>Audience: {AUDIENCES.find((a) => a.value === campaign.audience)?.label}</span>
              {campaign.sent_at && <span>Sent: {new Date(campaign.sent_at).toLocaleDateString()}</span>}
              {campaign.status === 'sent' && (
                <span className="text-green-400">
                  {campaign.delivered_count}/{campaign.sent_count} delivered
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
