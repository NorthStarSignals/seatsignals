'use client';

import { useState } from 'react';
import {
  Users,
  Plus,
  X,
  Trash2,
  Filter,
  Palette,
  Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useCrudApi } from '@/hooks/use-crud-api';

interface Rule {
  field: string;
  operator: string;
  value: string | number;
}

interface Segment {
  id: string;
  name: string;
  description: string;
  rules: Rule[];
  color: string;
  customer_count: number;
  created_at: string;
}

const FIELDS = [
  { value: 'visit_count', label: 'Visit Count' },
  { value: 'total_spend', label: 'Total Spend ($)' },
  { value: 'last_visit', label: 'Last Visit' },
  { value: 'first_seen', label: 'First Seen' },
  { value: 'tags', label: 'Tags' },
];

const OPERATORS = [
  { value: 'gt', label: 'greater than' },
  { value: 'gte', label: 'at least' },
  { value: 'lt', label: 'less than' },
  { value: 'lte', label: 'at most' },
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'not equal to' },
  { value: 'contains', label: 'contains' },
];

const COLORS = ['#E11D48', '#3B82F6', '#22C55E', '#F59E0B', '#A855F7', '#EC4899', '#14B8A6', '#F97316'];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const initialSegments: Segment[] = [
  {
    id: 'seg1',
    name: 'VIP Customers',
    description: 'Big spenders who visit often',
    rules: [
      { field: 'visit_count', operator: 'gte', value: 10 },
      { field: 'total_spend', operator: 'gte', value: 500 },
    ],
    color: '#E11D48',
    customer_count: 84,
    created_at: new Date().toISOString(),
  },
  {
    id: 'seg2',
    name: 'At-Risk Regulars',
    description: "Haven't visited in 60+ days",
    rules: [
      { field: 'visit_count', operator: 'gte', value: 5 },
      { field: 'last_visit', operator: 'lt', value: '60' },
    ],
    color: '#F59E0B',
    customer_count: 142,
    created_at: new Date().toISOString(),
  },
  {
    id: 'seg3',
    name: 'New Guests',
    description: 'First-time visitors from this month',
    rules: [{ field: 'visit_count', operator: 'eq', value: 1 }],
    color: '#3B82F6',
    customer_count: 61,
    created_at: new Date().toISOString(),
  },
];

