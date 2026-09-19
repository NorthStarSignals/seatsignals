'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal, FieldLabel, TextInput, TextArea, Select, PrimaryButton, GhostButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { Crown, Plus, Pencil, Trash2, Star, DollarSign, TrendingUp, Users } from 'lucide-react';

type Tier = 'Platinum' | 'Gold' | 'Silver';

interface VipMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  tier: Tier;
  lifetimeSpend: number;
  visits: number;
  lastVisit: string;
  preferences: string;
  notes: string;
}

const INITIAL: VipMember[] = [
  { id: 'v1', name: 'Sarah Thompson', email: 'sarah.t@example.com', phone: '(415) 555-0102', tier: 'Platinum', lifetimeSpend: 18450, visits: 48, lastVisit: '2026-04-09', preferences: 'Window table, bottle of Chardonnay ready', notes: 'Birthday April 22' },
  { id: 'v2', name: 'David & Linda Chen', email: 'davidchen@example.com', phone: '(415) 555-0187', tier: 'Platinum', lifetimeSpend: 22100, visits: 52, lastVisit: '2026-04-05', preferences: 'Quiet booth, no onions for Linda', notes: 'Anniversary November' },
  { id: 'v3', name: 'Marcus Kim', email: 'marcus.kim@example.com', phone: '(415) 555-0214', tier: 'Gold', lifetimeSpend: 8920, visits: 26, lastVisit: '2026-04-11', preferences: 'Loves wine pairings', notes: 'Tech executive' },
  { id: 'v4', name: 'Emma Rodriguez', email: 'emma.r@example.com', phone: '(415) 555-0340', tier: 'Gold', lifetimeSpend: 9540, visits: 28, lastVisit: '2026-03-28', preferences: 'Gluten-free', notes: '' },
  { id: 'v5', name: 'James Park', email: 'jpark@example.com', phone: '(415) 555-0411', tier: 'Silver', lifetimeSpend: 4380, visits: 18, lastVisit: '2026-04-02', preferences: 'Bar seating preferred', notes: '' },
  { id: 'v6', name: 'Olivia Bennett', email: 'olivia@example.com', phone: '(415) 555-0555', tier: 'Gold', lifetimeSpend: 7210, visits: 22, lastVisit: '2026-04-08', preferences: 'Vegetarian, loves truffle pasta', notes: 'Writes food blog' },
];

function empty(): Omit<VipMember, 'id'> {
  return {
    name: '', email: '', phone: '', tier: 'Silver',
    lifetimeSpend: 0, visits: 0, lastVisit: new Date().toISOString().split('T')[0],
    preferences: '', notes: '',
  };
}

const tierColor = (t: Tier) => ({
  Platinum: 'bg-zinc-300/10 text-zinc-200 border-zinc-400/30',
  Gold: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  Silver: 'bg-zinc-400/10 text-zinc-300 border-zinc-500/30',
}[t]);

