'use client';

import { useMemo, useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { formatCurrency } from '@/lib/utils';
import {
  DollarSign, Users, TrendingUp, Plus, Pencil, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal, FieldLabel, TextInput, Select, PrimaryButton, GhostButton, DangerButton,
} from '@/components/dashboard/edit-modal';

interface TipEntry {
  id: string;
  date: string;
  employee: string;
  role: string;
  amount_cash: number;
  amount_card: number;
  hours_worked: number;
  notes: string;
}

const ROLES = ['Server', 'Bartender', 'Host', 'Support'];

const INITIAL: TipEntry[] = [
  { id: 't1', date: new Date().toISOString().split('T')[0], employee: 'Marco Silva', role: 'Server', amount_cash: 45, amount_card: 180, hours_worked: 6, notes: '' },
  { id: 't2', date: new Date().toISOString().split('T')[0], employee: 'Sarah Chen', role: 'Bartender', amount_cash: 60, amount_card: 220, hours_worked: 7, notes: '' },
  { id: 't3', date: new Date(Date.now() - 86400000).toISOString().split('T')[0], employee: 'Emma Wilson', role: 'Server', amount_cash: 38, amount_card: 195, hours_worked: 6, notes: '' },
];

function emptyEntry(): TipEntry {
  return {
    id: '',
    date: new Date().toISOString().split('T')[0],
    employee: '',
    role: 'Server',
    amount_cash: 0,
    amount_card: 0,
    hours_worked: 0,
    notes: '',
  };
}

export default function TipsPage() {
  const { items: entries, add, update, remove } = useCrudList<TipEntry>('seatsignals_tips', INITIAL);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TipEntry | null>(null);
  const [form, setForm] = useState<TipEntry>(emptyEntry());
  const [dateFilter, setDateFilter] = useState('');

  const filtered = useMemo(
    () => dateFilter ? entries.filter((e) => e.date === dateFilter) : entries,
    [entries, dateFilter],
  );
  const sorted = useMemo(() => [...filtered].sort((a, b) => b.date.localeCompare(a.date)), [filtered]);

  const stats = useMemo(() => {
    const total = filtered.reduce((s, e) => s + e.amount_cash + e.amount_card, 0);
    const totalCash = filtered.reduce((s, e) => s + e.amount_cash, 0);
    const totalCard = filtered.reduce((s, e) => s + e.amount_card, 0);
    const uniqueEmp = new Set(filtered.map((e) => e.employee)).size;
    const totalHours = filtered.reduce((s, e) => s + e.hours_worked, 0);
    return {
      total,
      totalCash,
      totalCard,
      uniqueEmp,
      per_hour: totalHours ? total / totalHours : 0,
    };
  }, [filtered]);

  const openAdd = () => { setEditing(null); setForm(emptyEntry()); setModalOpen(true); };
  const openEdit = (e: TipEntry) => { setEditing(e); setForm(e); setModalOpen(true); };
  const save = () => {
    if (!form.employee.trim()) { toast.error('Employee required'); return; }
    if (editing) { update(editing.id, form); toast.success('Tip updated'); }
    else { add({ ...form, id: Date.now().toString() }); toast.success('Tip recorded'); }
    setModalOpen(false);
  };
  const del = (e: TipEntry) => {
    if (!confirm(`Delete tip entry for ${e.employee}?`)) return;
    remove(e.id);
    toast.success('Entry deleted');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Tip Tracking</h1>
            <p className="text-sm text-zinc-500">Record individual tip entries per employee</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 transition">
          <Plus size={16} /> Add Tip Entry
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total Tips" value={formatCurrency(stats.total)} icon={<DollarSign size={18} />} />
        <MetricCard title="Cash" value={formatCurrency(stats.totalCash)} icon={<DollarSign size={18} />} />
        <MetricCard title="Card" value={formatCurrency(stats.totalCard)} icon={<TrendingUp size={18} />} />
        <MetricCard title="Avg / Hour" value={formatCurrency(stats.per_hour)} icon={<Users size={18} />} />
      </div>

      <div className="flex items-center gap-3">
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-seat-red" />
        {dateFilter && <button onClick={() => setDateFilter('')} className="text-xs text-zinc-400 hover:text-white">Clear</button>}
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-seat-border">
              <th className="text-left px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Date</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Employee</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Role</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Hours</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Cash</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Card</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Total</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((e) => (
              <tr key={e.id} className="border-b border-seat-border/50 hover:bg-zinc-800/30">
                <td className="px-4 py-3 text-zinc-300">{e.date}</td>
                <td className="px-4 py-3 text-white font-medium">{e.employee}</td>
                <td className="px-4 py-3 text-zinc-400">{e.role}</td>
                <td className="px-4 py-3 text-right text-zinc-300">{e.hours_worked}h</td>
                <td className="px-4 py-3 text-right text-zinc-300">{formatCurrency(e.amount_cash)}</td>
                <td className="px-4 py-3 text-right text-zinc-300">{formatCurrency(e.amount_card)}</td>
                <td className="px-4 py-3 text-right text-emerald-400 font-semibold">{formatCurrency(e.amount_cash + e.amount_card)}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(e)} className="p-1 text-zinc-400 hover:text-white"><Pencil size={14} /></button>
                  <button onClick={() => del(e)} className="p-1 text-zinc-500 hover:text-red-400 ml-1"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-zinc-500">No tip entries</td></tr>}
          </tbody>
        </table>
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Tip Entry' : 'Add Tip Entry'}
        maxWidth="lg"
        footer={
          <>
            <GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton>
            {editing && <DangerButton onClick={() => { del(editing); setModalOpen(false); }}>Delete</DangerButton>}
            <PrimaryButton onClick={save}>{editing ? 'Save' : 'Add'}</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Date</FieldLabel>
            <TextInput value={form.date} onChange={(v) => setForm({ ...form, date: v })} type="date" />
          </div>
          <div>
            <FieldLabel>Employee</FieldLabel>
            <TextInput value={form.employee} onChange={(v) => setForm({ ...form, employee: v })} />
          </div>
          <div>
            <FieldLabel>Role</FieldLabel>
            <Select value={form.role} onChange={(v) => setForm({ ...form, role: v })} options={ROLES.map((r) => ({ label: r, value: r }))} />
          </div>
          <div>
            <FieldLabel>Hours Worked</FieldLabel>
            <TextInput value={form.hours_worked} onChange={(v) => setForm({ ...form, hours_worked: Number(v) || 0 })} type="number" />
          </div>
          <div>
            <FieldLabel>Cash Tips ($)</FieldLabel>
            <TextInput value={form.amount_cash} onChange={(v) => setForm({ ...form, amount_cash: Number(v) || 0 })} type="number" />
          </div>
          <div>
            <FieldLabel>Card Tips ($)</FieldLabel>
            <TextInput value={form.amount_card} onChange={(v) => setForm({ ...form, amount_card: Number(v) || 0 })} type="number" />
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Notes</FieldLabel>
            <TextInput value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
          </div>
        </div>
      </EditModal>
    </div>
  );
}
