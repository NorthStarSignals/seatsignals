'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { useCrudApi } from '@/hooks/use-crud-api';
import {
  EditModal, FieldLabel, TextInput, Select, PrimaryButton, GhostButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { ListOrdered, Plus, Clock, Users, MessageSquare, CheckCircle2, X } from 'lucide-react';

type Status = 'waiting' | 'notified' | 'seated' | 'cancelled';

interface Party {
  id: string;
  name: string;
  size: number;
  phone: string;
  quotedWait: number;
  addedAt: string;
  status: Status;
  notes: string;
}

const now = () => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const INITIAL: Party[] = [
  { id: 'w1', name: 'Martinez', size: 4, phone: '(415) 555-0102', quotedWait: 25, addedAt: '7:18 PM', status: 'waiting', notes: 'Window table requested' },
  { id: 'w2', name: 'Chen', size: 2, phone: '(415) 555-0187', quotedWait: 15, addedAt: '7:25 PM', status: 'notified', notes: '' },
  { id: 'w3', name: 'Johnson', size: 6, phone: '(415) 555-0214', quotedWait: 45, addedAt: '7:30 PM', status: 'waiting', notes: 'Birthday party' },
  { id: 'w4', name: 'Patel', size: 3, phone: '(415) 555-0340', quotedWait: 20, addedAt: '7:32 PM', status: 'waiting', notes: '' },
  { id: 'w5', name: 'Williams', size: 2, phone: '(415) 555-0411', quotedWait: 15, addedAt: '7:42 PM', status: 'waiting', notes: '' },
];

function empty(): Omit<Party, 'id'> {
  return { name: '', size: 2, phone: '', quotedWait: 15, addedAt: now(), status: 'waiting', notes: '' };
}

const statusBadge = (s: Status) => ({
  waiting: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  notified: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  seated: 'bg-green-500/10 text-green-400 border-green-500/30',
  cancelled: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
}[s]);

export default function WaitlistPage() {
  const { items: parties, add, update, remove } = useCrudApi<Party>('/api/waitlist-list');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty());

  const active = parties.filter(p => p.status === 'waiting' || p.status === 'notified');
  const avgWait = active.length ? Math.round(active.reduce((s, p) => s + p.quotedWait, 0) / active.length) : 0;
  const totalGuests = active.reduce((s, p) => s + p.size, 0);

  const openAdd = () => { setForm(empty()); setModalOpen(true); };
  const save = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    add({ ...form });
    toast.success(`${form.name} added to waitlist`);
    setModalOpen(false);
  };
  const notify = (p: Party) => {
    update(p.id, { status: 'notified' });
    toast.success(`SMS sent to ${p.name}`);
  };
  const seat = (p: Party) => {
    update(p.id, { status: 'seated' });
    toast.success(`${p.name} seated`);
  };
  const cancel = (p: Party) => {
    update(p.id, { status: 'cancelled' });
    toast.success('Cancelled');
  };
  const del = (p: Party) => {
    if (!confirm('Remove from list?')) return;
    remove(p.id); toast.success('Removed');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <ListOrdered className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Waitlist</h1>
            <p className="text-sm text-zinc-500">Live guest queue with auto-text notifications</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg text-sm font-medium">
          <Plus size={16} /> Add Party
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Active Parties" value={active.length} icon={<Users size={18} />} />
        <MetricCard title="Guests Waiting" value={totalGuests} icon={<Users size={18} />} />
        <MetricCard title="Avg Quoted Wait" value={`${avgWait}m`} icon={<Clock size={18} />} />
        <MetricCard title="Seated Today" value={parties.filter(p => p.status === 'seated').length} icon={<CheckCircle2 size={18} />} />
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Current Queue</h3>
        <div className="space-y-2">
          {parties.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 p-3 bg-seat-black border border-seat-border/50 rounded-lg">
              <div className="w-8 h-8 rounded-lg bg-seat-red/10 text-seat-red flex items-center justify-center font-bold">{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-medium">{p.name}</span>
                  <span className="text-xs text-zinc-500">· party of {p.size}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] border ${statusBadge(p.status)}`}>{p.status}</span>
                </div>
                <div className="text-xs text-zinc-500 flex items-center gap-3 mt-0.5">
                  <span><Clock size={10} className="inline mr-1" /> Added {p.addedAt}, {p.quotedWait}m quoted</span>
                  {p.phone && <span>{p.phone}</span>}
                </div>
                {p.notes && <div className="text-xs text-zinc-400 mt-1">{p.notes}</div>}
              </div>
              <div className="flex items-center gap-1">
                {p.status === 'waiting' && (
                  <button onClick={() => notify(p)} className="p-2 text-zinc-400 hover:text-blue-400 rounded" title="Notify by SMS">
                    <MessageSquare size={14} />
                  </button>
                )}
                {(p.status === 'waiting' || p.status === 'notified') && (
                  <button onClick={() => seat(p)} className="p-2 text-zinc-400 hover:text-green-400 rounded" title="Seat now">
                    <CheckCircle2 size={14} />
                  </button>
                )}
                <button onClick={() => cancel(p)} className="p-2 text-zinc-400 hover:text-red-400 rounded" title="Cancel">
                  <X size={14} />
                </button>
                <button onClick={() => del(p)} className="p-2 text-zinc-500 hover:text-zinc-300 rounded" title="Remove">
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
          {parties.length === 0 && <div className="text-sm text-zinc-500 text-center py-8">No parties on the waitlist.</div>}
        </div>
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add to Waitlist"
        footer={<><GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton><PrimaryButton onClick={save}>Add</PrimaryButton></>}
      >
        <div className="space-y-4">
          <div><FieldLabel>Guest Name</FieldLabel><TextInput value={form.name} onChange={(v) => setForm(f => ({ ...f, name: v }))} placeholder="Smith" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><FieldLabel>Party Size</FieldLabel><TextInput type="number" value={form.size} onChange={(v) => setForm(f => ({ ...f, size: parseInt(v) || 1 }))} /></div>
            <div><FieldLabel>Quoted Wait (min)</FieldLabel><TextInput type="number" value={form.quotedWait} onChange={(v) => setForm(f => ({ ...f, quotedWait: parseInt(v) || 0 }))} /></div>
          </div>
          <div><FieldLabel>Phone</FieldLabel><TextInput type="tel" value={form.phone} onChange={(v) => setForm(f => ({ ...f, phone: v }))} placeholder="(415) 555-0100" /></div>
          <div><FieldLabel>Notes</FieldLabel><TextInput value={form.notes} onChange={(v) => setForm(f => ({ ...f, notes: v }))} placeholder="Seating preferences, occasion" /></div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <Select value={form.status} onChange={(v) => setForm(f => ({ ...f, status: v as Status }))} options={[
              { label: 'Waiting', value: 'waiting' },
              { label: 'Notified', value: 'notified' },
              { label: 'Seated', value: 'seated' },
            ]} />
          </div>
        </div>
      </EditModal>
    </div>
  );
}
