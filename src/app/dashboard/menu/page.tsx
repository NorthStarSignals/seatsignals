'use client';

import { useState, useEffect } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import {
  UtensilsCrossed,
  Plus,
  Trash2,
  Check,
  DollarSign,
  Pencil,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
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

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  times_ordered: number;
  total_revenue: number;
  avg_rating: number | null;
  is_active: boolean;
  created_at: string;
}

interface PosItem {
  id: string;
  external_id: string;
  name: string;
  description: string | null;
  category: string | null;
  price_cents: number | null;
  currency: string;
  sku: string | null;
  image_url: string | null;
  is_active: boolean;
  synced_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const INITIAL: MenuItem[] = [
  { id: 'mi-1', name: 'Grilled Salmon', category: 'Entree', price: 28, cost: 9.5, times_ordered: 210, total_revenue: 5880, avg_rating: 4.6, is_active: true, created_at: '2026-02-01' },
  { id: 'mi-2', name: 'Filet Mignon', category: 'Entree', price: 48, cost: 17, times_ordered: 185, total_revenue: 8880, avg_rating: 4.8, is_active: true, created_at: '2026-02-01' },
  { id: 'mi-3', name: 'Caesar Salad', category: 'Appetizer', price: 14, cost: 3.2, times_ordered: 190, total_revenue: 2660, avg_rating: 4.0, is_active: true, created_at: '2026-02-01' },
  { id: 'mi-4', name: 'Chocolate Lava Cake', category: 'Dessert', price: 14, cost: 3.8, times_ordered: 280, total_revenue: 3920, avg_rating: 4.9, is_active: true, created_at: '2026-02-01' },
  { id: 'mi-5', name: 'Lobster Linguine', category: 'Entree', price: 42, cost: 16.5, times_ordered: 145, total_revenue: 6090, avg_rating: 4.7, is_active: true, created_at: '2026-02-01' },
  { id: 'mi-6', name: 'Truffle Fries', category: 'Side', price: 12, cost: 2.5, times_ordered: 160, total_revenue: 1920, avg_rating: 4.3, is_active: false, created_at: '2026-02-01' },
];

const CATEGORY_OPTIONS = ['Appetizer', 'Entree', 'Side', 'Dessert', 'Drink', 'Special'];

type Draft = { id?: string; name: string; category: string; price: string; cost: string };

const emptyDraft = (): Draft => ({ name: '', category: 'Entree', price: '', cost: '' });

export default function MenuManagementPage() {
  const { items, add, update, remove } = useCrudApi<MenuItem>('/api/menu-items');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MenuItem | null>(null);

  // Square-synced catalog (read-only mirror of POS). Empty if not connected.
  const [posItems, setPosItems] = useState<PosItem[]>([]);
  const [posSyncing, setPosSyncing] = useState(false);
  const [posLoaded, setPosLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/integrations/square/catalog')
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => setPosItems(d.items || []))
      .catch(() => {})
      .finally(() => setPosLoaded(true));
  }, []);

  const syncSquare = async () => {
    setPosSyncing(true);
    try {
      const res = await fetch('/api/integrations/square/sync-catalog', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Sync failed');
      toast.success(`Synced ${body.items} items from Square`);
      const r = await fetch('/api/integrations/square/catalog');
      setPosItems((await r.json()).items || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setPosSyncing(false);
    }
  };

  const openNew = () => setEditing(emptyDraft());
  const openEdit = (it: MenuItem) => setEditing({ id: it.id, name: it.name, category: it.category, price: String(it.price), cost: String(it.cost) });
  const closeModal = () => setEditing(null);

  const save = () => {
    if (!editing?.name.trim()) { toast.error('Name required'); return; }
    const price = parseFloat(editing.price) || 0;
    const cost = parseFloat(editing.cost) || 0;
    if (editing.id) {
      update(editing.id, { name: editing.name.trim(), category: editing.category, price, cost });
      toast.success('Item updated');
    } else {
      add({
        name: editing.name.trim(),
        category: editing.category,
        price,
        cost,
        times_ordered: 0,
        total_revenue: 0,
        avg_rating: null,
        is_active: true,
      });
      toast.success('Item added');
    }
    closeModal();
  };

  const toggleActive = (it: MenuItem) => {
    update(it.id, { is_active: !it.is_active });
    toast.success(!it.is_active ? 'Item activated' : 'Item paused');
  };

  const doDelete = () => {
    if (!confirmDelete) return;
    remove(confirmDelete.id);
    toast.success(`Removed ${confirmDelete.name}`);
    setConfirmDelete(null);
  };

  const categories = Array.from(new Set(items.map(i => i.category)));
  const filtered = filter === 'all' ? items : items.filter(i => i.category === filter);
  const totalItems = items.length;
  const activeItems = items.filter(i => i.is_active).length;
  const avgPrice = items.length > 0 ? Math.round(items.reduce((s, i) => s + i.price, 0) / items.length * 100) / 100 : 0;
  const totalMenuRevenue = items.reduce((s, i) => s + (i.total_revenue || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Menu Management</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage your menu items, pricing, and performance</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 transition-colors"
        >
          <Plus size={16} /> Add Item
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total Items" value={totalItems} icon={<UtensilsCrossed size={18} />} />
        <MetricCard title="Active" value={activeItems} subtitle={`${totalItems - activeItems} inactive`} icon={<Check size={18} />} />
        <MetricCard title="Avg Price" value={`$${avgPrice}`} icon={<DollarSign size={18} />} />
        <MetricCard title="Menu Revenue" value={`$${totalMenuRevenue.toLocaleString()}`} icon={<DollarSign size={18} />} />
      </div>

      {/* Square POS catalog — rendered only when connected */}
      {posLoaded && posItems.length > 0 && (
        <div className="bg-seat-card border border-green-500/20 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-seat-border bg-green-500/5">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-green-400" />
              <h3 className="text-sm font-semibold text-white">Square Catalog</h3>
              <span className="text-[10px] text-zinc-500">{posItems.length} items · read-only from POS</span>
            </div>
            <button
              onClick={syncSquare}
              disabled={posSyncing}
              className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-medium disabled:opacity-50"
            >
              <RefreshCw size={11} className={posSyncing ? 'animate-spin' : ''} />
              {posSyncing ? 'Syncing…' : 'Re-sync'}
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-seat-border">
                <th className="text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-2">Item</th>
                <th className="text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-2">Category</th>
                <th className="text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-2">SKU</th>
                <th className="text-right text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-2">Price</th>
              </tr>
            </thead>
            <tbody>
              {posItems.map(p => (
                <tr key={p.id} className="border-b border-seat-border/50 hover:bg-zinc-800/30">
                  <td className="px-4 py-2 text-sm text-white">{p.name}</td>
                  <td className="px-4 py-2"><span className="text-xs text-zinc-400 px-2 py-0.5 bg-zinc-800 rounded">{p.category || '—'}</span></td>
                  <td className="px-4 py-2 text-xs text-zinc-500 font-mono">{p.sku || '—'}</td>
                  <td className="px-4 py-2 text-right text-sm text-white">
                    {p.price_cents != null ? `$${(p.price_cents / 100).toFixed(2)}` : 'Variable'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty-state prompt to connect Square */}
      {posLoaded && posItems.length === 0 && (
        <div className="bg-seat-card border border-dashed border-seat-border rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap size={16} className="text-zinc-500" />
            <div>
              <p className="text-sm text-zinc-300">Auto-sync your menu from a POS</p>
              <p className="text-xs text-zinc-500">Connect Square to pull your catalog automatically.</p>
            </div>
          </div>
          <Link
            href="/dashboard/settings/integrations"
            className="text-xs font-medium text-seat-red hover:underline"
          >
            Connect POS →
          </Link>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setFilter('all')}
          className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
            filter === 'all' ? 'bg-white text-black border-white' : 'bg-zinc-800 text-zinc-400 border-zinc-700')}>
          All ({items.length})
        </button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
              filter === cat ? 'bg-white text-black border-white' : 'bg-zinc-800 text-zinc-400 border-zinc-700')}>
            {cat} ({items.filter(i => i.category === cat).length})
          </button>
        ))}
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-seat-border">
              <th className="text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Item</th>
              <th className="text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Category</th>
              <th className="text-right text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Price</th>
              <th className="text-right text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Cost</th>
              <th className="text-right text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Margin</th>
              <th className="text-right text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Orders</th>
              <th className="text-center text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Active</th>
              <th className="text-right text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => {
              const margin = item.price > 0 ? Math.round(((item.price - item.cost) / item.price) * 100) : 0;
              return (
                <tr key={item.id} className="border-b border-seat-border/50 hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(item)}
                      className={cn('text-sm font-medium text-left hover:text-seat-red transition-colors', item.is_active ? 'text-white' : 'text-zinc-500 line-through')}>
                      {item.name}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-zinc-400 px-2 py-0.5 bg-zinc-800 rounded">{item.category}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-white">${item.price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-sm text-zinc-400">${item.cost.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn('text-sm font-medium', margin >= 60 ? 'text-green-400' : margin >= 30 ? 'text-amber-400' : 'text-red-400')}>
                      {margin}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-zinc-300">{item.times_ordered}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleActive(item)} className="text-zinc-400 hover:text-white transition-colors">
                      {item.is_active ? <ToggleRight size={20} className="text-green-400" /> : <ToggleLeft size={20} />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(item)} className="text-zinc-500 hover:text-white transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setConfirmDelete(item)} className="text-zinc-600 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <UtensilsCrossed size={32} className="mx-auto text-zinc-700 mb-2" />
            <p className="text-sm text-zinc-500">No menu items found</p>
          </div>
        )}
      </div>

      <EditModal
        open={!!editing}
        onClose={closeModal}
        title={editing?.id ? 'Edit Menu Item' : 'Add Menu Item'}
        footer={
          <>
            <GhostButton onClick={closeModal}>Cancel</GhostButton>
            <PrimaryButton onClick={save}>{editing?.id ? 'Save Changes' : 'Add Item'}</PrimaryButton>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <div>
              <FieldLabel>Name</FieldLabel>
              <TextInput value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} placeholder="e.g., Grilled Salmon" />
            </div>
            <div>
              <FieldLabel>Category</FieldLabel>
              <Select
                value={editing.category}
                onChange={(v) => setEditing({ ...editing, category: v })}
                options={CATEGORY_OPTIONS.map(c => ({ label: c, value: c }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Price ($)</FieldLabel>
                <TextInput type="number" value={editing.price} onChange={(v) => setEditing({ ...editing, price: v })} placeholder="0.00" />
              </div>
              <div>
                <FieldLabel>Cost ($)</FieldLabel>
                <TextInput type="number" value={editing.cost} onChange={(v) => setEditing({ ...editing, cost: v })} placeholder="0.00" />
              </div>
            </div>
          </div>
        )}
      </EditModal>

      <EditModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Menu Item?"
        subtitle={confirmDelete ? `This will remove "${confirmDelete.name}" permanently.` : undefined}
        footer={
          <>
            <GhostButton onClick={() => setConfirmDelete(null)}>Cancel</GhostButton>
            <DangerButton onClick={doDelete}>Delete</DangerButton>
          </>
        }
      >
        <p className="text-sm text-zinc-400">Are you sure you want to remove this item from your menu?</p>
      </EditModal>
    </div>
  );
}
