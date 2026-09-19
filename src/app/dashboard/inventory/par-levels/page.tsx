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
import { cn } from '@/lib/utils';
import {
  Package,
  AlertTriangle,
  TrendingDown,
  CheckCircle2,
  Pencil,
  Trash2,
  Plus,
  ShoppingCart,
} from 'lucide-react';

type ParStatus = 'critical' | 'low' | 'ok';

interface ParItem {
  id: string;
  item: string;
  unit: string;
  current: number;
  par: number;
  max: number;
  usage_per_day: number;
  days_left: number;
  status: ParStatus;
}

const INITIAL: ParItem[] = [
  { id: 'P1', item: 'Atlantic Salmon', unit: 'lbs', current: 12, par: 25, max: 40, usage_per_day: 8, days_left: 1.5, status: 'critical' },
  { id: 'P2', item: 'Filet Mignon', unit: 'lbs', current: 18, par: 20, max: 35, usage_per_day: 6, days_left: 3, status: 'low' },
  { id: 'P3', item: 'Lobster Tails', unit: 'each', current: 8, par: 15, max: 25, usage_per_day: 4, days_left: 2, status: 'critical' },
  { id: 'P4', item: 'Heavy Cream', unit: 'qts', current: 10, par: 8, max: 16, usage_per_day: 3, days_left: 3.3, status: 'ok' },
  { id: 'P5', item: 'Mixed Greens', unit: 'lbs', current: 15, par: 12, max: 24, usage_per_day: 5, days_left: 3, status: 'ok' },
  { id: 'P6', item: 'Olive Oil', unit: 'bottles', current: 4, par: 6, max: 12, usage_per_day: 1, days_left: 4, status: 'low' },
  { id: 'P7', item: 'Pasta (Linguine)', unit: 'lbs', current: 20, par: 10, max: 30, usage_per_day: 4, days_left: 5, status: 'ok' },
  { id: 'P8', item: 'Chocolate (Callebaut)', unit: 'lbs', current: 8, par: 5, max: 15, usage_per_day: 2, days_left: 4, status: 'ok' },
  { id: 'P9', item: 'Wagyu Beef', unit: 'lbs', current: 3, par: 8, max: 12, usage_per_day: 2, days_left: 1.5, status: 'critical' },
  { id: 'P10', item: 'White Wine (Cooking)', unit: 'bottles', current: 6, par: 4, max: 10, usage_per_day: 1, days_left: 6, status: 'ok' },
  { id: 'P11', item: 'Calamari', unit: 'lbs', current: 5, par: 10, max: 20, usage_per_day: 5, days_left: 1, status: 'critical' },
  { id: 'P12', item: 'Butter', unit: 'lbs', current: 12, par: 8, max: 20, usage_per_day: 4, days_left: 3, status: 'ok' },
];

const STATUS_CONFIG: Record<ParStatus, { color: string; label: string }> = {
  critical: { color: 'bg-red-500/10 text-red-400', label: 'Critical' },
  low: { color: 'bg-amber-500/10 text-amber-400', label: 'Low' },
  ok: { color: 'bg-green-500/10 text-green-400', label: 'OK' },
};

function deriveStatus(current: number, par: number): ParStatus {
  if (current < par * 0.5) return 'critical';
  if (current < par) return 'low';
  return 'ok';
}

