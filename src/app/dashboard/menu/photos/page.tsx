'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import {
  Camera,
  Upload,
  ImagePlus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Filter,
  Trash2,
  Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';
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

interface MenuPhotoItem {
  id: string;
  name: string;
  category: string;
  photoUrl: string;
  price: number;
  lastUpdated: string;
}

const CATEGORY_OPTIONS = ['Appetizer', 'Entree', 'Side', 'Dessert', 'Beverage'];

const INITIAL: MenuPhotoItem[] = [
  { id: '1', name: 'Grilled Salmon', category: 'Entree', photoUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400', price: 28.00, lastUpdated: '2026-04-07' },
  { id: '2', name: 'Caesar Salad', category: 'Appetizer', photoUrl: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?w=400', price: 14.00, lastUpdated: '2026-04-05' },
  { id: '3', name: 'Ribeye Steak', category: 'Entree', photoUrl: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400', price: 42.00, lastUpdated: '2026-04-06' },
  { id: '4', name: 'Truffle Fries', category: 'Side', photoUrl: '', price: 12.00, lastUpdated: '2026-03-20' },
  { id: '5', name: 'Lobster Bisque', category: 'Appetizer', photoUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400', price: 16.00, lastUpdated: '2026-04-01' },
  { id: '6', name: 'Chocolate Lava Cake', category: 'Dessert', photoUrl: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400', price: 14.00, lastUpdated: '2026-04-03' },
  { id: '7', name: 'Margherita Pizza', category: 'Entree', photoUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400', price: 18.00, lastUpdated: '2026-04-08' },
  { id: '8', name: 'Garlic Bread', category: 'Side', photoUrl: '', price: 8.00, lastUpdated: '2026-03-15' },
];

type PhotoFilter = 'all' | 'with' | 'missing';

type Draft = { id?: string; name: string; category: string; price: string; photoUrl: string };

const emptyDraft = (): Draft => ({ name: '', category: 'Entree', price: '', photoUrl: '' });

export default function MenuPhotosPage() {
  const { items, add, update, remove } = useCrudList<MenuPhotoItem>('seatsignals_menu_photos', INITIAL);
  const [filter, setFilter] = useState<PhotoFilter>('all');
  const [editing, setEditing] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MenuPhotoItem | null>(null);

  const withPhotos = items.filter((i) => !!i.photoUrl).length;
  const totalItems = items.length;

  const filtered = items.filter((item) => {
    if (filter === 'with') return !!item.photoUrl;
    if (filter === 'missing') return !item.photoUrl;
    return true;
  });

  const openNew = () => setEditing(emptyDraft());
  const openEdit = (it: MenuPhotoItem) => setEditing({ id: it.id, name: it.name, category: it.category, price: String(it.price), photoUrl: it.photoUrl });

  const save = () => {
    if (!editing?.name.trim()) { toast.error('Name required'); return; }
    const data = {
      name: editing.name.trim(),
      category: editing.category,
      price: parseFloat(editing.price) || 0,
      photoUrl: editing.photoUrl.trim(),
      lastUpdated: new Date().toISOString().slice(0, 10),
    };
    if (editing.id) {
      update(editing.id, data);
      toast.success('Photo updated');
    } else {
      add({ id: `ph-${Date.now()}`, ...data });
      toast.success('Photo added');
    }
    setEditing(null);
  };

  const doDelete = () => {
    if (!confirmDelete) return;
    remove(confirmDelete.id);
    toast.success('Photo removed');
    setConfirmDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Camera className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Menu Photos</h1>
            <p className="text-sm text-zinc-500">Manage and optimize photos for your menu items</p>
          </div>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-seat-red hover:bg-seat-red/90 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Upload className="w-4 h-4" />
          Add Photo
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Items with Photos"
          value={`${withPhotos}/${totalItems}`}
          subtitle={totalItems > 0 ? `${Math.round((withPhotos / totalItems) * 100)}% coverage` : '—'}
          trend={{ value: 12, positive: true }}
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <MetricCard
          title="Photo Quality Score"
          value="87/100"
          subtitle="Based on resolution & lighting"
          trend={{ value: 5, positive: true }}
          icon={<Zap className="w-4 h-4" />}
        />
        <MetricCard
          title="Avg Load Time"
          value="1.2s"
          subtitle="Optimized for mobile"
          trend={{ value: 8, positive: true }}
          icon={<Clock className="w-4 h-4" />}
        />
      </div>

      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-zinc-500" />
        {(['all', 'with', 'missing'] as PhotoFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
              filter === f
                ? 'bg-seat-red text-white'
                : 'bg-seat-card text-zinc-400 border border-seat-border hover:border-zinc-600'
            )}
          >
            {f === 'all' ? 'All Items' : f === 'with' ? 'With Photos' : 'Missing Photos'}
          </button>
        ))}
        <span className="text-xs text-zinc-600 ml-2">
          {filtered.length} item{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-seat-card border border-seat-border rounded-xl overflow-hidden hover:border-zinc-600 transition-all group"
          >
            <div className="relative aspect-[4/3]">
              {item.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-zinc-800/50 flex flex-col items-center justify-center gap-2">
                  <ImagePlus className="w-8 h-8 text-zinc-600" />
                  <span className="text-xs text-zinc-600">No photo</span>
                </div>
              )}
              <div className="absolute top-2 right-2 flex gap-1">
                <button onClick={() => openEdit(item)}
                  className="w-7 h-7 rounded-lg bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setConfirmDelete(item)}
                  className="w-7 h-7 rounded-lg bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="absolute top-2 left-2">
                <div
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium backdrop-blur-sm',
                    item.photoUrl
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/20 text-amber-400'
                  )}
                >
                  {item.photoUrl ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <AlertCircle className="w-3 h-3" />
                  )}
                  {item.photoUrl ? 'Photo' : 'Missing'}
                </div>
              </div>
            </div>

            <div className="p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white truncate">{item.name}</h3>
                <span className="text-xs text-zinc-500 shrink-0 ml-2">{formatCurrency(item.price)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-md">
                  {item.category}
                </span>
                <span className="text-[11px] text-zinc-600">
                  {new Date(item.lastUpdated).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <EditModal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit Photo' : 'Add Photo'}
        footer={
          <>
            <GhostButton onClick={() => setEditing(null)}>Cancel</GhostButton>
            <PrimaryButton onClick={save}>{editing?.id ? 'Save' : 'Add'}</PrimaryButton>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <div>
              <FieldLabel>Item Name</FieldLabel>
              <TextInput value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} placeholder="e.g., Truffle Fries" />
            </div>
            <div>
              <FieldLabel>Category</FieldLabel>
              <Select
                value={editing.category}
                onChange={(v) => setEditing({ ...editing, category: v })}
                options={CATEGORY_OPTIONS.map(c => ({ label: c, value: c }))}
              />
            </div>
            <div>
              <FieldLabel>Price ($)</FieldLabel>
              <TextInput type="number" value={editing.price} onChange={(v) => setEditing({ ...editing, price: v })} />
            </div>
            <div>
              <FieldLabel>Photo URL</FieldLabel>
              <TextInput value={editing.photoUrl} onChange={(v) => setEditing({ ...editing, photoUrl: v })} placeholder="https://..." />
            </div>
            {editing.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={editing.photoUrl} alt="preview" className="w-full aspect-video object-cover rounded-lg border border-seat-border" />
            )}
          </div>
        )}
      </EditModal>

      <EditModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Photo?"
        footer={
          <>
            <GhostButton onClick={() => setConfirmDelete(null)}>Cancel</GhostButton>
            <DangerButton onClick={doDelete}>Delete</DangerButton>
          </>
        }
      >
        <p className="text-sm text-zinc-400">Remove {confirmDelete?.name}?</p>
      </EditModal>
    </div>
  );
}
