'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { useLocalStorageState, useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal, FieldLabel, TextInput, TextArea, PrimaryButton, GhostButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { Pencil, Trash2, TrendingUp, Users } from 'lucide-react';

interface Config {
  enabled: boolean;
  referrerReward: number;
  refereeReward: number;
  message: string;
}

interface Referrer {
  id: string;
  name: string;
  email: string;
  referrals: number;
  converted: number;
  rewardsEarned: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

const DEFAULT_CONFIG: Config = {
  enabled: true,
  referrerReward: 25,
  refereeReward: 15,
  message: "Hey! I just had an incredible meal at [Restaurant]. Use my link to get $15 off your first visit — and I'll get $25. Win-win!",
};

const INITIAL_REFERRERS: Referrer[] = [
  { id: 'r1', name: 'Sarah Thompson', email: 'sarah.t@example.com', referrals: 12, converted: 9, rewardsEarned: 225, tier: 'gold' },
  { id: 'r2', name: 'Marcus Kim', email: 'marcus.kim@example.com', referrals: 8, converted: 7, rewardsEarned: 175, tier: 'silver' },
  { id: 'r3', name: 'Jordan Lee', email: 'jordan@acmetech.com', referrals: 18, converted: 14, rewardsEarned: 350, tier: 'platinum' },
  { id: 'r4', name: 'Emma Rodriguez', email: 'emma.r@example.com', referrals: 4, converted: 3, rewardsEarned: 75, tier: 'bronze' },
  { id: 'r5', name: 'Olivia Bennett', email: 'olivia@example.com', referrals: 6, converted: 4, rewardsEarned: 100, tier: 'silver' },
];

const tierColor = (t: Referrer['tier']) => ({
  platinum: 'bg-zinc-300/10 text-zinc-200',
  gold: 'bg-amber-500/10 text-amber-400',
  silver: 'bg-zinc-400/10 text-zinc-300',
  bronze: 'bg-orange-500/10 text-orange-400',
}[t]);

function empty(): Omit<Referrer, 'id'> {
  return { name: '', email: '', referrals: 0, converted: 0, rewardsEarned: 0, tier: 'bronze' };
}

export function ReferralsTab() {
  const [config, setConfig] = useLocalStorageState<Config>('seatsignals_referral_config', DEFAULT_CONFIG);
  const { items: referrers, add, update, remove } = useCrudList<Referrer>('seatsignals_referrers', INITIAL_REFERRERS);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty());

  const totalReferrals = referrers.reduce((s, r) => s + r.referrals, 0);
  const totalConverted = referrers.reduce((s, r) => s + r.converted, 0);
  const totalRewards = referrers.reduce((s, r) => s + r.rewardsEarned, 0);
  const conversionRate = totalReferrals ? Math.round((totalConverted / totalReferrals) * 100) : 0;

