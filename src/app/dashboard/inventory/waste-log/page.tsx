'use client';

import { useState } from 'react';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal,
  FieldLabel,
  TextInput,
  Select,
  PrimaryButton,
  GhostButton,
  DangerButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { MetricCard } from '@/components/ui/metric-card';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  Trash2,
  DollarSign,
  AlertTriangle,
  TrendingDown,
  Plus,
  Pencil,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

type WasteReason = 'expired' | 'overproduction' | 'damaged' | 'returned' | 'spillage';

interface WasteEntry {
  id: string;
  item: string;
  category: string;
  quantity: string;
  cost: number;
  reason: WasteReason;
  reported_by: string;
  date: string;
}

const INITIAL: WasteEntry[] = [
  { id: 'W1', item: 'Atlantic Salmon', category: 'Protein', quantity: '4 lbs', cost: 48, reason: 'expired', reported_by: 'Chef Mike', date: 'Today' },
  { id: 'W2', item: 'Mixed Greens', category: 'Produce', quantity: '6 lbs', cost: 18, reason: 'expired', reported_by: 'Prep Cook Ana', date: 'Today' },
  { id: 'W3', item: 'Lobster Tails', category: 'Protein', quantity: '2 lbs', cost: 62, reason: 'overproduction', reported_by: 'Chef Mike', date: 'Today' },
  { id: 'W4', item: 'Risotto Base', category: 'Prepared', quantity: '3 qts', cost: 24, reason: 'overproduction', reported_by: 'Line Cook Sam', date: 'Yesterday' },
  { id: 'W5', item: 'Heavy Cream', category: 'Dairy', quantity: '2 qts', cost: 12, reason: 'expired', reported_by: 'Prep Cook Ana', date: 'Yesterday' },
  { id: 'W6', item: 'Dessert Souffle', category: 'Prepared', quantity: '5 ea', cost: 35, reason: 'returned', reported_by: 'Server Emily', date: 'Yesterday' },
  { id: 'W7', item: 'Olive Oil', category: 'Pantry', quantity: '1 bottle', cost: 22, reason: 'spillage', reported_by: 'Line Cook Sam', date: '2 days ago' },
  { id: 'W8', item: 'Wagyu Trim', category: 'Protein', quantity: '1.5 lbs', cost: 45, reason: 'damaged', reported_by: 'Chef Mike', date: '2 days ago' },
];

const weeklyTrend = [
  { week: 'W1', cost: 420 },
  { week: 'W2', cost: 380 },
  { week: 'W3', cost: 510 },
  { week: 'W4', cost: 340 },
  { week: 'W5', cost: 290 },
  { week: 'W6', cost: 266 },
];

const REASON_COLORS: Record<WasteReason, string> = {
  expired: 'bg-red-500/10 text-red-400',
  overproduction: 'bg-amber-500/10 text-amber-400',
  returned: 'bg-blue-500/10 text-blue-400',
  damaged: 'bg-purple-500/10 text-purple-400',
  spillage: 'bg-cyan-500/10 text-cyan-400',
};

const REASON_HEX: Record<WasteReason, string> = {
  expired: '#EF4444',
  overproduction: '#F59E0B',
  returned: '#3B82F6',
  damaged: '#8B5CF6',
  spillage: '#06B6D4',
};

const REASON_OPTIONS = [
  { label: 'Expired', value: 'expired' },
  { label: 'Overproduction', value: 'overproduction' },
  { label: 'Damaged', value: 'damaged' },
  { label: 'Returned', value: 'returned' },
  { label: 'Spillage', value: 'spillage' },
];

const CATEGORY_OPTIONS = [
  { label: 'Protein', value: 'Protein' },
  { label: 'Produce', value: 'Produce' },
  { label: 'Dairy', value: 'Dairy' },
  { label: 'Pantry', value: 'Pantry' },
  { label: 'Prepared', value: 'Prepared' },
  { label: 'Beverage', value: 'Beverage' },
];

