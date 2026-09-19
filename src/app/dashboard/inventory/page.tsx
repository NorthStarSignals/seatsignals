'use client';

import { useState } from 'react';
import { useCrudApi } from '@/hooks/use-crud-api';
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
import {
  Package,
  AlertTriangle,
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  Search,
} from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  reorder_point: number;
  cost_per_unit: number;
  supplier: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const INITIAL: InventoryItem[] = [
  { id: 'I1', name: 'Chicken Breast', category: 'Protein', quantity: 42, unit: 'lbs', reorder_point: 20, cost_per_unit: 4.99, supplier: 'Sysco' },
  { id: 'I2', name: 'Ground Beef', category: 'Protein', quantity: 18, unit: 'lbs', reorder_point: 25, cost_per_unit: 6.5, supplier: 'Prime Meats' },
  { id: 'I3', name: 'Romaine Lettuce', category: 'Produce', quantity: 30, unit: 'heads', reorder_point: 15, cost_per_unit: 1.8, supplier: 'Farm Fresh' },
  { id: 'I4', name: 'Olive Oil', category: 'Pantry', quantity: 6, unit: 'gal', reorder_point: 8, cost_per_unit: 38.0, supplier: 'Mediterranean Imports' },
  { id: 'I5', name: 'Heavy Cream', category: 'Dairy', quantity: 12, unit: 'qts', reorder_point: 10, cost_per_unit: 6.5, supplier: 'Dairy Direct' },
  { id: 'I6', name: 'Atlantic Salmon', category: 'Protein', quantity: 8, unit: 'lbs', reorder_point: 15, cost_per_unit: 14.5, supplier: 'Ocean Fresh Co' },
];

function StatusBadge({ isLow }: { isLow: boolean }) {
  return isLow ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-seat-red/15 text-red-400 border border-red-500/20">
      <AlertTriangle className="w-3 h-3" />
      Low
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
      OK
    </span>
  );
}

export default function InventoryPage() {
  const { items, add, update, remove } = useCrudApi<InventoryItem>('/api/inventory-items');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'low' | 'ok'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<Omit<InventoryItem, 'id'>>({
    name: '',
    category: '',
    quantity: 0,
    unit: 'lbs',
    reorder_point: 10,
    cost_per_unit: 0,
    supplier: '',
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', category: '', quantity: 0, unit: 'lbs', reorder_point: 10, cost_per_unit: 0, supplier: '' });
    setModalOpen(true);
  };

  const openEdit = (row: InventoryItem) => {
    setEditing(row);
    setForm({
      name: row.name,
      category: row.category,
      quantity: row.quantity,
      unit: row.unit,
      reorder_point: row.reorder_point,
      cost_per_unit: row.cost_per_unit,
      supplier: row.supplier,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('Name required');
      return;
    }
    if (editing) {
      update(editing.id, form);
      toast.success('Item updated');
    } else {
      add({ ...form });
      toast.success('Item added');
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete?')) return;
    remove(id);
    toast.success('Deleted');
  };

  const categories = Array.from(new Set(items.map(i => i.category).filter(Boolean))).sort();

  const filtered = items
    .filter(i => !filterCategory || i.category === filterCategory)
    .filter(i => {
      if (filterStatus === 'all') return true;
      const isLow = i.quantity <= i.reorder_point;
      return filterStatus === 'low' ? isLow : !isLow;
    })
    .filter(i => !searchQuery || i.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const totalItems = items.length;
  const lowStockCount = items.filter(i => i.quantity <= i.reorder_point).length;
  const totalValue = items.reduce((s, i) => s + i.quantity * i.cost_per_unit, 0);
  const alerts = items.filter(i => i.quantity <= i.reorder_point);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventory</h1>
          <p className="text-sm text-zinc-500 mt-1">Track stock levels and manage supplies</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {alerts.length > 0 && (
        <div className="bg-seat-red/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-400">
                {alerts.length} item{alerts.length !== 1 ? 's' : ''} below reorder point
              </p>
              <p className="text-xs text-red-400/70 mt-1">
                {alerts.map(a => `${a.name} (${a.quantity} ${a.unit})`).join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Total Items" value={totalItems} subtitle="Unique inventory items" icon={<Package className="w-4 h-4" />} />
        <MetricCard
          title="Low Stock"
          value={lowStockCount}
          subtitle="Items below reorder point"
          icon={<AlertTriangle className="w-4 h-4" />}
          trend={lowStockCount > 0 ? { value: lowStockCount, positive: false } : undefined}
        />
        <MetricCard title="Inventory Value" value={`$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} subtitle="Total stock value" icon={<DollarSign className="w-4 h-4" />} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-seat-card border border-seat-border rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
          />
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="px-3 py-2 bg-seat-card border border-seat-border rounded-lg text-sm text-white focus:outline-none focus:border-zinc-500"
        >
          <option value="">All Categories</option>
          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as 'all' | 'low' | 'ok')}
          className="px-3 py-2 bg-seat-card border border-seat-border rounded-lg text-sm text-white focus:outline-none focus:border-zinc-500"
        >
          <option value="all">All Status</option>
          <option value="low">Low Stock</option>
          <option value="ok">In Stock</option>
        </select>
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <Package className="w-12 h-12 text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-500 font-medium">No inventory items found</p>
            <p className="text-xs text-zinc-600 mt-1">Add your first item to start tracking stock</p>
            <button
              onClick={openAdd}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-seat-red text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-seat-border">
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Category</th>
                  <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Quantity</th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Unit</th>
                  <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Reorder Pt</th>
                  <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Cost/Unit</th>
                  <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const isLow = item.quantity <= item.reorder_point;
                  return (
                    <tr key={item.id} className="border-b border-seat-border/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-white">{item.name}</p>
                        {item.supplier && <p className="text-xs text-zinc-600">{item.supplier}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">{item.category || 'Uncategorized'}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-mono font-medium ${isLow ? 'text-red-400' : 'text-white'}`}>
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">{item.unit}</td>
                      <td className="px-4 py-3 text-right text-sm text-zinc-500 font-mono">{item.reorder_point}</td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge isLow={isLow} />
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-zinc-400 font-mono">
                        ${item.cost_per_unit.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
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
        )}
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Inventory Item' : 'Add Inventory Item'}
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
            <TextInput value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. Chicken Breast" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Category</FieldLabel>
              <TextInput value={form.category} onChange={(v) => setForm({ ...form, category: v })} placeholder="e.g. Protein" />
            </div>
            <div>
              <FieldLabel>Supplier</FieldLabel>
              <TextInput value={form.supplier} onChange={(v) => setForm({ ...form, supplier: v })} placeholder="e.g. Sysco" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <FieldLabel>Quantity</FieldLabel>
              <TextInput type="number" value={form.quantity} onChange={(v) => setForm({ ...form, quantity: Number(v) || 0 })} />
            </div>
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
                  { label: 'heads', value: 'heads' },
                  { label: 'cases', value: 'cases' },
                ]}
              />
            </div>
            <div>
              <FieldLabel>Reorder Pt</FieldLabel>
              <TextInput type="number" value={form.reorder_point} onChange={(v) => setForm({ ...form, reorder_point: Number(v) || 0 })} />
            </div>
          </div>
          <div>
            <FieldLabel>Cost per Unit ($)</FieldLabel>
            <TextInput
              type="number"
              value={form.cost_per_unit}
              onChange={(v) => setForm({ ...form, cost_per_unit: Number(v) || 0 })}
            />
          </div>
        </div>
      </EditModal>
    </div>
  );
}
