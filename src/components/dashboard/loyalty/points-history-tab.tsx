'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal, FieldLabel, TextInput, Select, PrimaryButton, GhostButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { Plus, TrendingUp, TrendingDown, Trash2 } from 'lucide-react';

type TxType = 'earn' | 'redeem' | 'bonus' | 'expire';

interface PointTx {
  id: string;
  customer: string;
  points: number;
  type: TxType;
  reason: string;
  date: string;
}

const INITIAL: PointTx[] = [
  { id: 'pt1', customer: 'Sarah Thompson', points: 280, type: 'earn', reason: 'Dinner purchase', date: '2026-04-11' },
  { id: 'pt2', customer: 'Marcus Kim', points: 500, type: 'bonus', reason: 'Birthday bonus', date: '2026-04-11' },
  { id: 'pt3', customer: 'Emma Rodriguez', points: -200, type: 'redeem', reason: 'Free Appetizer', date: '2026-04-10' },
  { id: 'pt4', customer: 'David Chen', points: 165, type: 'earn', reason: 'Lunch purchase', date: '2026-04-10' },
  { id: 'pt5', customer: 'Lisa Park', points: -150, type: 'redeem', reason: '$10 Off Check', date: '2026-04-09' },
  { id: 'pt6', customer: 'Alex Morgan', points: -50, type: 'expire', reason: '12-month expiry', date: '2026-04-08' },
  { id: 'pt7', customer: 'Jordan Lee', points: 420, type: 'earn', reason: 'Private dining', date: '2026-04-08' },
  { id: 'pt8', customer: 'Olivia Bennett', points: 100, type: 'bonus', reason: 'Referral reward', date: '2026-04-07' },
];

const typeLabel = (t: TxType) => ({ earn: 'Earn', redeem: 'Redeem', bonus: 'Bonus', expire: 'Expire' }[t]);
const typeColor = (t: TxType) => ({
  earn: 'bg-green-500/10 text-green-400',
  redeem: 'bg-blue-500/10 text-blue-400',
  bonus: 'bg-amber-500/10 text-amber-400',
  expire: 'bg-zinc-500/10 text-zinc-400',
}[t]);

function empty(): Omit<PointTx, 'id'> {
  return { customer: '', points: 0, type: 'earn', reason: '', date: new Date().toISOString().split('T')[0] };
}

export function PointsHistoryTab() {
  const { items: tx, add, remove } = useCrudList<PointTx>('seatsignals_points_history', INITIAL);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty());
  const [filter, setFilter] = useState<TxType | 'all'>('all');

  const filtered = filter === 'all' ? tx : tx.filter(t => t.type === filter);

  const totalEarned = tx.filter(t => t.points > 0).reduce((s, t) => s + t.points, 0);
  const totalRedeemed = Math.abs(tx.filter(t => t.type === 'redeem').reduce((s, t) => s + t.points, 0));
  const totalExpired = Math.abs(tx.filter(t => t.type === 'expire').reduce((s, t) => s + t.points, 0));

  const openAdd = () => { setForm(empty()); setModalOpen(true); };
  const save = () => {
    if (!form.customer.trim()) { toast.error('Customer required'); return; }
    add({ id: `pt${Date.now()}`, ...form });
    toast.success('Transaction logged');
    setModalOpen(false);
  };
  const del = (t: PointTx) => {
    if (!confirm('Delete transaction?')) return;
    remove(t.id); toast.success('Deleted');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Points History</h2>
          <p className="text-sm text-zinc-500">Every points transaction across your members</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg text-sm font-medium">
          <Plus size={16} /> Log Transaction
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Points Earned" value={totalEarned.toLocaleString()} icon={<TrendingUp size={18} />} />
        <MetricCard title="Points Redeemed" value={totalRedeemed.toLocaleString()} icon={<TrendingDown size={18} />} />
        <MetricCard title="Points Expired" value={totalExpired.toLocaleString()} />
        <MetricCard title="Transactions" value={tx.length} />
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'earn', 'redeem', 'bonus', 'expire'] as const).map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
              filter === t ? 'bg-seat-red text-white' : 'bg-seat-card border border-seat-border text-zinc-400 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-zinc-500 uppercase border-b border-seat-border">
              <th className="text-left py-3 px-3">Date</th>
              <th className="text-left py-3 px-3">Customer</th>
              <th className="text-center py-3 px-3">Type</th>
              <th className="text-left py-3 px-3">Reason</th>
              <th className="text-right py-3 px-3">Points</th>
              <th className="text-right py-3 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id} className="border-b border-seat-border/30 hover:bg-seat-black/50">
                <td className="py-2.5 px-3 text-zinc-400 text-xs">{t.date}</td>
                <td className="py-2.5 px-3 text-white">{t.customer}</td>
                <td className="py-2.5 px-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] ${typeColor(t.type)}`}>{typeLabel(t.type)}</span>
                </td>
                <td className="py-2.5 px-3 text-zinc-300">{t.reason}</td>
                <td className={`py-2.5 px-3 text-right font-medium ${t.points > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {t.points > 0 ? '+' : ''}{t.points}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <button onClick={() => del(t)} className="p-1 text-zinc-500 hover:text-red-400"><Trash2 size={12} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Log Points Transaction"
        footer={<><GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton><PrimaryButton onClick={save}>Log</PrimaryButton></>}
      >
        <div className="space-y-4">
          <div><FieldLabel>Customer</FieldLabel><TextInput value={form.customer} onChange={(v) => setForm(f => ({ ...f, customer: v }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Type</FieldLabel>
              <Select value={form.type} onChange={(v) => setForm(f => ({ ...f, type: v as TxType }))} options={[
                { label: 'Earn', value: 'earn' }, { label: 'Redeem', value: 'redeem' },
                { label: 'Bonus', value: 'bonus' }, { label: 'Expire', value: 'expire' },
              ]} />
            </div>
            <div><FieldLabel>Points (+/-)</FieldLabel><TextInput type="number" value={form.points} onChange={(v) => setForm(f => ({ ...f, points: parseInt(v) || 0 }))} /></div>
          </div>
          <div><FieldLabel>Reason</FieldLabel><TextInput value={form.reason} onChange={(v) => setForm(f => ({ ...f, reason: v }))} placeholder="Dinner purchase, Birthday bonus..." /></div>
          <div><FieldLabel>Date</FieldLabel><TextInput type="date" value={form.date} onChange={(v) => setForm(f => ({ ...f, date: v }))} /></div>
        </div>
      </EditModal>
    </div>
  );
}