export default function WasteLogPage() {
  const { items, add, update, remove } = useCrudList<WasteEntry>('seatsignals_inventory_waste', INITIAL);
  const [filter, setFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WasteEntry | null>(null);
  const [form, setForm] = useState<Omit<WasteEntry, 'id'>>({
    item: '',
    category: 'Protein',
    quantity: '',
    cost: 0,
    reason: 'expired',
    reported_by: '',
    date: 'Today',
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ item: '', category: 'Protein', quantity: '', cost: 0, reason: 'expired', reported_by: '', date: 'Today' });
    setModalOpen(true);
  };

  const openEdit = (row: WasteEntry) => {
    setEditing(row);
    setForm({ ...row });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.item.trim()) {
      toast.error('Item name required');
      return;
    }
    if (editing) {
      update(editing.id, form);
      toast.success('Waste entry updated');
    } else {
      add({ id: `W${Date.now()}`, ...form });
      toast.success('Waste logged');
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete?')) return;
    remove(id);
    toast.success('Deleted');
  };

  const totalCost = items.reduce((s, e) => s + e.cost, 0);
  const todayWaste = items.filter(e => e.date === 'Today').reduce((s, e) => s + e.cost, 0);

  const reasonCounts = items.reduce<Record<string, number>>((acc, e) => {
    acc[e.reason] = (acc[e.reason] || 0) + e.cost;
    return acc;
  }, {});
  const topReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  const byReason = (Object.keys(REASON_HEX) as WasteReason[]).map(r => ({
    name: r.charAt(0).toUpperCase() + r.slice(1),
    value: reasonCounts[r] || 0,
    color: REASON_HEX[r],
  })).filter(r => r.value > 0);

  const filtered = filter === 'all' ? items : items.filter(e => e.reason === filter);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Waste Log</h1>
            <p className="text-sm text-zinc-500">Track and reduce food waste across all categories</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90"
        >
          <Plus size={14} /> Log Waste
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total Logged" value={formatCurrency(totalCost)} icon={<DollarSign size={18} />} />
        <MetricCard title="Today's Waste" value={formatCurrency(todayWaste)} icon={<AlertTriangle size={18} />} />
        <MetricCard title="Top Reason" value={topReason} icon={<TrendingDown size={18} />} />
        <MetricCard title="Entries" value={items.length} icon={<DollarSign size={18} />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Weekly Waste Cost</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
              <XAxis dataKey="week" stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
              <YAxis stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} tickFormatter={v => `$${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: 8 }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [formatCurrency(value), 'Waste Cost']}
              />
              <Bar dataKey="cost" fill="#E11D48" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Waste by Reason</h3>
          {byReason.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={byReason} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {byReason.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {byReason.map(r => (
                  <div key={r.name} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                    <span className="text-[10px] text-zinc-400">{r.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-zinc-500">No waste entries yet</div>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'expired', 'overproduction', 'returned', 'damaged', 'spillage'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
              filter === f ? 'bg-seat-red text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Waste Entries</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-zinc-500 uppercase border-b border-seat-border">
              <th className="text-left py-2 px-3">Item</th>
              <th className="text-left py-2 px-3">Category</th>
              <th className="text-right py-2 px-3">Qty</th>
              <th className="text-right py-2 px-3">Cost</th>
              <th className="text-center py-2 px-3">Reason</th>
              <th className="text-left py-2 px-3">Reported By</th>
              <th className="text-left py-2 px-3">Date</th>
              <th className="text-right py-2 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id} className="border-b border-seat-border/30">
                <td className="py-2.5 px-3 text-white font-medium">{e.item}</td>
                <td className="py-2.5 px-3 text-zinc-400">{e.category}</td>
                <td className="py-2.5 px-3 text-right text-zinc-300">{e.quantity}</td>
                <td className="py-2.5 px-3 text-right text-red-400 font-bold">{formatCurrency(e.cost)}</td>
                <td className="py-2.5 px-3 text-center">
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium capitalize', REASON_COLORS[e.reason])}>
                    {e.reason}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-zinc-400">{e.reported_by}</td>
                <td className="py-2.5 px-3 text-zinc-500">{e.date}</td>
                <td className="py-2.5 px-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEdit(e)}
                      className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(e.id)}
                      className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-zinc-500 text-sm py-8">No waste entries match filter.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Waste Entry' : 'Log Waste'}
        footer={
          <>
            {editing && (
              <DangerButton
                onClick={() => {
                  if (!confirm('Delete?')) return;
                  remove(editing.id);
                  toast.success('Deleted');
                  setModalOpen(false);
                }}
              >
                Delete
              </DangerButton>
            )}
            <GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={handleSave}>{editing ? 'Save' : 'Log'}</PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Item</FieldLabel>
            <TextInput value={form.item} onChange={(v) => setForm({ ...form, item: v })} placeholder="e.g. Atlantic Salmon" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Category</FieldLabel>
              <Select value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={CATEGORY_OPTIONS} />
            </div>
            <div>
              <FieldLabel>Reason</FieldLabel>
              <Select
                value={form.reason}
                onChange={(v) => setForm({ ...form, reason: v as WasteReason })}
                options={REASON_OPTIONS}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Quantity</FieldLabel>
              <TextInput value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} placeholder="e.g. 4 lbs" />
            </div>
            <div>
              <FieldLabel>Cost ($)</FieldLabel>
              <TextInput type="number" value={form.cost} onChange={(v) => setForm({ ...form, cost: Number(v) || 0 })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Reported By</FieldLabel>
              <TextInput value={form.reported_by} onChange={(v) => setForm({ ...form, reported_by: v })} placeholder="e.g. Chef Mike" />
            </div>
            <div>
              <FieldLabel>Date</FieldLabel>
              <Select
                value={form.date}
                onChange={(v) => setForm({ ...form, date: v })}
                options={[
                  { label: 'Today', value: 'Today' },
                  { label: 'Yesterday', value: 'Yesterday' },
                  { label: '2 days ago', value: '2 days ago' },
                  { label: '3 days ago', value: '3 days ago' },
                  { label: 'This week', value: 'This week' },
                ]}
              />
            </div>
          </div>
        </div>
      </EditModal>
    </div>
  );
}
