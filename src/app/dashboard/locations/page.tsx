'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal, FieldLabel, TextInput, Select, PrimaryButton, GhostButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { MapPin, Plus, Pencil, Trash2, Users, DollarSign, Building2 } from 'lucide-react';

interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  managerName: string;
  seats: number;
  monthlyRevenue: number;
  status: 'active' | 'opening-soon' | 'closed';
}

const INITIAL: Location[] = [
  { id: 'L1', name: 'Downtown', address: '240 Market St', city: 'San Francisco', phone: '(415) 555-0100', managerName: 'Marco Silva', seats: 120, monthlyRevenue: 487500, status: 'active' },
  { id: 'L2', name: 'Westside', address: '1840 Lombard St', city: 'San Francisco', phone: '(415) 555-0200', managerName: 'Sarah Chen', seats: 80, monthlyRevenue: 392100, status: 'active' },
  { id: 'L3', name: 'Uptown', address: '2100 Fillmore St', city: 'San Francisco', phone: '(415) 555-0300', managerName: 'James Park', seats: 140, monthlyRevenue: 521800, status: 'active' },
  { id: 'L4', name: 'Southbank', address: '500 King St', city: 'San Francisco', phone: '(415) 555-0400', managerName: 'Lisa Rodriguez', seats: 90, monthlyRevenue: 342900, status: 'active' },
  { id: 'L5', name: 'Oakland', address: '1200 Broadway', city: 'Oakland', phone: '(510) 555-0100', managerName: '—', seats: 100, monthlyRevenue: 0, status: 'opening-soon' },
];

const statusColor = (s: Location['status']) => ({
  'active': 'bg-green-500/10 text-green-400 border-green-500/30',
  'opening-soon': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'closed': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
}[s]);

function empty(): Omit<Location, 'id'> {
  return { name: '', address: '', city: '', phone: '', managerName: '', seats: 0, monthlyRevenue: 0, status: 'active' };
}

export default function LocationsPage() {
  const { items: locations, add, update, remove } = useCrudList<Location>('seatsignals_locations', INITIAL);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty());

  const active = locations.filter(l => l.status === 'active').length;
  const totalRev = locations.reduce((s, l) => s + l.monthlyRevenue, 0);
  const totalSeats = locations.reduce((s, l) => s + l.seats, 0);

  const openAdd = () => { setEditingId(null); setForm(empty()); setModalOpen(true); };
  const openEdit = (l: Location) => { setEditingId(l.id); const { id: _id, ...rest } = l; void _id; setForm(rest); setModalOpen(true); };
  const save = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (editingId) { update(editingId, form); toast.success('Location updated'); }
    else { add({ id: `L${Date.now()}`, ...form }); toast.success('Location added'); }
    setModalOpen(false);
  };
  const del = (l: Location) => {
    if (!confirm(`Delete ${l.name}?`)) return;
    remove(l.id); toast.success('Deleted');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Locations</h1>
            <p className="text-sm text-zinc-500">Manage all your restaurants in one place</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg text-sm font-medium">
          <Plus size={16} /> Add Location
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Active Locations" value={active} icon={<Building2 size={18} />} />
        <MetricCard title="Total Seats" value={totalSeats} icon={<Users size={18} />} />
        <MetricCard title="Combined Revenue" value={`$${(totalRev / 1000).toFixed(0)}K`} icon={<DollarSign size={18} />} />
        <MetricCard title="All Locations" value={locations.length} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map(l => (
          <div key={l.id} className="bg-seat-card border border-seat-border rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-white font-semibold text-lg">{l.name}</div>
                <div className="text-xs text-zinc-500 mt-1">{l.address}, {l.city}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{l.phone}</div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${statusColor(l.status)}`}>{l.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs mt-3 pt-3 border-t border-seat-border/50">
              <div>
                <div className="text-zinc-500">Manager</div>
                <div className="text-white mt-0.5">{l.managerName}</div>
              </div>
              <div>
                <div className="text-zinc-500">Seats</div>
                <div className="text-white mt-0.5">{l.seats}</div>
              </div>
              <div className="col-span-2">
                <div className="text-zinc-500">Monthly Revenue</div>
                <div className="text-white font-semibold mt-0.5">${l.monthlyRevenue.toLocaleString()}</div>
              </div>
            </div>
            <div className="flex justify-end gap-1 mt-3 pt-3 border-t border-seat-border/50">
              <button onClick={() => openEdit(l)} className="p-1.5 text-zinc-500 hover:text-white rounded"><Pencil size={14} /></button>
              <button onClick={() => del(l)} className="p-1.5 text-zinc-500 hover:text-red-400 rounded"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Location' : 'Add Location'}
        maxWidth="lg"
        footer={<><GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton><PrimaryButton onClick={save}>{editingId ? 'Save' : 'Add'}</PrimaryButton></>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><FieldLabel>Name</FieldLabel><TextInput value={form.name} onChange={(v) => setForm(f => ({ ...f, name: v }))} /></div>
            <div>
              <FieldLabel>Status</FieldLabel>
              <Select value={form.status} onChange={(v) => setForm(f => ({ ...f, status: v as Location['status'] }))} options={[
                { label: 'Active', value: 'active' }, { label: 'Opening Soon', value: 'opening-soon' }, { label: 'Closed', value: 'closed' },
              ]} />
            </div>
            <div className="col-span-2"><FieldLabel>Address</FieldLabel><TextInput value={form.address} onChange={(v) => setForm(f => ({ ...f, address: v }))} /></div>
            <div><FieldLabel>City</FieldLabel><TextInput value={form.city} onChange={(v) => setForm(f => ({ ...f, city: v }))} /></div>
            <div><FieldLabel>Phone</FieldLabel><TextInput value={form.phone} onChange={(v) => setForm(f => ({ ...f, phone: v }))} /></div>
            <div><FieldLabel>Manager</FieldLabel><TextInput value={form.managerName} onChange={(v) => setForm(f => ({ ...f, managerName: v }))} /></div>
            <div><FieldLabel>Seats</FieldLabel><TextInput type="number" value={form.seats} onChange={(v) => setForm(f => ({ ...f, seats: parseInt(v) || 0 }))} /></div>
            <div className="col-span-2"><FieldLabel>Monthly Revenue</FieldLabel><TextInput type="number" value={form.monthlyRevenue} onChange={(v) => setForm(f => ({ ...f, monthlyRevenue: parseFloat(v) || 0 }))} /></div>
          </div>
        </div>
      </EditModal>
    </div>
  );
}