export default function SegmentsPage() {
  const { items: segments, add, update, remove } = useCrudApi<Segment>('/api/customer-segments');

  const [showBuilder, setShowBuilder] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [rules, setRules] = useState<Rule[]>([{ field: 'visit_count', operator: 'gte', value: 5 }]);

  function resetForm() {
    setName('');
    setDescription('');
    setColor(COLORS[0]);
    setRules([{ field: 'visit_count', operator: 'gte', value: 5 }]);
    setEditingId(null);
  }

  function openCreate() {
    resetForm();
    setShowBuilder(true);
  }

  function openEdit(s: Segment) {
    setEditingId(s.id);
    setName(s.name);
    setDescription(s.description);
    setColor(s.color);
    setRules(s.rules.length > 0 ? s.rules : [{ field: 'visit_count', operator: 'gte', value: 5 }]);
    setShowBuilder(true);
  }

  const addRule = () => setRules([...rules, { field: 'visit_count', operator: 'gte', value: 0 }]);
  const removeRule = (idx: number) => setRules(rules.filter((_, i) => i !== idx));
  const updateRule = (idx: number, key: keyof Rule, val: string | number) => {
    const updated = [...rules];
    updated[idx] = { ...updated[idx], [key]: val };
    setRules(updated);
  };

  function saveSegment() {
    if (!name.trim()) {
      toast.error('Segment name required');
      return;
    }
    if (rules.length === 0) {
      toast.error('Add at least one rule');
      return;
    }

    if (editingId) {
      update(editingId, { name, description, rules, color });
      toast.success('Segment updated');
    } else {
      add({ name, description, rules, color });
      toast.success('Segment created');
    }
    setShowBuilder(false);
    resetForm();
  }

  function deleteSegment(id: string) {
    if (!confirm('Delete this segment?')) return;
    remove(id);
    toast.success('Segment deleted');
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Customer Segments</h1>
          <p className="text-zinc-400 text-sm mt-1">Create dynamic segments based on customer behavior</p>
        </div>
        <button
          onClick={() => (showBuilder ? (setShowBuilder(false), resetForm()) : openCreate())}
          className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 transition-colors"
        >
          {showBuilder ? <X size={16} /> : <Plus size={16} />}
          {showBuilder ? 'Cancel' : 'New Segment'}
        </button>
      </div>

      {showBuilder && (
        <div className="bg-seat-card border border-seat-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Filter size={14} className="text-seat-red" />
            {editingId ? 'Edit Segment' : 'Segment Builder'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Segment Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., VIP Customers"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-seat-red"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-seat-red"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 flex items-center gap-1">
                <Palette size={12} /> Color
              </label>
              <div className="flex gap-2 mt-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn('w-7 h-7 rounded-full transition-all', color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : 'hover:scale-110')}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-zinc-400">Rules (all must match)</label>
            {rules.map((rule, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {idx > 0 && <span className="text-[10px] text-zinc-600 w-8 text-center">AND</span>}
                {idx === 0 && <span className="w-8" />}
                <select
                  value={rule.field}
                  onChange={(e) => updateRule(idx, 'field', e.target.value)}
                  className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-seat-red"
                >
                  {FIELDS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                <select
                  value={rule.operator}
                  onChange={(e) => updateRule(idx, 'operator', e.target.value)}
                  className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-seat-red"
                >
                  {OPERATORS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <input
                  value={rule.value}
                  onChange={(e) => updateRule(idx, 'value', e.target.value)}
                  className="w-32 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-seat-red"
                />
                {rules.length > 1 && (
                  <button onClick={() => removeRule(idx)} className="text-zinc-600 hover:text-red-400">
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addRule}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors mt-1"
            >
              <Plus size={12} />
              Add Rule
            </button>
          </div>

          <button
            onClick={saveSegment}
            disabled={!name.trim() || rules.length === 0}
            className="px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 disabled:opacity-50 transition-colors"
          >
            {editingId ? 'Save Changes' : 'Create Segment'}
          </button>
        </div>
      )}

      {segments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {segments.map((seg) => (
            <div key={seg.id} className="bg-seat-card border border-seat-border rounded-xl p-5 hover:border-zinc-600 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
                  <h4 className="text-sm font-semibold text-white">{seg.name}</h4>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(seg)} className="text-zinc-500 hover:text-white transition-colors" title="Edit">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => deleteSegment(seg.id)} className="text-zinc-600 hover:text-red-400 transition-colors" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {seg.description && <p className="text-xs text-zinc-500 mb-3">{seg.description}</p>}

              <div className="flex items-center gap-2 mb-3">
                <Users size={14} className="text-zinc-400" />
                <span className="text-lg font-bold text-white">{seg.customer_count}</span>
                <span className="text-xs text-zinc-500">customers</span>
              </div>

              <div className="space-y-1.5">
                {seg.rules.map((rule, i) => {
                  const fieldLabel = FIELDS.find((f) => f.value === rule.field)?.label || rule.field;
                  const opLabel = OPERATORS.find((o) => o.value === rule.operator)?.label || rule.operator;
                  return (
                    <div key={i} className="flex items-center gap-1 text-[11px]">
                      {i > 0 && <span className="text-zinc-600">AND</span>}
                      <span className="text-zinc-400">{fieldLabel}</span>
                      <span className="text-zinc-500">{opLabel}</span>
                      <span className="text-white font-medium">{rule.value}</span>
                    </div>
                  );
                })}
              </div>

              <p className="text-[10px] text-zinc-600 mt-3">
                Created {new Date(seg.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <Filter size={48} className="mx-auto text-zinc-700 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-1">No Segments Yet</h3>
          <p className="text-zinc-400 text-sm mb-4">Create segments to group customers by behavior</p>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 transition-colors"
          >
            Create Your First Segment
          </button>
        </div>
      )}
    </div>
  );
}
