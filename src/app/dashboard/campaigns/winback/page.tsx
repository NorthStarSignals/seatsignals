'use client';

import { useState, useMemo } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import {
  UserMinus,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  Pencil,
  Trash2,
  Power,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal,
  FieldLabel,
  TextInput,
  TextArea,
  Select,
  PrimaryButton,
  GhostButton,
} from '@/components/dashboard/edit-modal';

interface WinbackCampaign {
  id: string;
  name: string;
  trigger_days: number;
  offer: string;
  message: string;
  channel: 'email' | 'sms' | 'both';
  enabled: boolean;
  candidates: number;
  sent: number;
  recovered: number;
  created_at: string;
}

const initialCampaigns: WinbackCampaign[] = [
  {
    id: 'wb1',
    name: '30-Day Re-engagement',
    trigger_days: 30,
    offer: '15% off your next visit',
    message: "Hi {first_name}, we miss you! Come back to {restaurant_name} and enjoy 15% off your next meal.",
    channel: 'email',
    enabled: true,
    candidates: 142,
    sent: 118,
    recovered: 37,
    created_at: new Date().toISOString(),
  },
  {
    id: 'wb2',
    name: '60-Day VIP Push',
    trigger_days: 60,
    offer: 'Free appetizer + private table',
    message: "{first_name}, we've missed you at {restaurant_name}. As a thank you, here's a free appetizer on your next visit.",
    channel: 'both',
    enabled: true,
    candidates: 48,
    sent: 48,
    recovered: 21,
    created_at: new Date().toISOString(),
  },
  {
    id: 'wb3',
    name: '90-Day Last Chance',
    trigger_days: 90,
    offer: '25% off your entire check',
    message: "It's been a while, {first_name}. Come back to {restaurant_name} for 25% off.",
    channel: 'sms',
    enabled: false,
    candidates: 27,
    sent: 0,
    recovered: 0,
    created_at: new Date().toISOString(),
  },
];

