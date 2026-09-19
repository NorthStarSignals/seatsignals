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
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Package,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface PricePoint {
  month: string;
  price: number;
}

interface PriceItem {
  id: string;
  name: string;
  category: string;
  current_price: number;
  prev_price: number;
  unit: string;
  vendor: string;
  trend: PricePoint[];
}

const INITIAL: PriceItem[] = [
  { id: 'I1', name: 'Atlantic Salmon', category: 'Protein', current_price: 14.5, prev_price: 12.8, unit: '/lb', vendor: 'Ocean Fresh Co', trend: [{ month: 'Nov', price: 11.5 }, { month: 'Dec', price: 12.0 }, { month: 'Jan', price: 12.8 }, { month: 'Feb', price: 13.5 }, { month: 'Mar', price: 14.5 }] },
  { id: 'I2', name: 'Beef Tenderloin', category: 'Protein', current_price: 38.0, prev_price: 35.5, unit: '/lb', vendor: 'Prime Meats', trend: [{ month: 'Nov', price: 34.0 }, { month: 'Dec', price: 35.0 }, { month: 'Jan', price: 35.5 }, { month: 'Feb', price: 36.5 }, { month: 'Mar', price: 38.0 }] },
  { id: 'I3', name: 'Lobster Tails', category: 'Protein', current_price: 22.0, prev_price: 24.5, unit: '/each', vendor: 'Ocean Fresh Co', trend: [{ month: 'Nov', price: 26.0 }, { month: 'Dec', price: 25.0 }, { month: 'Jan', price: 24.5 }, { month: 'Feb', price: 23.0 }, { month: 'Mar', price: 22.0 }] },
  { id: 'I4', name: 'Olive Oil (EVOO)', category: 'Pantry', current_price: 18.0, prev_price: 15.0, unit: '/gal', vendor: 'Mediterranean Imports', trend: [{ month: 'Nov', price: 14.0 }, { month: 'Dec', price: 14.5 }, { month: 'Jan', price: 15.0 }, { month: 'Feb', price: 16.5 }, { month: 'Mar', price: 18.0 }] },
  { id: 'I5', name: 'Heavy Cream', category: 'Dairy', current_price: 6.5, prev_price: 6.0, unit: '/qt', vendor: 'Dairy Direct', trend: [{ month: 'Nov', price: 5.5 }, { month: 'Dec', price: 5.8 }, { month: 'Jan', price: 6.0 }, { month: 'Feb', price: 6.2 }, { month: 'Mar', price: 6.5 }] },
  { id: 'I6', name: 'Avocados', category: 'Produce', current_price: 1.8, prev_price: 2.2, unit: '/each', vendor: 'Farm Fresh', trend: [{ month: 'Nov', price: 2.5 }, { month: 'Dec', price: 2.4 }, { month: 'Jan', price: 2.2 }, { month: 'Feb', price: 2.0 }, { month: 'Mar', price: 1.8 }] },
  { id: 'I7', name: 'Truffle Oil', category: 'Specialty', current_price: 45.0, prev_price: 42.0, unit: '/250ml', vendor: 'Gourmet Supply', trend: [{ month: 'Nov', price: 40.0 }, { month: 'Dec', price: 41.0 }, { month: 'Jan', price: 42.0 }, { month: 'Feb', price: 43.5 }, { month: 'Mar', price: 45.0 }] },
  { id: 'I8', name: 'Arborio Rice', category: 'Pantry', current_price: 3.2, prev_price: 3.0, unit: '/lb', vendor: 'Mediterranean Imports', trend: [{ month: 'Nov', price: 2.8 }, { month: 'Dec', price: 2.9 }, { month: 'Jan', price: 3.0 }, { month: 'Feb', price: 3.1 }, { month: 'Mar', price: 3.2 }] },
];

function changePct(item: PriceItem): number {
  if (!item.prev_price) return 0;
  return ((item.current_price - item.prev_price) / item.prev_price) * 100;
}

