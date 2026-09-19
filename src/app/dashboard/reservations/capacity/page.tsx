'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal, FieldLabel, TextInput, PrimaryButton, GhostButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { Maximize2, Pencil, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Section {
  id: string;
  name: string;
  capacity: number;
  currentUtilization: number;
}

const INITIAL: Section[] = [
  { id: 'sec1', name: 'Main Dining', capacity: 80, currentUtilization: 62 },
  { id: 'sec2', name: 'Bar', capacity: 24, currentUtilization: 18 },
  { id: 'sec3', name: 'Patio', capacity: 40, currentUtilization: 34 },
  { id: 'sec4', name: 'Private Room', capacity: 20, currentUtilization: 0 },
];

const hourly = [
  { hour: '5pm', booked: 45, walkIns: 12, capacity: 164 },
  { hour: '6pm', booked: 72, walkIns: 24, capacity: 164 },
  { hour: '7pm', booked: 110, walkIns: 38, capacity: 164 },
  { hour: '8pm', booked: 130, walkIns: 20, capacity: 164 },
  { hour: '9pm', booked: 96, walkIns: 16, capacity: 164 },
  { hour: '10pm', booked: 52, walkIns: 8, capacity: 164 },
];

export default function CapacityPage() {
  const { items: sections, update } = useCrudList<Section>('seatsignals_capacity', INITIAL);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCapacity, setNewCapacity] = useState(0);

  const totalCap = sections.reduce((s, sec) => s + sec.capacity, 0);
  const totalUsed = sections.reduce((s, sec) => s + sec.currentUtilization, 0);
  const utilizationPct = Math.round((totalUsed / totalCap) * 100);

  const openEdit = (s: Section) => { setEditingId(s.id); setNewCapacity(s.capacity); setModalOpen(true); };
  const save = () => {
    if (editingId) { update(editingId, { capacity: newCapacity }); toast.success('Capacity updated'); }
    setModalOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
          <Maximize2 className="w-5 h-5 text-seat-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Capacity</h1>
          <p className="text-sm text-zinc-500">How booked every section is, hour by hour</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total Capacity" value={totalCap} icon={<Users size={18} />} />
        <MetricCard title="Currently Seated" value={totalUsed} />
        <MetricCard title="Utilization" value={`${utilizationPct}%`} />
        <MetricCard title="Peak Hour" value="8pm" subtitle="130 booked" />
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Hourly Coverage (Tonight)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={hourly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
            <XAxis dataKey="hour" stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
            <YAxis stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="booked" stackId="a" fill="#E11D48" name="Reservations" />
            <Bar dataKey="walkIns" stackId="a" fill="#3B82F6" name="Walk-Ins" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Sections</h3>
        <div className="space-y-3">
          {sections.map(s => {
            const pct = s.capacity ? (s.currentUtilization / s.capacity) * 100 : 0;
            return (
              <div key={s.id} className="p-4 bg-seat-black border border-seat-border/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-medium">{s.name}</span>
                    <span className="text-xs text-zinc-500">{s.currentUtilization} / {s.capacity}</span>
                  </div>
                  <button onClick={() => openEdit(s)} className="p-1.5 text-zinc-500 hover:text-white rounded"><Pencil size={14} /></button>
                </div>
                <div className="h-2 bg-seat-border rounded-full overflow-hidden">
                  <div className={`h-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-seat-red'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                <div className="text-xs text-zinc-500 mt-1.5">{pct.toFixed(0)}% utilized</div>
              </div>
            );
          })}
        </div>
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Edit Capacity"
        footer={<><GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton><PrimaryButton onClick={save}>Save</PrimaryButton></>}
      >
        <div><FieldLabel>Maximum seats</FieldLabel><TextInput type="number" value={newCapacity} onChange={(v) => setNewCapacity(parseInt(v) || 0)} /></div>
      </EditModal>
    </div>
  );
}
