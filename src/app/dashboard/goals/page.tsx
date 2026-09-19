'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { useCrudApi } from '@/hooks/use-crud-api';
import {
  EditModal, FieldLabel, TextInput, Select, PrimaryButton, GhostButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { Target, Plus, Pencil, Trash2, TrendingUp, Check } from 'lucide-react';

type GoalCategory = 'revenue' | 'covers' | 'reviews' | 'labor' | 'marketing' | 'other';
type Period = 'monthly' | 'quarterly' | 'annual';

interface Goal {
  id: string;
  name: string;
  category: GoalCategory;
  target: number;
  current: number;
  period: Period;
  deadline: string;
  unit: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const INITIAL: Goal[] = [
  { id: 'g1', name: 'Monthly Revenue', category: 'revenue', target: 520000, current: 487500, period: 'monthly', deadline: '2026-04-30', unit: '$' },
  { id: 'g2', name: 'Monthly Covers', category: 'covers', target: 4800, current: 4280, period: 'monthly', deadline: '2026-04-30', unit: '' },
  { id: 'g3', name: 'Avg Review Rating', category: 'reviews', target: 4.8, current: 4.7, period: 'quarterly', deadline: '2026-06-30', unit: '★' },
  { id: 'g4', name: 'Labor Cost %', category: 'labor', target: 27, current: 28.4, period: 'monthly', deadline: '2026-04-30', unit: '%' },
  { id: 'g5', name: 'New Customers', category: 'marketing', target: 500, current: 384, period: 'monthly', deadline: '2026-04-30', unit: '' },
  { id: 'g6', name: 'Catering Revenue', category: 'revenue', target: 180000, current: 124000, period: 'quarterly', deadline: '2026-06-30', unit: '$' },
];

function empty(): Omit<Goal, 'id'> {
  return { name: '', category: 'revenue', target: 0, current: 0, period: 'monthly', deadline: new Date().toISOString().split('T')[0], unit: '$' };
}

const formatValue = (n: number, unit: string) => {
  if (unit === '$') return `$${n.toLocaleString()}`;
  if (unit === '%') return `${n}%`;
  if (unit === '★') return `${n.toFixed(1)}★`;
  return n.toLocaleString();
};

export default function GoalsPage() {
  const { items: goals, add, update, remove } = useCrudApi<Goal>('/api/revenue-goals');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty());

  const onTrack = goals.filter(g => g.current >= g.target).length;
  const avgProgress = goals.length ? Math.round(goals.reduce((s, g) => s + Math.min(100, (g.current / g.target) * 100), 0) / goals.length) : 0;

  const openAdd = () => { setEditingId(null); setForm(empty()); setModalOpen(true); };
  const openEdit = (g: Goal) => {
    setEditingId(g.id);
    setForm({ name: g.name, category: g.category, target: g.target, current: g.current, period: g.period, deadline: g.deadline, unit: g.unit });
    setModalOpen(true);
  };
  const save = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (editingId) { update(editingId, form); toast.success('Goal updated'); }
    else { add({ ...form }); toast.success('Goal created'); }
    setModalOpen(false);
  };
  const del = (g: Goal) => {
    if (!confirm(`Delete "${g.name}"?`)) return;
    remove(g.id); toast.success('Deleted');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Target className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Goals</h1>
            <p className="text-sm text-zinc-500">Track your revenue, operational, and marketing targets</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg text-sm font-medium">
          <Plus size={16} /> New Goal
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Active Goals" value={goals.length} icon={<Target size={18} />} />
        <MetricCard title="On Track" value={onTrack} icon={<Check size={18} />} />
        <MetricCard title="Avg Progress" value={`${avgProgress}%`} icon={<TrendingUp size={18} />} />
        <MetricCard title="Behind" value={goals.length - onTrack} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map(g => {
          const pct = Math.min(100, (g.current / g.target) * 100);
          const complete = g.current >= g.target;
          return (
            <div key={g.id} className="bg-seat-card border border-seat-border rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-semibold">{g.name}</h3>
                  <div className="text-xs text-zinc-500 mt-0.5 uppercase tracking-wide">{g.category} · {g.period}</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(g)} className="p-1.5 text-zinc-500 hover:text-white rounded"><Pencil size={14} /></button>
                  <button onClick={() => del(g)} className="p-1.5 text-zinc-500 hover:text-red-400 rounded"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="flex items-baseline justify-between mb-2">
                <div className="text-2xl font-bold text-white">{formatValue(g.current, g.unit)}</div>
                <div className="text-sm text-zinc-500">of {formatValue(g.target, g.unit)}</div>
              </div>
              <div className="h-2 bg-seat-black rounded-full overflow-hidden mb-2">
                <div className={`h-full transition-all ${complete ? 'bg-green-500' : 'bg-seat-red'}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Due {g.deadline}</span>
                <span className={complete ? 'text-green-400' : 'text-zinc-400'}>{pct.toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Goal' : 'New Goal'}
        footer={<><GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton><PrimaryButton onClick={save}>{editingId ? 'Save' : 'Create'}</PrimaryButton></>}
      >
        <div className="space-y-4">
          <div><FieldLabel>Name</FieldLabel><TextInput value={form.name} onChange={(v) => setForm(f => ({ ...f, name: v }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Category</FieldLabel>
              <Select value={form.category} onChange={(v) => setForm(f => ({ ...f, category: v as GoalCategory }))} options={[
                { label: 'Revenue', value: 'revenue' },
                { label: 'Covers', value: 'covers' },
                { label: 'Reviews', value: 'reviews' },
                { label: 'Labor', value: 'labor' },
                { label: 'Marketing', value: 'marketing' },
                { label: 'Other', value: 'other' },
              ]} />
            </div>
            <div>
              <FieldLabel>Period</FieldLabel>
              <Select value={form.period} onChange={(v) => setForm(f => ({ ...f, period: v as Period }))} options={[
                { label: 'Monthly', value: 'monthly' },
                { label: 'Quarterly', value: 'quarterly' },
                { label: 'Annual', value: 'annual' },
              ]} />
            </div>
            <div><FieldLabel>Target</FieldLabel><TextInput type="number" value={form.target} onChange={(v) => setForm(f => ({ ...f, target: parseFloat(v) || 0 }))} /></div>
            <div><FieldLabel>Current</FieldLabel><TextInput type="number" value={form.current} onChange={(v) => setForm(f => ({ ...f, current: parseFloat(v) || 0 }))} /></div>
            <div>
              <FieldLabel>Unit</FieldLabel>
              <Select value={form.unit} onChange={(v) => setForm(f => ({ ...f, unit: v }))} options={[
                { label: 'Dollars ($)', value: '$' },
                { label: 'Percent (%)', value: '%' },
                { label: 'Stars (★)', value: '★' },
                { label: 'Count', value: '' },
              ]} />
            </div>
            <div><FieldLabel>Deadline</FieldLabel><TextInput type="date" value={form.deadline} onChange={(v) => setForm(f => ({ ...f, deadline: v }))} /></div>
          </div>
        </div>
      </EditModal>
    </div>
  );
}