export default function VipPage() {
  const { items: members, add, update, remove } = useCrudList<VipMember>('seatsignals_vip', INITIAL);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty());

  const totalSpend = members.reduce((s, m) => s + m.lifetimeSpend, 0);
  const avgSpend = members.length ? totalSpend / members.length : 0;
  const platinum = members.filter(m => m.tier === 'Platinum').length;

  const openAdd = () => { setEditingId(null); setForm(empty()); setModalOpen(true); };
  const openEdit = (m: VipMember) => {
    setEditingId(m.id);
    setForm({ name: m.name, email: m.email, phone: m.phone, tier: m.tier, lifetimeSpend: m.lifetimeSpend, visits: m.visits, lastVisit: m.lastVisit, preferences: m.preferences, notes: m.notes });
    setModalOpen(true);
  };
  const save = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (editingId) { update(editingId, form); toast.success('VIP updated'); }
    else { add({ id: `v${Date.now()}`, ...form }); toast.success('VIP added'); }
    setModalOpen(false);
  };
  const del = (m: VipMember) => {
    if (!confirm(`Remove ${m.name} from VIP?`)) return;
    remove(m.id); toast.success('Removed');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Crown className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">VIP Program</h1>
            <p className="text-sm text-zinc-500">Track your top guests and their preferences</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg text-sm font-medium">
          <Plus size={16} /> Add VIP
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total VIPs" value={members.length} icon={<Users size={18} />} />
        <MetricCard title="Platinum Tier" value={platinum} icon={<Crown size={18} />} />
        <MetricCard title="Total Lifetime" value={`$${(totalSpend / 1000).toFixed(1)}K`} icon={<DollarSign size={18} />} />
        <MetricCard title="Avg Spend" value={`$${avgSpend.toFixed(0)}`} icon={<TrendingUp size={18} />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map(m => (
          <div key={m.id} className="bg-seat-card border border-seat-border rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-white font-semibold">{m.name}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{m.email}</div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${tierColor(m.tier)}`}>
                <Star size={10} className="inline mr-1" /> {m.tier}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
              <div>
                <div className="text-zinc-500">Lifetime</div>
                <div className="text-white font-medium">${m.lifetimeSpend.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-zinc-500">Visits</div>
                <div className="text-white font-medium">{m.visits}</div>
              </div>
            </div>
            {m.preferences && <div className="text-xs text-zinc-400 mb-2"><span className="text-zinc-500">Preferences:</span> {m.preferences}</div>}
            {m.notes && <div className="text-xs text-zinc-400 mb-3"><span className="text-zinc-500">Notes:</span> {m.notes}</div>}
            <div className="flex justify-end gap-1 pt-2 border-t border-seat-border/50">
              <button onClick={() => openEdit(m)} className="p-1.5 text-zinc-500 hover:text-white rounded"><Pencil size={14} /></button>
              <button onClick={() => del(m)} className="p-1.5 text-zinc-500 hover:text-red-400 rounded"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit VIP' : 'Add VIP Member'}
        maxWidth="lg"
        footer={<><GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton><PrimaryButton onClick={save}>{editingId ? 'Save' : 'Add VIP'}</PrimaryButton></>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><FieldLabel>Name</FieldLabel><TextInput value={form.name} onChange={(v) => setForm(f => ({ ...f, name: v }))} /></div>
            <div><FieldLabel>Email</FieldLabel><TextInput value={form.email} onChange={(v) => setForm(f => ({ ...f, email: v }))} /></div>
            <div><FieldLabel>Phone</FieldLabel><TextInput value={form.phone} onChange={(v) => setForm(f => ({ ...f, phone: v }))} /></div>
            <div><FieldLabel>Tier</FieldLabel><Select value={form.tier} onChange={(v) => setForm(f => ({ ...f, tier: v as Tier }))} options={[{ label: 'Platinum', value: 'Platinum' }, { label: 'Gold', value: 'Gold' }, { label: 'Silver', value: 'Silver' }]} /></div>
            <div><FieldLabel>Lifetime Spend</FieldLabel><TextInput type="number" value={form.lifetimeSpend} onChange={(v) => setForm(f => ({ ...f, lifetimeSpend: parseFloat(v) || 0 }))} /></div>
            <div><FieldLabel>Visits</FieldLabel><TextInput type="number" value={form.visits} onChange={(v) => setForm(f => ({ ...f, visits: parseInt(v) || 0 }))} /></div>
          </div>
          <div><FieldLabel>Preferences</FieldLabel><TextArea value={form.preferences} onChange={(v) => setForm(f => ({ ...f, preferences: v }))} placeholder="Seating, allergies, favorite dishes" /></div>
          <div><FieldLabel>Notes</FieldLabel><TextArea value={form.notes} onChange={(v) => setForm(f => ({ ...f, notes: v }))} placeholder="Birthday, background, etc." /></div>
        </div>
      </EditModal>
    </div>
  );
}