export default function WinBackPage() {
  const { items: campaigns, add, update, remove } = useCrudList<WinbackCampaign>(
    'seatsignals_winback',
    initialCampaigns
  );

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [triggerDays, setTriggerDays] = useState('30');
  const [offer, setOffer] = useState('');
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState<WinbackCampaign['channel']>('email');

  function resetForm() {
    setName('');
    setTriggerDays('30');
    setOffer('');
    setMessage('');
    setChannel('email');
    setEditingId(null);
  }

  function openCreate() {
    resetForm();
    setShowModal(true);
  }

  function openEdit(c: WinbackCampaign) {
    setEditingId(c.id);
    setName(c.name);
    setTriggerDays(String(c.trigger_days));
    setOffer(c.offer);
    setMessage(c.message);
    setChannel(c.channel);
    setShowModal(true);
  }

  function handleSave() {
    if (!name.trim() || !message.trim()) {
      toast.error('Name and message required');
      return;
    }
    const data = {
      name,
      trigger_days: Number(triggerDays) || 30,
      offer,
      message,
      channel,
    };
    if (editingId) {
      update(editingId, data);
      toast.success('Campaign updated');
    } else {
      add({
        id: `wb_${Date.now()}`,
        enabled: true,
        candidates: Math.floor(Math.random() * 100) + 20,
        sent: 0,
        recovered: 0,
        created_at: new Date().toISOString(),
        ...data,
      });
      toast.success('Win-back campaign created');
    }
    setShowModal(false);
    resetForm();
  }

  function toggleEnabled(c: WinbackCampaign) {
    update(c.id, { enabled: !c.enabled });
    toast.success(c.enabled ? 'Campaign paused' : 'Campaign enabled');
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this win-back campaign?')) return;
    remove(id);
    toast.success('Campaign deleted');
  }

  const stats = useMemo(() => {
    const totalLapsed = campaigns.reduce((s, c) => s + c.candidates, 0);
    const totalSent = campaigns.reduce((s, c) => s + c.sent, 0);
    const totalRecovered = campaigns.reduce((s, c) => s + c.recovered, 0);
    const estLost = totalLapsed * 45;
    return {
      totalLapsed,
      totalSent,
      totalRecovered,
      estLost,
      highPriority: campaigns.filter((c) => c.enabled && c.trigger_days <= 30).reduce((s, c) => s + c.candidates, 0),
    };
  }, [campaigns]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Win-Back Campaigns</h1>
          <p className="text-zinc-400 text-sm mt-1">Automated re-engagement for lapsed customers</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 transition-colors"
        >
          <Plus size={16} /> New Win-Back
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Lapsed Customers" value={stats.totalLapsed} icon={<UserMinus size={18} />} />
        <MetricCard title="High Priority" value={stats.highPriority} icon={<AlertTriangle size={18} />} />
        <MetricCard title="Est. Lost Revenue" value={`$${stats.estLost.toLocaleString()}`} icon={<DollarSign size={18} />} />
        <MetricCard title="Recovered" value={stats.totalRecovered} icon={<ArrowUpRight size={18} />} />
      </div>

      <div className="space-y-3">
        {campaigns.length === 0 ? (
          <div className="bg-seat-card border border-seat-border rounded-xl p-8 text-center">
            <UserMinus size={40} className="mx-auto text-zinc-700 mb-3" />
            <p className="text-zinc-400">No win-back campaigns yet</p>
          </div>
        ) : (
          campaigns.map((c) => (
            <div
              key={c.id}
              className={cn('bg-seat-card border border-seat-border rounded-xl p-5', !c.enabled && 'opacity-60')}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-white">{c.name}</h3>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', c.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-700 text-zinc-400')}>
                      {c.enabled ? 'Active' : 'Paused'}
                    </span>
                    <span className="text-[10px] uppercase bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">{c.channel}</span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Triggers {c.trigger_days} days after last visit · {c.offer}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleEnabled(c)} className="p-2 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800" title={c.enabled ? 'Pause' : 'Enable'}>
                    <Power size={14} />
                  </button>
                  <button onClick={() => openEdit(c)} className="p-2 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800" title="Edit">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="p-2 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <p className="text-xs text-zinc-400 bg-zinc-800/50 p-3 rounded-lg font-mono mb-3">{c.message}</p>

              <div className="grid grid-cols-3 gap-4 pt-3 border-t border-seat-border">
                <div>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Candidates</p>
                  <p className="text-sm text-white font-mono">{c.candidates}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Sent</p>
                  <p className="text-sm text-white font-mono">{c.sent}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Recovered</p>
                  <p className="text-sm text-emerald-400 font-mono">{c.recovered}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <EditModal
        open={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingId ? 'Edit Win-Back' : 'Create Win-Back'}
        maxWidth="lg"
        footer={
          <>
            <GhostButton onClick={() => { setShowModal(false); resetForm(); }}>Cancel</GhostButton>
            <PrimaryButton onClick={handleSave}>{editingId ? 'Save Changes' : 'Create Campaign'}</PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Campaign Name</FieldLabel>
            <TextInput value={name} onChange={setName} placeholder="e.g., 30-Day Re-engagement" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Trigger Days</FieldLabel>
              <TextInput type="number" value={triggerDays} onChange={setTriggerDays} placeholder="30" />
            </div>
            <div>
              <FieldLabel>Channel</FieldLabel>
              <Select
                value={channel}
                onChange={(v) => setChannel(v as WinbackCampaign['channel'])}
                options={[
                  { label: 'Email', value: 'email' },
                  { label: 'SMS', value: 'sms' },
                  { label: 'Both', value: 'both' },
                ]}
              />
            </div>
          </div>
          <div>
            <FieldLabel>Offer</FieldLabel>
            <TextInput value={offer} onChange={setOffer} placeholder="e.g., 15% off your next visit" />
          </div>
          <div>
            <FieldLabel>Message</FieldLabel>
            <TextArea value={message} onChange={setMessage} placeholder="Use {first_name} and {restaurant_name} for personalization" rows={4} />
          </div>
        </div>
      </EditModal>
    </div>
  );
}