export default function PriceTrackerPage() {
  const { items, add, update, remove, setItems } = useCrudList<PriceItem>('seatsignals_inventory_prices', INITIAL);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PriceItem | null>(null);
  const [form, setForm] = useState<Omit<PriceItem, 'id' | 'trend' | 'prev_price'>>({
    name: '',
    category: 'Protein',
    current_price: 0,
    unit: '/lb',
    vendor: '',
  });

  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [priceTarget, setPriceTarget] = useState<PriceItem | null>(null);
  const [newPriceMonth, setNewPriceMonth] = useState('');
  const [newPriceValue, setNewPriceValue] = useState(0);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', category: 'Protein', current_price: 0, unit: '/lb', vendor: '' });
    setModalOpen(true);
  };

  const openEdit = (row: PriceItem) => {
    setEditing(row);
    setForm({
      name: row.name,
      category: row.category,
      current_price: row.current_price,
      unit: row.unit,
      vendor: row.vendor,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('Item name required');
      return;
    }
    if (editing) {
      update(editing.id, {
        ...form,
        prev_price: editing.current_price !== form.current_price ? editing.current_price : editing.prev_price,
      });
      toast.success('Price updated');
    } else {
      add({
        id: `I${Date.now()}`,
        ...form,
        prev_price: form.current_price,
        trend: [{ month: 'Now', price: form.current_price }],
      });
      toast.success('Item added');
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete?')) return;
    remove(id);
    toast.success('Deleted');
  };

  const openAddPrice = (row: PriceItem) => {
    setPriceTarget(row);
    setNewPriceMonth('');
    setNewPriceValue(row.current_price);
    setPriceModalOpen(true);
  };

  const saveNewPrice = () => {
    if (!priceTarget || !newPriceMonth.trim()) {
      toast.error('Month label required');
      return;
    }
    setItems(prev =>
      prev.map(p =>
        p.id === priceTarget.id
          ? {
              ...p,
              prev_price: p.current_price,
              current_price: newPriceValue,
              trend: [...p.trend, { month: newPriceMonth, price: newPriceValue }].slice(-8),
            }
          : p
      )
    );
    toast.success(`Price logged for ${priceTarget.name}`);
    setPriceModalOpen(false);
  };

  const avgChange = items.length
    ? (items.reduce((s, i) => s + changePct(i), 0) / items.length).toFixed(1)
    : '0.0';
  const risingSharply = items.filter(i => changePct(i) > 10).length;
  const falling = items.filter(i => changePct(i) < 0).length;

  const monthLabels = items[0]?.trend.map(t => t.month) || [];
  const indexData = monthLabels.map((month, mi) => {
    const baseline = items.reduce((s, item) => s + (item.trend[0]?.price || 0), 0);
    const current = items.reduce((s, item) => s + (item.trend[mi]?.price || 0), 0);
    return { month, index: baseline > 0 ? Math.round((current / baseline) * 100) : 100 };
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Ingredient Price Tracker</h1>
            <p className="text-sm text-zinc-500">Monitor ingredient costs and vendor pricing trends</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90"
        >
          <Plus size={14} /> Add Item
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Avg Price Change" value={`${Number(avgChange) >= 0 ? '+' : ''}${avgChange}%`} icon={<TrendingUp size={18} />} />
        <MetricCard title="Rising Sharply" value={risingSharply} icon={<AlertTriangle size={18} />} />
        <MetricCard title="Falling Prices" value={falling} icon={<TrendingDown size={18} />} />
        <MetricCard title="Items Tracked" value={items.length} icon={<Package size={18} />} />
      </div>

      {indexData.length > 0 && (
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Overall Cost Index (Base = 100)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={indexData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
              <XAxis dataKey="month" stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
              <YAxis stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: 8 }} />
              <Line type="monotone" dataKey="index" stroke="#E11D48" strokeWidth={2} dot={{ r: 4 }} name="Cost Index" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Ingredient Prices</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-zinc-500 uppercase border-b border-seat-border">
                <th className="text-left py-2 px-3">Item</th>
                <th className="text-left py-2 px-3">Category</th>
                <th className="text-right py-2 px-3">Current</th>
                <th className="text-right py-2 px-3">Previous</th>
                <th className="text-right py-2 px-3">Change</th>
                <th className="text-left py-2 px-3">Vendor</th>
                <th className="text-right py-2 px-3">Trend</th>
                <th className="text-right py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...items].sort((a, b) => changePct(b) - changePct(a)).map(item => {
                const pct = changePct(item);
                return (
                  <tr key={item.id} className="border-b border-seat-border/30 hover:bg-zinc-800/30">
                    <td className="py-2.5 px-3">
                      <span className="text-white font-medium">{item.name}</span>
                      <span className="text-zinc-500 text-xs ml-1">{item.unit}</span>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-400">{item.category}</td>
                    <td className="py-2.5 px-3 text-right text-white font-medium">{formatCurrency(item.current_price)}</td>
                    <td className="py-2.5 px-3 text-right text-zinc-400">{formatCurrency(item.prev_price)}</td>
                    <td className={cn('py-2.5 px-3 text-right font-bold',
                      pct > 10 ? 'text-red-400' : pct > 0 ? 'text-amber-400' : 'text-green-400')}>
                      <span className="flex items-center justify-end gap-1">
                        {pct > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-400 text-xs">{item.vendor}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-end gap-0.5 justify-end h-4">
                        {item.trend.map((t, i) => {
                          const max = Math.max(...item.trend.map(tt => tt.price));
                          const min = Math.min(...item.trend.map(tt => tt.price));
                          const height = max === min ? 50 : ((t.price - min) / (max - min)) * 100;
                          return (
                            <div
                              key={i}
                              className={cn('w-1.5 rounded-sm', pct > 0 ? 'bg-red-400/60' : 'bg-green-400/60')}
                              style={{ height: `${Math.max(height, 15)}%` }}
                            />
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openAddPrice(item)}
                          className="text-[10px] px-2 py-1 bg-seat-red/10 text-seat-red rounded hover:bg-seat-red/20"
                        >
                          + Price
                        </button>
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Price Alerts</h3>
        <div className="space-y-2">
          {items.filter(i => Math.abs(changePct(i)) > 10).map(item => {
            const pct = changePct(item);
            return (
              <div
                key={item.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border',
                  pct > 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-green-500/5 border-green-500/20'
                )}
              >
                <AlertTriangle size={14} className={pct > 0 ? 'text-red-400' : 'text-green-400'} />
                <div>
                  <p className="text-sm text-white">
                    <span className="font-semibold">{item.name}</span> {pct > 0 ? 'increased' : 'decreased'} {Math.abs(pct).toFixed(1)}%
                  </p>
                  <p className="text-xs text-zinc-500">
                    from {formatCurrency(item.prev_price)} to {formatCurrency(item.current_price)} — Vendor: {item.vendor}
                  </p>
                </div>
              </div>
            );
          })}
          {items.filter(i => Math.abs(changePct(i)) > 10).length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-4">No significant price movements.</p>
          )}
        </div>
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Ingredient' : 'Add Ingredient'}
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
            <FieldLabel>Name</FieldLabel>
            <TextInput value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. Atlantic Salmon" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Category</FieldLabel>
              <Select
                value={form.category}
                onChange={(v) => setForm({ ...form, category: v })}
                options={[
                  { label: 'Protein', value: 'Protein' },
                  { label: 'Produce', value: 'Produce' },
                  { label: 'Dairy', value: 'Dairy' },
                  { label: 'Pantry', value: 'Pantry' },
                  { label: 'Specialty', value: 'Specialty' },
                  { label: 'Beverage', value: 'Beverage' },
                ]}
              />
            </div>
            <div>
              <FieldLabel>Unit</FieldLabel>
              <Select
                value={form.unit}
                onChange={(v) => setForm({ ...form, unit: v })}
                options={[
                  { label: '/lb', value: '/lb' },
                  { label: '/each', value: '/each' },
                  { label: '/qt', value: '/qt' },
                  { label: '/gal', value: '/gal' },
                  { label: '/case', value: '/case' },
                  { label: '/250ml', value: '/250ml' },
                ]}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Current Price ($)</FieldLabel>
              <TextInput
                type="number"
                value={form.current_price}
                onChange={(v) => setForm({ ...form, current_price: Number(v) || 0 })}
              />
            </div>
            <div>
              <FieldLabel>Vendor</FieldLabel>
              <TextInput value={form.vendor} onChange={(v) => setForm({ ...form, vendor: v })} placeholder="e.g. Ocean Fresh Co" />
            </div>
          </div>
        </div>
      </EditModal>

      <EditModal
        open={priceModalOpen}
        onClose={() => setPriceModalOpen(false)}
        title={priceTarget ? `New Price for ${priceTarget.name}` : 'New Price'}
        footer={
          <>
            <GhostButton onClick={() => setPriceModalOpen(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={saveNewPrice}>Log Price</PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Month Label</FieldLabel>
            <TextInput value={newPriceMonth} onChange={setNewPriceMonth} placeholder="e.g. Apr" />
          </div>
          <div>
            <FieldLabel>Price ($)</FieldLabel>
            <TextInput type="number" value={newPriceValue} onChange={(v) => setNewPriceValue(Number(v) || 0)} />
          </div>
        </div>
      </EditModal>
    </div>
  );
}
