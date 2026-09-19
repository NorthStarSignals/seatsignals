'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal, FieldLabel, TextInput, Select, PrimaryButton, GhostButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { Tag, Plus, Pencil, Trash2 } from 'lucide-react';

interface TagItem {
  id: string;
  name: string;
  color: string;
  category: 'customer' | 'menu' | 'event' | 'operations';
  usage: number;
}

const COLORS = [
  { label: 'Red', value: '#E11D48' },
  { label: 'Orange', value: '#F97316' },
  { label: 'Amber', value: '#F59E0B' },
  { label: 'Green', value: '#10B981' },
  { label: 'Blue', value: '#3B82F6' },
  { label: 'Purple', value: '#8B5CF6' },
  { label: 'Pink', value: '#EC4899' },
  { label: 'Zinc', value: '#71717A' },
];

const INITIAL: TagItem[] = [
  { id: 't1', name: 'VIP', color: '#F59E0B', category: 'customer', usage: 42 },
  { id: 't2', name: 'Gluten-Free', color: '#10B981', category: 'menu', usage: 128 },
  { id: 't3', name: 'Regular', color: '#3B82F6', category: 'customer', usage: 340 },
  { id: 't4', name: 'Spicy', color: '#E11D48', category: 'menu', usage: 68 },
  { id: 't5', name: 'Anniversary', color: '#EC4899', category: 'event', usage: 22 },
  { id: 't6', name: 'Birthday', color: '#8B5CF6', category: 'event', usage: 87 },
  { id: 't7', name: 'Vegetarian', color: '#10B981', category: 'menu', usage: 95 },
  { id: 't8', name: 'Allergy: Nuts', color: '#F97316', category: 'customer', usage: 14 },
  { id: 't9', name: 'Needs Follow-up', color: '#F59E0B', category: 'operations', usage: 8 },
  { id: 't10', name: 'Local', color: '#3B82F6', category: 'customer', usage: 156 },
  { id: 't11', name: 'Tourist', color: '#71717A', category: 'customer', usage: 78 },
  { id: 't12', name: 'Chef Special', color: '#E11D48', category: 'menu', usage: 34 },
];

function empty(): Omit<TagItem, 'id'> {
  return { name: '', color: '#E11D48', category: 'customer', usage: 0 };
}

export default function TagsPage() {
  const { items: tags, add, update, remove } = useCrudList<TagItem>('seatsignals_tags', INITIAL);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty());
  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all' ? tags : tags.filter(t => t.category === filter);

  const openAdd = () => { setEditingId(null); setForm(empty()); setModalOpen(true); };
  const openEdit = (t: TagItem) => {
    setEditingId(t.id);
    setForm({ name: t.name, color: t.color, category: t.category, usage: t.usage });
    setModalOpen(true);
  };
  const save = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (editingId) { update(editingId, form); toast.success('Tag updated'); }
    else { add({ id: `t${Date.now()}`, ...form }); toast.success('Tag created'); }
    setModalOpen(false);
  };
  const del = (t: TagItem) => {
    if (!confirm(`Delete tag "${t.name}"?`)) return;
    remove(t.id); toast.success('Deleted');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Tag className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Tags</h1>
            <p className="text-sm text-zinc-500">Organize customers, menu items, and events</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg text-sm font-medium">
          <Plus size={16} /> New Tag
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total Tags" value={tags.length} />
        <MetricCard title="Customer Tags" value={tags.filter(t => t.category === 'customer').length} />
        <MetricCard title="Menu Tags" value={tags.filter(t => t.category === 'menu').length} />
        <MetricCard title="Total Uses" value={tags.reduce((s, t) => s + t.usage, 0).toLocaleString()} />
      </div>

      <div className="flex gap-2">
        {['all', 'customer', 'menu', 'event', 'operations'].map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === c ? 'bg-seat-red text-white' : 'bg-seat-card border border-seat-border text-zinc-400 hover:text-white'
            }`}
          >
            {c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">All Tags</h3>
        <div className="flex flex-wrap gap-2">
          {filtered.map(t => (
            <div key={t.id} className="group flex items-center gap-2 px-3 py-1.5 rounded-lg border border-seat-border bg-seat-black">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
              <span className="text-sm text-white">{t.name}</span>
              <span className="text-[10px] text-zinc-500 ml-1">({t.usage})</span>
              <button onClick={() => openEdit(t)} className="ml-1 text-zinc-600 hover:text-white opacity-0 group-hover:opacity-100 transition"><Pencil size={12} /></button>
              <button onClick={() => del(t)} className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"><Trash2 size={12} /></button>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-sm text-zinc-500">No tags in this category.</div>}
        </div>
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Tag' : 'New Tag'}
        footer={<><GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton><PrimaryButton onClick={save}>{editingId ? 'Save' : 'Create'}</PrimaryButton></>}
      >
        <div className="space-y-4">
          <div><FieldLabel>Name</FieldLabel><TextInput value={form.name} onChange={(v) => setForm(f => ({ ...f, name: v }))} placeholder="VIP, Spicy, Birthday..." /></div>
          <div>
            <FieldLabel>Color</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setForm(f => ({ ...f, color: c.value }))}
                  className={`w-8 h-8 rounded-lg border-2 transition ${form.color === c.value ? 'border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Category</FieldLabel>
            <Select
              value={form.category}
              onChange={(v) => setForm(f => ({ ...f, category: v as TagItem['category'] }))}
              options={[
                { label: 'Customer', value: 'customer' },
                { label: 'Menu', value: 'menu' },
                { label: 'Event', value: 'event' },
                { label: 'Operations', value: 'operations' },
              ]}
            />
          </div>
        </div>
      </EditModal>
    </div>
  );
}