export default function ParLevelsPage() {
  const { items, add, update, remove } = useCrudList<ParItem>('seatsignals_inventory_par', INITIAL);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ParItem | null>(null);
  const [form, setForm] = useState<Omit<ParItem, 'id' | 'status' | 'days_left'>>({
    item: '',
    unit: 'lbs',
    current: 0,
    par: 0,
    max: 0,
    usage_per_day: 1,
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ item: '', unit: 'lbs', current: 0, par: 0, max: 0, usage_per_day: 1 });
    setModalOpen(true);
  };

  const openEdit = (row: ParItem) => {
    setEditing(row);
    setForm({
      item: row.item,
      unit: row.unit,
      current: row.current,
      par: row.par,
      max: row.max,
      usage_per_day: row.usage_per_day,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.item.trim()) {
      toast.error('Item name required');
      return;
    }
    const days_left = form.usage_per_day > 0 ? Math.round((form.current / form.usage_per_day) * 10) / 10 : 99;
    const status = deriveStatus(form.current, form.par);
    if (editing) {
      update(editing.id, { ...form, days_left, status });
      toast.success('Par level updated');
    } else {
      add({ id: `P${Date.now()}`, ...form, days_left, status });
      toast.success('Item added');
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete?')) return;
    remove(id);
    toast.success('Deleted');
  };

  const handleReorder = (row: ParItem) => {
    toast.success(`PO generated for ${row.max - row.current} ${row.unit} of ${row.item}`);
  };

  const criticalCount = items.filter(i => i.status === 'critical').length;
  const lowCount = items.filter(i => i.status === 'low').length;
  const okCount = items.filter(i => i.status === 'ok').length;
  const needsOrder = criticalCount + lowCount;

  const sorted = [...items].sort((a, b) => {
    const order: Record<ParStatus, number> = { critical: 0, low: 1, ok: 2 };
    return order[a.status] - order[b.status];
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Par Levels</h1>
            <p className="text-sm text-zinc-500">Monitor inventory levels and auto-order triggers</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white text-sm font-medium rounded-lg hover:bg-seat-red/90 transition"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Critical Items" value={criticalCount} icon={<AlertTriangle size={18} />} />
        <MetricCard title="Low Stock" value={lowCount} icon={<TrendingDown size={18} />} />
        <MetricCard title="OK Items" value={okCount} icon={<CheckCircle2 size={18} />} />
        <MetricCard title="Needs Ordering" value={needsOrder} icon={<Package size={18} />} />
      </div>

      {criticalCount > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-400" />
            <span className="text-sm font-medium text-red-400">Critical Stock Alert</span>
          </div>
          <p className="text-sm text-zinc-300">
            {items.filter(i => i.status === 'critical').map(i => i.item).join(', ')} — below par level. Order immediately.
          </p>
        </div>
      )}

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Inventory Levels</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-zinc-500 uppercase border-b border-seat-border">
                <th className="text-left py-2 px-3">Item</th>
                <th className="text-right py-2 px-3">Current</th>
                <th className="text-right py-2 px-3">Par</th>
                <th className="text-right py-2 px-3">Max</th>
                <th className="text-right py-2 px-3">Usage/Day</th>
                <th className="text-right py-2 px-3">Days Left</th>
                <th className="text-center py-2 px-3">Level</th>
                <th className="text-center py-2 px-3">Status</th>
                <th className="text-right py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(i => (
                <tr key={i.id} className="border-b border-seat-border/30">
                  <td className="py-2.5 px-3 text-white font-medium">{i.item}</td>
                  <td className="py-2.5 px-3 text-right text-zinc-300">{i.current} {i.unit}</td>
                  <td className="py-2.5 px-3 text-right text-zinc-500">{i.par}</td>
                  <td className="py-2.5 px-3 text-right text-zinc-500">{i.max}</td>
                  <td className="py-2.5 px-3 text-right text-zinc-300">{i.usage_per_day}</td>
                  <td className={cn('py-2.5 px-3 text-right font-bold',
                    i.days_left <= 2 ? 'text-red-400' : i.days_left <= 3 ? 'text-amber-400' : 'text-green-400')}>
                    {i.days_left}d
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center justify-center">
                      <div className="w-full max-w-[60px] h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full',
                          i.status === 'critical' ? 'bg-red-500' : i.status === 'low' ? 'bg-amber-500' : 'bg-green-500')}
                          style={{ width: `${Math.min((i.current / Math.max(i.max, 1)) * 100, 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', STATUS_CONFIG[i.status].color)}>
                      {STATUS_CONFIG[i.status].label}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(i)}
                        className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(i.id)}
                        className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Suggested Orders</h3>
        <div className="space-y-2">
          {items.filter(i => i.status !== 'ok').map(i => (
            <div key={i.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-800/30">
              <div>
                <p className="text-sm text-white font-medium">{i.item}</p>
                <p className="text-[10px] text-zinc-500">Current: {i.current} {i.unit} · Need: {Math.max(i.max - i.current, 0)} {i.unit}</p>
              </div>
              <button
                onClick={() => handleReorder(i)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-seat-red text-white rounded-lg font-medium hover:bg-seat-red/90"
              >
                <ShoppingCart className="w-3 h-3" />
                Order {Math.max(i.max - i.current, 0)} {i.unit}
              </button>
            </div>
          ))}
          {items.filter(i => i.status !== 'ok').length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-4">All items are within par — no orders needed.</p>
          )}
        </div>
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Par Level' : 'Add Par Level'}
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
            <PrimaryButton onClick={handleSave}>{editing ? 'Save' : 'Add'}</PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Item Name</FieldLabel>
            <TextInput value={form.item} onChange={(v) => setForm({ ...form, item: v })} placeholder="e.g. Atlantic Salmon" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Unit</FieldLabel>
              <Select
                value={form.unit}
                onChange={(v) => setForm({ ...form, unit: v })}
                options={[
                  { label: 'lbs', value: 'lbs' },
                  { label: 'each', value: 'each' },
                  { label: 'qts', value: 'qts' },
                  { label: 'gal', value: 'gal' },
                  { label: 'bottles', value: 'bottles' },
                  { label: 'cases', value: 'cases' },
                ]}
              />
            </div>
            <div>
              <FieldLabel>Usage / Day</FieldLabel>
              <TextInput
                type="number"
                value={form.usage_per_day}
                onChange={(v) => setForm({ ...form, usage_per_day: Number(v) || 0 })}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <FieldLabel>Current</FieldLabel>
              <TextInput type="number" value={form.current} onChange={(v) => setForm({ ...form, current: Number(v) || 0 })} />
            </div>
            <div>
              <FieldLabel>Par</FieldLabel>
              <TextInput type="number" value={form.par} onChange={(v) => setForm({ ...form, par: Number(v) || 0 })} />
            </div>
            <div>
              <FieldLabel>Max</FieldLabel>
              <TextInput type="number" value={form.max} onChange={(v) => setForm({ ...form, max: Number(v) || 0 })} />
            </div>
          </div>
        </div>
      </EditModal>
    </div>
  );
}
