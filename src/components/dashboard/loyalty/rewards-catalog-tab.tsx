'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { formatCurrency, cn } from '@/lib/utils';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal, FieldLabel, TextInput, Select, PrimaryButton, GhostButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { Gift, DollarSign, Users, TrendingUp, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'All';

interface Reward {
  id: string;
  name: string;
  points_cost: number;
  times_redeemed: number;
  total_value: number;
  popular_tier: Tier;
  active: boolean;
}

const INITIAL: Reward[] = [
  { id: 'R1', name: 'Free Appetizer', points_cost: 200, times_redeemed: 185, total_value: 2590, popular_tier: 'Silver', active: true },
  { id: 'R2', name: '$10 Off Check', points_cost: 150, times_redeemed: 320, total_value: 3200, popular_tier: 'Bronze', active: true },
  { id: 'R3', name: 'Free Dessert', points_cost: 250, times_redeemed: 148, total_value: 2072, popular_tier: 'Silver', active: true },
  { id: 'R4', name: 'Complimentary Wine', points_cost: 400, times_redeemed: 65, total_value: 1950, popular_tier: 'Gold', active: true },
  { id: 'R5', name: '$25 Off Check', points_cost: 350, times_redeemed: 92, total_value: 2300, popular_tier: 'Gold', active: true },
  { id: 'R6', name: 'Birthday Dinner', points_cost: 0, times_redeemed: 45, total_value: 2250, popular_tier: 'All', active: true },
  { id: 'R7', name: "Chef's Table Experience", points_cost: 1000, times_redeemed: 12, total_value: 1800, popular_tier: 'Platinum', active: true },
  { id: 'R8', name: 'Free Entree', points_cost: 500, times_redeemed: 28, total_value: 1120, popular_tier: 'Gold', active: true },
  { id: 'R9', name: '20% Off Total', points_cost: 600, times_redeemed: 22, total_value: 1320, popular_tier: 'Platinum', active: false },
];

const monthlyRedemptions = [
  { month: 'Jan', redemptions: 95 },
  { month: 'Feb', redemptions: 102 },
  { month: 'Mar', redemptions: 118 },
  { month: 'Apr', redemptions: 132 },
  { month: 'May', redemptions: 145 },
  { month: 'Jun', redemptions: 155 },
];

function emptyForm(): Omit<Reward, 'id'> {
  return { name: '', points_cost: 200, times_redeemed: 0, total_value: 0, popular_tier: 'Silver', active: true };
}

