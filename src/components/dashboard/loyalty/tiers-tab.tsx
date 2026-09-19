'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { useCrudApi } from '@/hooks/use-crud-api';
import {
  EditModal, FieldLabel, TextInput, TextArea, PrimaryButton, GhostButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { Crown, Plus, Pencil, Trash2, Users } from 'lucide-react';

interface Tier {
  id: string;
  name: string;
  minSpend: number;
  earnMultiplier: number;
  perks: string;
  color: string;
  members: number;
}

function empty(): Omit<Tier, 'id'> {
  return { name: '', minSpend: 0, earnMultiplier: 1.0, perks: '', color: '#E11D48', members: 0 };
}

export function TiersTab() {
  const { items: tiers, add, update, remove } = useCrudApi<Tier>('/api/loyalty-tiers');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty());

  const totalMembers = tiers.reduce((s, t) => s + t.members, 0);

  const openAdd = () => { setEditingId(null); setForm(empty()); setModalOpen(true); };
  const openEdit = (t: Tier) => {
    setEditingId(t.id);
    setForm({ name: t.name, minSpend: t.minSpend, earnMultiplier: t.earnMultiplier, perks: t.perks, color: t.color, members: t.members });
    setModalOpen(true);
  };
  const save = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (editingId) { update(editingId, form); toast.success('Tier updated'); }
    else { add({ ...form }); toast.success('Tier added'); }
    setModalOpen(false);
  };
  const del = (t: Tier) => {
    if (!confirm(`Delete "${t.name}"?`)) return;
    remove(t.id); toast.success('Deleted');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Loyalty Tiers</h2>
          <p className="text-sm text-zinc-500">Configure the ladder your members climb</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg text-sm font-medium">
          <Plus size={16} /> Add Tier
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total Members" value={totalMembers.toLocaleString()} icon={<Users size={18} />} />
        <MetricCard title="Tier Levels" value={tiers.length} />
        <MetricCard title="Top Tier Members" value={tiers[tiers.length - 1]?.members || 0} />
        <MetricCard title="Avg Multiplier" value={tiers.length ? (tiers.reduce((s, t) => s + t.earnMultiplier, 0) / tiers.length).toFixed(2) + 'x' : '—'} />
      </div>

      <div className="space-y-3">
        {[...tiers].sort((a, b) => a.minSpend - b.minSpend).map(t => (
          <div key={t.id} className="bg-seat-card border border-seat-border rounded-xl p-5">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${t.color}20` }}>
                  <Crown size={22} style={{ color: t.color }} />
                </div>
                <div>
                  <div className="text-xl font-bold text-white">{t.name}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    ${t.minSpend.toLocaleString()}+ annual spend · {t.earnMultiplier}× points
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] text-zinc-500 uppercase">Members</div>
                  <div className="text-xl font-bold text-white">{t.members.toLocaleString()}</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(t)} className="p-1.5 text-zinc-500 hover:text-white rounded"><Pencil size={14} /></button>
                  <button onClick={() => del(t)} className="p-1.5 text-zinc-500 hover:text-red-400 rounded"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-seat-border/50">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Perks</div>
              <div className="text-sm text-zinc-300 whitespace-pre-line">{t.perks}</div>
            </div>
          </div>
        ))}
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Tier' : 'Add Tier'}
        footer={<><GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton><PrimaryButton onClick={save}>{editingId ? 'Save' : 'Add'}</PrimaryButton></>}
      >
        <div className="space-y-4">
          <div><FieldLabel>Tier Name</FieldLabel><TextInput value={form.name} onChange={(v) => setForm(f => ({ ...f, name: v }))} placeholder="Silver, Gold, Platinum..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><FieldLabel>Min Annual Spend ($)</FieldLabel><TextInput type="number" value={form.minSpend} onChange={(v) => setForm(f => ({ ...f, minSpend: parseFloat(v) || 0 }))} /></div>
            <div><FieldLabel>Earn Multiplier</FieldLabel><TextInput type="number" value={form.earnMultiplier} onChange={(v) => setForm(f => ({ ...f, earnMultiplier: parseFloat(v) || 1 }))} /></div>
          </div>
          <div><FieldLabel>Color (hex)</FieldLabel><TextInput value={form.color} onChange={(v) => setForm(f => ({ ...f, color: v }))} placeholder="#F59E0B" /></div>
          <div><FieldLabel>Perks (one per line)</FieldLabel><TextArea value={form.perks} onChange={(v) => setForm(f => ({ ...f, perks: v }))} rows={5} /></div>
        </div>
      </EditModal>
    </div>
  );
}
