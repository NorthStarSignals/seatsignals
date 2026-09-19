'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import {
  Sparkles,
  Plus,
  Trash2,
  Pencil,
  Calendar,
  DollarSign,
  UtensilsCrossed,
} from 'lucide-react';
import { MetricCard } from '@/components/ui/metric-card';
import toast from 'react-hot-toast';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal,
  FieldLabel,
  TextInput,
  TextArea,
  Select,
  PrimaryButton,
  GhostButton,
  DangerButton,
} from '@/components/dashboard/edit-modal';

interface Special {
  id: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  day: string;
  type: 'lunch' | 'dinner' | 'all-day' | 'happy-hour';
  active: boolean;
  orders_today: number;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TYPES = [
  { value: 'lunch', label: 'Lunch', color: 'bg-blue-500/10 text-blue-400' },
  { value: 'dinner', label: 'Dinner', color: 'bg-purple-500/10 text-purple-400' },
  { value: 'all-day', label: 'All Day', color: 'bg-green-500/10 text-green-400' },
  { value: 'happy-hour', label: 'Happy Hour', color: 'bg-amber-500/10 text-amber-400' },
];

const INITIAL: Special[] = [
  { id: 's1', name: 'Half-Price Wings', description: 'Classic buffalo wings with ranch or blue cheese', price: 8, cost: 3.5, day: 'Monday', type: 'all-day', active: true, orders_today: 45 },
  { id: 's2', name: 'Taco Tuesday Trio', description: 'Three street tacos with your choice of protein', price: 12, cost: 4, day: 'Tuesday', type: 'all-day', active: true, orders_today: 62 },
  { id: 's3', name: '$5 Margaritas', description: 'House margarita — lime, strawberry, or mango', price: 5, cost: 1.5, day: 'Wednesday', type: 'happy-hour', active: true, orders_today: 38 },
  { id: 's4', name: 'Surf & Turf Special', description: '6oz filet + lobster tail with seasonal sides', price: 45, cost: 22, day: 'Thursday', type: 'dinner', active: true, orders_today: 18 },
  { id: 's5', name: 'Fish Fry Friday', description: 'Beer-battered cod with fries and coleslaw', price: 16, cost: 5.5, day: 'Friday', type: 'all-day', active: true, orders_today: 55 },
  { id: 's6', name: 'Brunch Burger', description: 'Wagyu patty, fried egg, bacon, truffle aioli', price: 22, cost: 9, day: 'Saturday', type: 'lunch', active: true, orders_today: 28 },
  { id: 's7', name: 'Prime Rib Night', description: '12oz slow-roasted prime rib with au jus', price: 38, cost: 18, day: 'Sunday', type: 'dinner', active: true, orders_today: 22 },
];

type Draft = {
  id?: string;
  name: string;
  description: string;
  price: string;
  cost: string;
  day: string;
  type: Special['type'];
};

const emptyDraft = (): Draft => ({ name: '', description: '', price: '', cost: '', day: 'Monday', type: 'dinner' });

export default function DailySpecialsPage() {
  const { items: specials, add, update, remove } = useCrudList<Special>('seatsignals_menu_specials', INITIAL);
  const [filterDay, setFilterDay] = useState('All');
  const [editing, setEditing] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Special | null>(null);

  const openNew = () => setEditing(emptyDraft());
  const openEdit = (s: Special) => setEditing({
    id: s.id, name: s.name, description: s.description,
    price: String(s.price), cost: String(s.cost), day: s.day, type: s.type,
  });

  const save = () => {
    if (!editing?.name.trim()) { toast.error('Name required'); return; }
    const data = {
      name: editing.name.trim(),
      description: editing.description,
      price: parseFloat(editing.price) || 0,
      cost: parseFloat(editing.cost) || 0,
      day: editing.day,
      type: editing.type,
    };
    if (editing.id) {
      update(editing.id, data);
      toast.success('Special updated');
    } else {
      add({ id: `s-${Date.now()}`, ...data, active: true, orders_today: 0 });
      toast.success('Special added');
    }
    setEditing(null);
  };

  const toggleActive = (s: Special) => {
    update(s.id, { active: !s.active });
  };

  const doDelete = () => {
    if (!confirmDelete) return;
    remove(confirmDelete.id);
    toast.success('Removed');
    setConfirmDelete(null);
  };

  const filtered = filterDay === 'All' ? specials : specials.filter(s => s.day === filterDay);
  const totalOrders = specials.reduce((s, sp) => s + sp.orders_today, 0);
  const totalRevenue = specials.reduce((s, sp) => s + sp.orders_today * sp.price, 0);
  const pricedSpecials = specials.filter(s => s.price > 0);
  const avgMargin = pricedSpecials.length > 0
    ? Math.round(pricedSpecials.reduce((s, sp) => s + ((sp.price - sp.cost) / sp.price) * 100, 0) / pricedSpecials.length)
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Daily Specials</h1>
            <p className="text-sm text-zinc-500">Manage daily specials and promotions</p>
          </div>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90">
          <Plus size={16} /> Add Special
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Today's Orders" value={totalOrders} icon={<UtensilsCrossed size={18} />} />
        <MetricCard title="Special Revenue" value={formatCurrency(totalRevenue)} icon={<DollarSign size={18} />} />
        <MetricCard title="Active Specials" value={specials.filter(s => s.active).length} icon={<Sparkles size={18} />} />
        <MetricCard title="Avg Margin" value={`${avgMargin}%`} icon={<DollarSign size={18} />} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {['All', ...DAYS].map(day => (
          <button key={day} onClick={() => setFilterDay(day)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
              filterDay === day ? 'bg-seat-red text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white')}>
            {day === 'All' ? 'All Days' : day.slice(0, 3)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(special => {
          const typeInfo = TYPES.find(t => t.value === special.type);
          const margin = special.price > 0 ? Math.round(((special.price - special.cost) / special.price) * 100) : 0;
          return (
            <div key={special.id} className={cn('bg-seat-card border rounded-xl p-4 transition-colors',
              special.active ? 'border-seat-border' : 'border-zinc-800 opacity-60')}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">{special.name}</h3>
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', typeInfo?.color)}>
                    {typeInfo?.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleActive(special)}
                    className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium',
                      special.active ? 'bg-green-500/10 text-green-400' : 'bg-zinc-800 text-zinc-500')}>
                    {special.active ? 'Active' : 'Paused'}
                  </button>
                  <button onClick={() => openEdit(special)} className="text-zinc-500 hover:text-white">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setConfirmDelete(special)} className="text-zinc-500 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-zinc-400 mb-3">{special.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1 text-zinc-400"><Calendar size={10} /> {special.day}</span>
                  <span className="text-white font-bold">{special.price > 0 ? formatCurrency(special.price) : 'FREE'}</span>
                  <span className={cn('font-medium', margin >= 60 ? 'text-green-400' : margin >= 40 ? 'text-amber-400' : 'text-red-400')}>
                    {margin}% margin
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500">Today</p>
                  <p className="text-sm font-bold text-white">{special.orders_today} orders</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <EditModal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit Special' : 'Add Special'}
        maxWidth="lg"
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
              <FieldLabel>Name</FieldLabel>
              <TextInput value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
            </div>
            <div>
              <FieldLabel>Description</FieldLabel>
              <TextArea value={editing.description} onChange={(v) => setEditing({ ...editing, description: v })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Price ($)</FieldLabel>
                <TextInput type="number" value={editing.price} onChange={(v) => setEditing({ ...editing, price: v })} />
              </div>
              <div>
                <FieldLabel>Cost ($)</FieldLabel>
                <TextInput type="number" value={editing.cost} onChange={(v) => setEditing({ ...editing, cost: v })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Day</FieldLabel>
                <Select
                  value={editing.day}
                  onChange={(v) => setEditing({ ...editing, day: v })}
                  options={DAYS.map(d => ({ label: d, value: d }))}
                />
              </div>
              <div>
                <FieldLabel>Type</FieldLabel>
                <Select
                  value={editing.type}
                  onChange={(v) => setEditing({ ...editing, type: v as Special['type'] })}
                  options={TYPES.map(t => ({ label: t.label, value: t.value }))}
                />
              </div>
            </div>
          </div>
        )}
      </EditModal>

      <EditModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Special?"
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
