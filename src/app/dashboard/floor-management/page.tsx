'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal, FieldLabel, TextInput, Select, PrimaryButton, GhostButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { LayoutGrid, Plus, Pencil, Trash2, Users, Maximize2 } from 'lucide-react';

interface Section {
  id: string;
  name: string;
  tables: number;
  seats: number;
  serverAssigned: string;
}

const INITIAL: Section[] = [
  { id: 's1', name: 'Main Dining', tables: 16, seats: 80, serverAssigned: 'Marco Silva' },
  { id: 's2', name: 'Patio', tables: 10, seats: 40, serverAssigned: 'Emma Wilson' },
  { id: 's3', name: 'Bar', tables: 6, seats: 24, serverAssigned: 'Sarah Chen' },
  { id: 's4', name: 'Private Room', tables: 2, seats: 20, serverAssigned: 'David Kim' },
];

function empty(): Omit<Section, 'id'> {
  return { name: '', tables: 0, seats: 0, serverAssigned: '' };
}

const SERVERS = ['Marco Silva', 'Emma Wilson', 'Sarah Chen', 'David Kim', 'Lisa Rodriguez', 'Unassigned'];

export default function FloorManagementPage() {
  const { items: sections, add, update, remove } = useCrudList<Section>('seatsignals_floor_sections', INITIAL);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty());

  const totalTables = sections.reduce((s, sec) => s + sec.tables, 0);
  const totalSeats = sections.reduce((s, sec) => s + sec.seats, 0);

  const openAdd = () => { setEditingId(null); setForm(empty()); setModalOpen(true); };
  const openEdit = (s: Section) => { setEditingId(s.id); const { id: _id, ...rest } = s; void _id; setForm(rest); setModalOpen(true); };
  const save = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (editingId) { update(editingId, form); toast.success('Section updated'); }
    else { add({ id: `s${Date.now()}`, ...form }); toast.success('Section added'); }
    setModalOpen(false);
  };
  const del = (s: Section) => {
    if (!confirm(`Delete "${s.name}"?`)) return;
    remove(s.id); toast.success('Deleted');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <LayoutGrid className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Floor Management</h1>
            <p className="text-sm text-zinc-500">Sections, table layouts, and server assignments</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg text-sm font-medium">
          <Plus size={16} /> New Section
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Sections" value={sections.length} icon={<LayoutGrid size={18} />} />
        <MetricCard title="Total Tables" value={totalTables} icon={<Maximize2 size={18} />} />
        <MetricCard title="Total Seats" value={totalSeats} icon={<Users size={18} />} />
        <MetricCard title="Avg per Section" value={Math.round(totalSeats / Math.max(1, sections.length))} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sections.map(s => (
          <div key={s.id} className="bg-seat-card border border-seat-border rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-white font-semibold text-lg">{s.name}</h3>
              <div className="flex gap-1">
                <button onClick={() => openEdit(s)} className="p-1.5 text-zinc-500 hover:text-white rounded"><Pencil size={13} /></button>
                <button onClick={() => del(s)} className="p-1.5 text-zinc-500 hover:text-red-400 rounded"><Trash2 size={13} /></button>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-zinc-500">Tables</span><span className="text-white">{s.tables}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Seats</span><span className="text-white">{s.seats}</span></div>
              <div className="pt-2 border-t border-seat-border/50">
                <div className="text-[10px] text-zinc-500 uppercase mb-1">Assigned Server</div>
                <div className="text-white">{s.serverAssigned}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Section' : 'New Section'}
        footer={<><GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton><PrimaryButton onClick={save}>{editingId ? 'Save' : 'Create'}</PrimaryButton></>}
      >
        <div className="space-y-4">
          <div><FieldLabel>Section Name</FieldLabel><TextInput value={form.name} onChange={(v) => setForm(f => ({ ...f, name: v }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><FieldLabel>Tables</FieldLabel><TextInput type="number" value={form.tables} onChange={(v) => setForm(f => ({ ...f, tables: parseInt(v) || 0 }))} /></div>
            <div><FieldLabel>Seats</FieldLabel><TextInput type="number" value={form.seats} onChange={(v) => setForm(f => ({ ...f, seats: parseInt(v) || 0 }))} /></div>
          </div>
          <div>
            <FieldLabel>Assigned Server</FieldLabel>
            <Select value={form.serverAssigned} onChange={(v) => setForm(f => ({ ...f, serverAssigned: v }))} options={SERVERS.map(s => ({ label: s, value: s }))} />
          </div>
        </div>
      </EditModal>
    </div>
  );
}
