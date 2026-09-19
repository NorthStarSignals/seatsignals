'use client';

import { useState, useMemo } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import {
  ArrowLeftRight, Calendar, Clock, UserCheck, AlertCircle, Plus, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal, FieldLabel, TextInput, TextArea, Select, PrimaryButton, GhostButton,
} from '@/components/dashboard/edit-modal';

interface SwapRequest {
  id: string;
  requester_name: string;
  requester_role: string;
  original_date: string;
  original_shift: 'morning' | 'afternoon' | 'evening';
  reason: string;
  status: 'open' | 'claimed' | 'approved' | 'denied';
  claimed_by: string | null;
  created_at: string;
  urgency: 'normal' | 'urgent';
}

const STATUS_BADGES: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  claimed: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  denied: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const SHIFT_LABELS: Record<string, { label: string; color: string }> = {
  morning: { label: 'Morning', color: 'text-amber-400' },
  afternoon: { label: 'Afternoon', color: 'text-blue-400' },
  evening: { label: 'Evening', color: 'text-purple-400' },
};

const ROLES = ['Server', 'Host', 'Bartender', 'Line Cook', 'Sous Chef', 'Dishwasher', 'Manager'];

const INITIAL_SWAPS: SwapRequest[] = [
  { id: 'sw1', requester_name: 'Marco Silva', requester_role: 'Server', original_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0], original_shift: 'evening', reason: 'Wedding out of town', status: 'open', claimed_by: null, created_at: new Date().toISOString(), urgency: 'normal' },
  { id: 'sw2', requester_name: 'Sarah Chen', requester_role: 'Bartender', original_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0], original_shift: 'evening', reason: 'Doctor appointment', status: 'claimed', claimed_by: 'David Kim', created_at: new Date().toISOString(), urgency: 'urgent' },
];

function emptySwap(): Omit<SwapRequest, 'id' | 'created_at' | 'status' | 'claimed_by'> {
  return {
    requester_name: '',
    requester_role: 'Server',
    original_date: new Date().toISOString().split('T')[0],
    original_shift: 'evening',
    reason: '',
    urgency: 'normal',
  };
}

