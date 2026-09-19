'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal, FieldLabel, TextInput, Select, PrimaryButton, GhostButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { Gift, Plus, Trash2, Users, Check, Clock } from 'lucide-react';

type Status = 'invited' | 'signed_up' | 'first_visit' | 'rewarded';

interface Referral {
  id: string;
  referrer: string;
  invitee: string;
  inviteeEmail: string;
  status: Status;
  invitedAt: string;
  completedAt: string;
  rewardAmount: number;
}

const INITIAL: Referral[] = [
  { id: 'r1', referrer: 'Sarah Thompson', invitee: 'Rachel Kim', inviteeEmail: 'rkim@example.com', status: 'rewarded', invitedAt: '2026-03-20', completedAt: '2026-03-27', rewardAmount: 25 },
  { id: 'r2', referrer: 'Marcus Kim', invitee: 'Jake Turner', inviteeEmail: 'jake@example.com', status: 'first_visit', invitedAt: '2026-04-01', completedAt: '2026-04-08', rewardAmount: 0 },
  { id: 'r3', referrer: 'Jordan Lee', invitee: 'Nina Chen', inviteeEmail: 'nina@example.com', status: 'signed_up', invitedAt: '2026-04-05', completedAt: '', rewardAmount: 0 },
  { id: 'r4', referrer: 'Jordan Lee', invitee: 'Mike Ross', inviteeEmail: 'mikeross@example.com', status: 'invited', invitedAt: '2026-04-09', completedAt: '', rewardAmount: 0 },
  { id: 'r5', referrer: 'Emma Rodriguez', invitee: 'Casey Pham', inviteeEmail: 'cpham@example.com', status: 'rewarded', invitedAt: '2026-03-18', completedAt: '2026-03-30', rewardAmount: 25 },
];

const statusBadge = (s: Status) => ({
  invited: 'bg-zinc-500/10 text-zinc-400',
  signed_up: 'bg-amber-500/10 text-amber-400',
  first_visit: 'bg-blue-500/10 text-blue-400',
  rewarded: 'bg-green-500/10 text-green-400',
}[s]);

function empty(): Omit<Referral, 'id'> {
  return { referrer: '', invitee: '', inviteeEmail: '', status: 'invited', invitedAt: new Date().toISOString().split('T')[0], completedAt: '', rewardAmount: 0 };
}

export default function ReferralsPage() {
  const { items: referrals, add, update, remove } = useCrudList<Referral>('seatsignals_referrals', INITIAL);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty());

  const totalReferrals = referrals.length;
  const converted = referrals.filter(r => r.status === 'rewarded' || r.status === 'first_visit').length;
  const pending = referrals.filter(r => r.status === 'invited' || r.status === 'signed_up').length;
  const totalRewards = referrals.reduce((s, r) => s + r.rewardAmount, 0);

  const openAdd = () => { setForm(empty()); setModalOpen(true); };
  const save = () => {
    if (!form.referrer.trim() || !form.invitee.trim()) { toast.error('Referrer and invitee required'); return; }
    add({ id: `r${Date.now()}`, ...form });
    toast.success('Referral logged');
    setModalOpen(false);
  };
  const markComplete = (r: Referral) => {
    update(r.id, { status: 'rewarded', completedAt: new Date().toISOString().split('T')[0], rewardAmount: 25 });
    toast.success('Reward issued');
  };
  const del = (r: Referral) => {
    if (!confirm('Delete referral?')) return;
    remove(r.id); toast.success('Deleted');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Gift className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Referrals</h1>
            <p className="text-sm text-zinc-500">Track every friend-of-a-friend that walks through the door</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg text-sm font-medium">
          <Plus size={16} /> Log Referral
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total Referrals" value={totalReferrals} icon={<Users size={18} />} />
        <MetricCard title="Converted" value={converted} icon={<Check size={18} />} />
        <MetricCard title="Pending" value={pending} icon={<Clock size={18} />} />
        <MetricCard title="Rewards Paid" value={`$${totalRewards}`} />
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-zinc-500 uppercase border-b border-seat-border">
              <th className="text-left py-3 px-3">Referrer</th>
              <th className="text-left py-3 px-3">Invitee</th>
              <th className="text-center py-3 px-3">Status</th>
              <th className="text-center py-3 px-3">Invited</th>
              <th className="text-right py-3 px-3">Reward</th>
              <th className="text-right py-3 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {referrals.map(r => (
              <tr key={r.id} className="border-b border-seat-border/30 hover:bg-seat-black/50">
                <td className="py-2.5 px-3 text-white">{r.referrer}</td>
                <td className="py-2.5 px-3">
                  <div className="text-white">{r.invitee}</div>
                  <div className="text-[10px] text-zinc-500">{r.inviteeEmail}</div>
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] capitalize ${statusBadge(r.status)}`}>{r.status.replace('_', ' ')}</span>
                </td>
                <td className="py-2.5 px-3 text-center text-xs text-zinc-400">{r.invitedAt}</td>
                <td className="py-2.5 px-3 text-right text-white">{r.rewardAmount > 0 ? `$${r.rewardAmount}` : '—'}</td>
                <td className="py-2.5 px-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {r.status !== 'rewarded' && (
                      <button onClick={() => markComplete(r)} className="px-2 py-1 bg-seat-red/10 text-seat-red hover:bg-seat-red/20 rounded text-[10px]">Mark complete</button>
                    )}
                    <button onClick={() => del(r)} className="p-1 text-zinc-500 hover:text-red-400"><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Log Referral"
        footer={<><GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton><PrimaryButton onClick={save}>Log</PrimaryButton></>}
      >
        <div className="space-y-4">
          <div><FieldLabel>Referrer (existing member)</FieldLabel><TextInput value={form.referrer} onChange={(v) => setForm(f => ({ ...f, referrer: v }))} /></div>
          <div><FieldLabel>Invitee Name</FieldLabel><TextInput value={form.invitee} onChange={(v) => setForm(f => ({ ...f, invitee: v }))} /></div>
          <div><FieldLabel>Invitee Email</FieldLabel><TextInput value={form.inviteeEmail} onChange={(v) => setForm(f => ({ ...f, inviteeEmail: v }))} /></div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <Select value={form.status} onChange={(v) => setForm(f => ({ ...f, status: v as Status }))} options={[
              { label: 'Invited', value: 'invited' }, { label: 'Signed Up', value: 'signed_up' },
              { label: 'First Visit', value: 'first_visit' }, { label: 'Rewarded', value: 'rewarded' },
            ]} />
          </div>
        </div>
      </EditModal>
    </div>
  );
}