  const saveConfig = () => toast.success('Config saved');
  const openAdd = () => { setEditingId(null); setForm(empty()); setModalOpen(true); };
  const openEdit = (r: Referrer) => { setEditingId(r.id); const { id: _id, ...rest } = r; void _id; setForm(rest); setModalOpen(true); };
  const save = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (editingId) { update(editingId, form); toast.success('Referrer updated'); }
    else { add({ id: `r${Date.now()}`, ...form }); toast.success('Referrer added'); }
    setModalOpen(false);
  };
  const del = (r: Referrer) => {
    if (!confirm(`Delete ${r.name}?`)) return;
    remove(r.id); toast.success('Deleted');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Referral Program</h2>
          <p className="text-sm text-zinc-500">Reward members for bringing friends</p>
        </div>
        <button
          onClick={() => { setConfig(c => ({ ...c, enabled: !c.enabled })); toast.success(config.enabled ? 'Paused' : 'Active'); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            config.enabled ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
          }`}
        >
          {config.enabled ? '● Active' : '○ Paused'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total Referrals" value={totalReferrals.toLocaleString()} icon={<Users size={18} />} />
        <MetricCard title="Conversion Rate" value={`${conversionRate}%`} icon={<TrendingUp size={18} />} />
        <MetricCard title="Rewards Paid" value={`$${totalRewards.toLocaleString()}`} />
        <MetricCard title="Active Referrers" value={referrers.length} />
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Reward Config</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Reward for Referrer ($)</FieldLabel>
              <TextInput type="number" value={config.referrerReward} onChange={(v) => setConfig(c => ({ ...c, referrerReward: parseFloat(v) || 0 }))} />
            </div>
            <div>
              <FieldLabel>Reward for Referee ($)</FieldLabel>
              <TextInput type="number" value={config.refereeReward} onChange={(v) => setConfig(c => ({ ...c, refereeReward: parseFloat(v) || 0 }))} />
            </div>
          </div>
          <div>
            <FieldLabel>Share Message Template</FieldLabel>
            <TextArea value={config.message} onChange={(v) => setConfig(c => ({ ...c, message: v }))} rows={3} />
          </div>
          <div className="flex justify-end">
            <PrimaryButton onClick={saveConfig}>Save Config</PrimaryButton>
          </div>
        </div>
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Top Referrers</h3>
          <button onClick={openAdd} className="text-xs text-seat-red hover:underline">+ Add</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-zinc-500 uppercase border-b border-seat-border">
                <th className="text-left py-2 px-3">Name</th>
                <th className="text-center py-2 px-3">Tier</th>
                <th className="text-right py-2 px-3">Referrals</th>
                <th className="text-right py-2 px-3">Converted</th>
                <th className="text-right py-2 px-3">Earned</th>
                <th className="text-right py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {[...referrers].sort((a, b) => b.rewardsEarned - a.rewardsEarned).map(r => (
                <tr key={r.id} className="border-b border-seat-border/30">
                  <td className="py-2.5 px-3"><div className="text-white">{r.name}</div><div className="text-[10px] text-zinc-500">{r.email}</div></td>
                  <td className="py-2.5 px-3 text-center"><span className={`px-2 py-0.5 rounded text-[10px] capitalize ${tierColor(r.tier)}`}>{r.tier}</span></td>
                  <td className="py-2.5 px-3 text-right text-zinc-300">{r.referrals}</td>
                  <td className="py-2.5 px-3 text-right text-zinc-300">{r.converted}</td>
                  <td className="py-2.5 px-3 text-right text-white font-medium">${r.rewardsEarned}</td>
                  <td className="py-2.5 px-3 text-right">
                    <button onClick={() => openEdit(r)} className="p-1 text-zinc-500 hover:text-white"><Pencil size={12} /></button>
                    <button onClick={() => del(r)} className="p-1 text-zinc-500 hover:text-red-400"><Trash2 size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Referrer' : 'Add Referrer'}
        footer={<><GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton><PrimaryButton onClick={save}>{editingId ? 'Save' : 'Add'}</PrimaryButton></>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><FieldLabel>Name</FieldLabel><TextInput value={form.name} onChange={(v) => setForm(f => ({ ...f, name: v }))} /></div>
            <div><FieldLabel>Email</FieldLabel><TextInput value={form.email} onChange={(v) => setForm(f => ({ ...f, email: v }))} /></div>
            <div><FieldLabel>Referrals</FieldLabel><TextInput type="number" value={form.referrals} onChange={(v) => setForm(f => ({ ...f, referrals: parseInt(v) || 0 }))} /></div>
            <div><FieldLabel>Converted</FieldLabel><TextInput type="number" value={form.converted} onChange={(v) => setForm(f => ({ ...f, converted: parseInt(v) || 0 }))} /></div>
            <div><FieldLabel>Rewards Earned ($)</FieldLabel><TextInput type="number" value={form.rewardsEarned} onChange={(v) => setForm(f => ({ ...f, rewardsEarned: parseFloat(v) || 0 }))} /></div>
          </div>
        </div>
      </EditModal>
    </div>
  );
}
