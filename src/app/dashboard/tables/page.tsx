'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { useCrudApi } from '@/hooks/use-crud-api';
import {
  EditModal, FieldLabel, TextInput, Select, PrimaryButton, GhostButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { LayoutGrid, Plus, Pencil, Trash2, Users, Clock, DollarSign, CheckCircle2 } from 'lucide-react';

type Status = 'open' | 'seated' | 'reserved' | 'dirty';

interface Table {
  id: string;
  number: number;
  section: string;
  seats: number;
  status: Status;
  currentParty?: number;
  server?: string;
  seatedAt?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const INITIAL: Table[] = [
  { id: 't1', number: 1, section: 'Main', seats: 2, status: 'seated', currentParty: 2, server: 'Marco', seatedAt: '7:15 PM' },
  { id: 't2', number: 2, section: 'Main', seats: 2, status: 'open' },
  { id: 't3', number: 3, section: 'Main', seats: 4, status: 'dirty' },
  { id: 't4', number: 4, section: 'Main', seats: 4, status: 'seated', currentParty: 3, server: 'Emma', seatedAt: '7:30 PM' },
  { id: 't5', number: 5, section: 'Main', seats: 4, status: 'reserved' },
  { id: 't6', number: 6, section: 'Patio', seats: 2, status: 'seated', currentParty: 2, server: 'Marco', seatedAt: '6:45 PM' },
  { id: 't7', number: 7, section: 'Patio', seats: 4, status: 'open' },
  { id: 't8', number: 8, section: 'Patio', seats: 6, status: 'reserved' },
  { id: 't9', number: 9, section: 'Bar', seats: 2, status: 'seated', currentParty: 1, server: 'Sarah', seatedAt: '8:00 PM' },
  { id: 't10', number: 10, section: 'Bar', seats: 2, status: 'open' },
  { id: 't11', number: 11, section: 'Private', seats: 8, status: 'reserved' },
  { id: 't12', number: 12, section: 'Private', seats: 12, status: 'open' },
];

const statusBadge = (s: Status) => ({
  open: 'bg-green-500/10 text-green-400 border-green-500/30',
  seated: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  reserved: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  dirty: 'bg-red-500/10 text-red-400 border-red-500/30',
}[s]);

function empty(): Omit<Table, 'id'> {
  return { number: 1, section: 'Main', seats: 2, status: 'open' };
}

export default function TablesPage() {
  const { items: tables, add, update, remove } = useCrudApi<Table>('/api/floor-tables');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty());

  const open = tables.filter(t => t.status === 'open').length;
  const seated = tables.filter(t => t.status === 'seated').length;
  const reserved = tables.filter(t => t.status === 'reserved').length;
  const totalCovers = tables.filter(t => t.status === 'seated').reduce((s, t) => s + (t.currentParty || 0), 0);
  const sections = Array.from(new Set(tables.map(t => t.section)));

  const openAdd = () => { setEditingId(null); setForm(empty()); setModalOpen(true); };
  const openEdit = (t: Table) => {
    setEditingId(t.id);
    setForm({ number: t.number, section: t.section, seats: t.seats, status: t.status, currentParty: t.currentParty, server: t.server, seatedAt: t.seatedAt });
    setModalOpen(true);
  };
  const save = () => {
    if (editingId) { update(editingId, form); toast.success('Table updated'); }
    else { add({ ...form }); toast.success('Table added'); }
    setModalOpen(false);
  };
  const del = (t: Table) => {
    if (!confirm(`Delete Table ${t.number}?`)) return;
    remove(t.id); toast.success('Deleted');
  };
  const setStatus = (t: Table, s: Status) => {
    update(t.id, { status: s });
    toast.success(`Table ${t.number} → ${s}`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <LayoutGrid className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Tables</h1>
            <p className="text-sm text-zinc-500">Floor plan and live table status</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg text-sm font-medium">
          <Plus size={16} /> Add Table
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Open Tables" value={open} icon={<CheckCircle2 size={18} />} />
        <MetricCard title="Currently Seated" value={seated} icon={<Users size={18} />} />
        <MetricCard title="Reserved" value={reserved} icon={<Clock size={18} />} />
        <MetricCard title="Active Covers" value={totalCovers} icon={<DollarSign size={18} />} />
      </div>

      {sections.map(section => (
        <div key={section} className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">{section}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {tables.filter(t => t.section === section).map(t => (
              <div key={t.id} className={`border rounded-lg p-3 ${statusBadge(t.status)}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-lg font-bold text-white">Table {t.number}</div>
                  <div className="flex gap-0.5">
                    <button onClick={() => openEdit(t)} className="p-1 text-zinc-400 hover:text-white"><Pencil size={11} /></button>
                    <button onClick={() => del(t)} className="p-1 text-zinc-400 hover:text-red-400"><Trash2 size={11} /></button>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs mb-2">
                  <Users size={12} /> {t.seats} seats
                </div>
                {t.status === 'seated' && t.currentParty && (
                  <div className="text-[10px] text-zinc-400 mb-2">
                    Party of {t.currentParty} · {t.server} · {t.seatedAt}
                  </div>
                )}
                <select
                  value={t.status}
                  onChange={(e) => setStatus(t, e.target.value as Status)}
                  className="w-full mt-1 bg-seat-black border border-seat-border rounded px-1.5 py-1 text-[10px] text-white"
                >
                  <option value="open">Open</option>
                  <option value="seated">Seated</option>
                  <option value="reserved">Reserved</option>
                  <option value="dirty">Dirty</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      ))}

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? `Edit Table ${form.number}` : 'Add Table'}
        footer={<><GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton><PrimaryButton onClick={save}>{editingId ? 'Save' : 'Add'}</PrimaryButton></>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><FieldLabel>Table Number</FieldLabel><TextInput type="number" value={form.number} onChange={(v) => setForm(f => ({ ...f, number: parseInt(v) || 1 }))} /></div>
            <div><FieldLabel>Seats</FieldLabel><TextInput type="number" value={form.seats} onChange={(v) => setForm(f => ({ ...f, seats: parseInt(v) || 2 }))} /></div>
          </div>
          <div><FieldLabel>Section</FieldLabel><TextInput value={form.section} onChange={(v) => setForm(f => ({ ...f, section: v }))} placeholder="Main, Patio, Bar..." /></div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <Select value={form.status} onChange={(v) => setForm(f => ({ ...f, status: v as Status }))} options={[
              { label: 'Open', value: 'open' },
              { label: 'Seated', value: 'seated' },
              { label: 'Reserved', value: 'reserved' },
              { label: 'Dirty', value: 'dirty' },
            ]} />
          </div>
          {form.status === 'seated' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><FieldLabel>Party Size</FieldLabel><TextInput type="number" value={form.currentParty || 0} onChange={(v) => setForm(f => ({ ...f, currentParty: parseInt(v) || 0 }))} /></div>
                <div><FieldLabel>Server</FieldLabel><TextInput value={form.server || ''} onChange={(v) => setForm(f => ({ ...f, server: v }))} /></div>
              </div>
              <div><FieldLabel>Seated At</FieldLabel><TextInput value={form.seatedAt || ''} onChange={(v) => setForm(f => ({ ...f, seatedAt: v }))} placeholder="7:15 PM" /></div>
            </>
          )}
        </div>
      </EditModal>
    </div>
  );
}