export default function ShiftSwapBoard() {
  const { items: swaps, add, update, remove } = useCrudList<SwapRequest>(
    'seatsignals_staff_swaps',
    INITIAL_SWAPS,
  );
  const [filter, setFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptySwap());

  const stats = useMemo(() => ({
    open_swaps: swaps.filter((s) => s.status === 'open').length,
    pending_approval: swaps.filter((s) => s.status === 'claimed').length,
    completed_this_week: swaps.filter((s) => s.status === 'approved').length,
  }), [swaps]);

  const filtered = filter === 'all' ? swaps : swaps.filter((s) => s.status === filter);

  const submit = () => {
    if (!form.requester_name.trim() || !form.reason.trim()) {
      toast.error('Name and reason are required'); return;
    }
    add({
      ...form,
      id: Date.now().toString(),
      status: 'open',
      claimed_by: null,
      created_at: new Date().toISOString(),
    });
    toast.success('Swap request posted');
    setModalOpen(false);
    setForm(emptySwap());
  };

  const claim = (swap: SwapRequest) => {
    update(swap.id, { status: 'claimed', claimed_by: 'You' });
    toast.success('Shift claimed — awaiting manager approval');
  };
  const decide = (swap: SwapRequest, action: 'approve' | 'deny') => {
    update(swap.id, { status: action === 'approve' ? 'approved' : 'denied' });
    toast.success(action === 'approve' ? 'Swap approved' : 'Swap denied');
  };
  const del = (swap: SwapRequest) => {
    if (!confirm('Delete this request?')) return;
    remove(swap.id);
    toast.success('Request deleted');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-seat-red" />
            Shift Swap Board
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Request and manage shift swaps with your team</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 transition">
          <Plus className="w-4 h-4" /> Post Swap Request
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Open Swaps" value={stats.open_swaps} icon={<ArrowLeftRight className="w-4 h-4" />} />
        <MetricCard title="Pending Approval" value={stats.pending_approval} icon={<Clock className="w-4 h-4" />} />
        <MetricCard title="Approved" value={stats.completed_this_week} icon={<UserCheck className="w-4 h-4" />} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {['all', 'open', 'claimed', 'approved', 'denied'].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize', filter === s ? 'bg-seat-red text-white' : 'bg-seat-card border border-seat-border text-zinc-400 hover:text-white')}>
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-seat-card border border-seat-border rounded-xl p-8 text-center">
            <ArrowLeftRight className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No swap requests match this filter</p>
          </div>
        )}
        {filtered.map((swap) => (
          <div key={swap.id} className={cn('bg-seat-card border rounded-xl p-5 transition-colors hover:border-zinc-600', swap.urgency === 'urgent' ? 'border-red-500/50' : 'border-seat-border')}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-medium text-sm">{swap.requester_name}</span>
                  <span className="text-xs text-zinc-500">{swap.requester_role}</span>
                  {swap.urgency === 'urgent' && (
                    <span className="flex items-center gap-1 text-xs font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                      <AlertCircle className="w-3 h-3" /> Urgent
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(swap.original_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <span className={cn('flex items-center gap-1', SHIFT_LABELS[swap.original_shift]?.color)}>
                    <Clock className="w-3.5 h-3.5" />
                    {SHIFT_LABELS[swap.original_shift]?.label}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-2">{swap.reason}</p>
                {swap.claimed_by && (
                  <p className="text-xs text-zinc-400 mt-1">Claimed by <span className="text-white font-medium">{swap.claimed_by}</span></p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full border capitalize', STATUS_BADGES[swap.status])}>
                  {swap.status}
                </span>
                {swap.status === 'open' && (
                  <button onClick={() => claim(swap)} className="flex items-center gap-1 text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-lg hover:bg-blue-500/20 transition">
                    <UserCheck className="w-3.5 h-3.5" /> Claim Shift
                  </button>
                )}
                {swap.status === 'claimed' && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => decide(swap, 'approve')} className="text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition">Approve</button>
                    <button onClick={() => decide(swap, 'deny')} className="text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition">Deny</button>
                  </div>
                )}
                <button onClick={() => del(swap)} className="p-1 text-zinc-500 hover:text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Swap Request"
        maxWidth="lg"
        footer={
          <>
            <GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={submit}>Post Request</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Your Name</FieldLabel>
            <TextInput value={form.requester_name} onChange={(v) => setForm({ ...form, requester_name: v })} />
          </div>
          <div>
            <FieldLabel>Role</FieldLabel>
            <Select value={form.requester_role} onChange={(v) => setForm({ ...form, requester_role: v })} options={ROLES.map((r) => ({ label: r, value: r }))} />
          </div>
          <div>
            <FieldLabel>Date</FieldLabel>
            <TextInput value={form.original_date} onChange={(v) => setForm({ ...form, original_date: v })} type="date" />
          </div>
          <div>
            <FieldLabel>Shift</FieldLabel>
            <Select
              value={form.original_shift}
              onChange={(v) => setForm({ ...form, original_shift: v as SwapRequest['original_shift'] })}
              options={[{ label: 'Morning', value: 'morning' }, { label: 'Afternoon', value: 'afternoon' }, { label: 'Evening', value: 'evening' }]}
            />
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Reason</FieldLabel>
            <TextArea value={form.reason} onChange={(v) => setForm({ ...form, reason: v })} placeholder="Why do you need this shift covered?" />
          </div>
          <div>
            <FieldLabel>Urgency</FieldLabel>
            <Select
              value={form.urgency}
              onChange={(v) => setForm({ ...form, urgency: v as SwapRequest['urgency'] })}
              options={[{ label: 'Normal', value: 'normal' }, { label: 'Urgent', value: 'urgent' }]}
            />
          </div>
        </div>
      </EditModal>
    </div>
  );
}