export function RewardsCatalogTab() {
  const { items: rewards, add, update, remove } = useCrudList<Reward>('seatsignals_loyalty_rewards', INITIAL);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  const totalRedemptions = rewards.reduce((s, r) => s + r.times_redeemed, 0);
  const totalValue = rewards.reduce((s, r) => s + r.total_value, 0);
  const mostPopular = rewards.length ? rewards.reduce((a, b) => a.times_redeemed > b.times_redeemed ? a : b) : null;
  const activeRewards = rewards.filter(r => r.active).length;
  const chartData = [...rewards].filter(r => r.active).sort((a, b) => b.times_redeemed - a.times_redeemed);

  const openAdd = () => { setEditingId(null); setForm(emptyForm()); setModalOpen(true); };
  const openEdit = (r: Reward) => {
    setEditingId(r.id);
    setForm({ name: r.name, points_cost: r.points_cost, times_redeemed: r.times_redeemed, total_value: r.total_value, popular_tier: r.popular_tier, active: r.active });
    setModalOpen(true);
  };
  const save = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (editingId) { update(editingId, form); toast.success('Reward updated'); }
    else { add({ id: `R${Date.now()}`, ...form }); toast.success('Reward created'); }
    setModalOpen(false);
  };
  const toggleActive = (r: Reward) => {
    update(r.id, { active: !r.active });
    toast.success(r.active ? 'Reward deactivated' : 'Reward activated');
  };
  const del = (r: Reward) => {
    if (!confirm(`Delete "${r.name}"?`)) return;
    remove(r.id); toast.success('Reward deleted');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Rewards Catalog</h2>
          <p className="text-sm text-zinc-500">Manage redeemable rewards and track redemption rates</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg text-sm font-medium">
          <Plus size={16} /> New Reward
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total Redemptions" value={totalRedemptions.toLocaleString()} icon={<Gift size={18} />} />
        <MetricCard title="Total Value" value={formatCurrency(totalValue)} icon={<DollarSign size={18} />} />
        <MetricCard title="Most Popular" value={mostPopular?.name || '—'} icon={<TrendingUp size={18} />} />
        <MetricCard title="Active Rewards" value={activeRewards} icon={<Users size={18} />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Redemptions by Reward</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
              <XAxis type="number" stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
              <YAxis dataKey="name" type="category" stroke="#52525B" tick={{ fill: '#71717A', fontSize: 9 }} width={120} />
              <Tooltip contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: 8 }} />
              <Bar dataKey="times_redeemed" fill="#E11D48" radius={[0, 4, 4, 0]} name="Redemptions" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Monthly Redemption Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyRedemptions}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
              <XAxis dataKey="month" stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
              <YAxis stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: 8 }} />
              <Bar dataKey="redemptions" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Redemptions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">All Rewards</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-zinc-500 uppercase border-b border-seat-border">
                <th className="text-left py-2 px-3">Reward</th>
                <th className="text-right py-2 px-3">Points</th>
                <th className="text-right py-2 px-3">Redeemed</th>
                <th className="text-right py-2 px-3">Total Value</th>
                <th className="text-center py-2 px-3">Tier</th>
                <th className="text-center py-2 px-3">Status</th>
                <th className="text-right py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rewards.map(r => (
                <tr key={r.id} className="border-b border-seat-border/30 hover:bg-seat-black/50">
                  <td className="py-2.5 px-3 text-white font-medium">{r.name}</td>
                  <td className="py-2.5 px-3 text-right text-zinc-300">{r.points_cost > 0 ? `${r.points_cost} pts` : 'Free'}</td>
                  <td className="py-2.5 px-3 text-right text-zinc-300">{r.times_redeemed}</td>
                  <td className="py-2.5 px-3 text-right text-white font-medium">{formatCurrency(r.total_value)}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium',
                      r.popular_tier === 'Platinum' ? 'bg-zinc-300/10 text-zinc-200' :
                      r.popular_tier === 'Gold' ? 'bg-amber-500/10 text-amber-400' :
                      r.popular_tier === 'Silver' ? 'bg-zinc-400/10 text-zinc-300' :
                      r.popular_tier === 'Bronze' ? 'bg-orange-500/10 text-orange-400' :
                      'bg-blue-500/10 text-blue-400')}>
                      {r.popular_tier}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => toggleActive(r)}
                      className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium transition',
                        r.active ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700')}
                    >
                      {r.active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(r)} className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => del(r)} className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-zinc-800">
                        <Trash2 size={14} />
                      </button>
                    </div>
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
        title={editingId ? 'Edit Reward' : 'New Reward'}
        subtitle={editingId ? 'Update reward details' : 'Add a new redeemable reward'}
        footer={<><GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton><PrimaryButton onClick={save}>{editingId ? 'Save changes' : 'Create reward'}</PrimaryButton></>}
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Name</FieldLabel>
            <TextInput value={form.name} onChange={(v) => setForm(f => ({ ...f, name: v }))} placeholder="Free Appetizer" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Points Cost</FieldLabel>
              <TextInput type="number" value={form.points_cost} onChange={(v) => setForm(f => ({ ...f, points_cost: parseInt(v) || 0 }))} />
            </div>
            <div>
              <FieldLabel>Tier</FieldLabel>
              <Select
                value={form.popular_tier}
                onChange={(v) => setForm(f => ({ ...f, popular_tier: v as Tier }))}
                options={[
                  { label: 'All Tiers', value: 'All' },
                  { label: 'Bronze', value: 'Bronze' },
                  { label: 'Silver', value: 'Silver' },
                  { label: 'Gold', value: 'Gold' },
                  { label: 'Platinum', value: 'Platinum' },
                ]}
              />
            </div>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm text-white">Active</div>
              <div className="text-xs text-zinc-500">Members can redeem this reward</div>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, active: !f.active }))}
              className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition', form.active ? 'bg-seat-red' : 'bg-seat-border')}
            >
              <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white transition', form.active ? 'translate-x-6' : 'translate-x-1')} />
            </button>
          </div>
        </div>
      </EditModal>
    </div>
  );
}
