'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  Calculator,
  DollarSign,
  Plus,
  Trash2,
  TrendingUp,
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

interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
}

interface Dish {
  id: string;
  name: string;
  servings: number;
  target_pct: number;
  ingredients: Ingredient[];
}

const UNITS = ['oz', 'lb', 'each', 'cup', 'tbsp', 'tsp', 'g', 'kg', 'ml', 'L', 'bunch', 'head'];

const INITIAL: Dish[] = [
  {
    id: 'd1',
    name: 'Grilled Salmon Plate',
    servings: 4,
    target_pct: 30,
    ingredients: [
      { name: 'Salmon fillet', quantity: 24, unit: 'oz', cost_per_unit: 1.2 },
      { name: 'Asparagus', quantity: 1, unit: 'bunch', cost_per_unit: 3.5 },
      { name: 'Lemon', quantity: 2, unit: 'each', cost_per_unit: 0.75 },
      { name: 'Olive oil', quantity: 3, unit: 'tbsp', cost_per_unit: 0.3 },
    ],
  },
  {
    id: 'd2',
    name: 'Truffle Pasta',
    servings: 4,
    target_pct: 28,
    ingredients: [
      { name: 'Fresh pasta', quantity: 1, unit: 'lb', cost_per_unit: 6.5 },
      { name: 'Truffle oil', quantity: 2, unit: 'tbsp', cost_per_unit: 1.25 },
      { name: 'Parmesan', quantity: 0.5, unit: 'cup', cost_per_unit: 3.2 },
      { name: 'Heavy cream', quantity: 1, unit: 'cup', cost_per_unit: 1.8 },
    ],
  },
];

type Draft = Dish;

const emptyDraft = (): Draft => ({
  id: '',
  name: '',
  servings: 4,
  target_pct: 30,
  ingredients: [{ name: '', quantity: 0, unit: 'oz', cost_per_unit: 0 }],
});

function dishTotal(d: Dish): number {
  return d.ingredients.reduce((s, i) => s + i.quantity * i.cost_per_unit, 0);
}

export default function MenuCostingPage() {
  const { items: dishes, add, update, remove } = useCrudList<Dish>('seatsignals_menu_costing', INITIAL);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Dish | null>(null);

  const openNew = () => setEditing(emptyDraft());
  const openEdit = (d: Dish) => setEditing(JSON.parse(JSON.stringify(d)));

  const updateIng = (idx: number, field: keyof Ingredient, value: string | number) => {
    if (!editing) return;
    const ings = editing.ingredients.map((ing, i) => i === idx ? { ...ing, [field]: value } : ing);
    setEditing({ ...editing, ingredients: ings });
  };

  const addIng = () => {
    if (!editing) return;
    setEditing({ ...editing, ingredients: [...editing.ingredients, { name: '', quantity: 0, unit: 'oz', cost_per_unit: 0 }] });
  };

  const removeIng = (idx: number) => {
    if (!editing) return;
    setEditing({ ...editing, ingredients: editing.ingredients.filter((_, i) => i !== idx) });
  };

  const save = () => {
    if (!editing?.name.trim()) { toast.error('Dish name required'); return; }
    const cleaned = editing.ingredients.filter(i => i.name.trim());
    if (editing.id) {
      update(editing.id, { name: editing.name.trim(), servings: editing.servings, target_pct: editing.target_pct, ingredients: cleaned });
      toast.success('Dish updated');
    } else {
      add({ id: `d-${Date.now()}`, name: editing.name.trim(), servings: editing.servings, target_pct: editing.target_pct, ingredients: cleaned });
      toast.success('Dish saved');
    }
    setEditing(null);
  };

  const doDelete = () => {
    if (!confirmDelete) return;
    remove(confirmDelete.id);
    toast.success('Removed');
    setConfirmDelete(null);
  };

  const grandTotal = dishes.reduce((s, d) => s + dishTotal(d), 0);
  const avgCostPerServing = dishes.length
    ? dishes.reduce((s, d) => s + (d.servings > 0 ? dishTotal(d) / d.servings : 0), 0) / dishes.length
    : 0;
  const avgTarget = dishes.length ? Math.round(dishes.reduce((s, d) => s + d.target_pct, 0) / dishes.length) : 0;

  const editingTotal = editing ? editing.ingredients.reduce((s, i) => s + i.quantity * i.cost_per_unit, 0) : 0;
  const editingCostPerServing = editing && editing.servings > 0 ? editingTotal / editing.servings : 0;
  const editingSuggestedPrice = editing && editing.target_pct > 0 ? editingCostPerServing / (editing.target_pct / 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Calculator className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Menu Costing</h1>
            <p className="text-sm text-zinc-500">Calculate food cost and optimal pricing for each dish</p>
          </div>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90">
          <Plus size={14} /> New Dish
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Dishes" value={dishes.length} icon={<Calculator size={18} />} />
        <MetricCard title="Total Ingredient Cost" value={formatCurrency(grandTotal)} icon={<DollarSign size={18} />} />
        <MetricCard title="Avg Cost/Serving" value={formatCurrency(avgCostPerServing)} icon={<DollarSign size={18} />} />
        <MetricCard title="Avg Target %" value={`${avgTarget}%`} icon={<TrendingUp size={18} />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dishes.map(d => {
          const total = dishTotal(d);
          const costPerServing = d.servings > 0 ? total / d.servings : 0;
          const suggested = d.target_pct > 0 ? costPerServing / (d.target_pct / 100) : 0;
          return (
            <div key={d.id} className="bg-seat-card border border-seat-border rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-semibold">{d.name}</h3>
                  <p className="text-xs text-zinc-500">
                    {d.servings} servings · Target {d.target_pct}%
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(d)} className="text-zinc-500 hover:text-white"><Pencil size={14} /></button>
                  <button onClick={() => setConfirmDelete(d)} className="text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="space-y-1 mb-3">
                {d.ingredients.map((ing, i) => (
                  <div key={i} className="flex justify-between text-xs text-zinc-400">
                    <span>{ing.name} · {ing.quantity}{ing.unit}</span>
                    <span className="font-mono">{formatCurrency(ing.quantity * ing.cost_per_unit)}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-seat-border/40">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase">Total Cost</p>
                  <p className="text-sm font-semibold text-white">{formatCurrency(total)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase">Per Serving</p>
                  <p className="text-sm font-semibold text-white">{formatCurrency(costPerServing)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase">Suggested</p>
                  <p className={cn('text-sm font-semibold', 'text-green-400')}>{formatCurrency(suggested)}</p>
                </div>
              </div>
            </div>
          );
        })}
        {dishes.length === 0 && (
          <div className="col-span-full text-center py-12 bg-seat-card border border-seat-border rounded-xl">
            <Calculator size={32} className="mx-auto text-zinc-700 mb-2" />
            <p className="text-sm text-zinc-500">No dishes yet — click &ldquo;New Dish&rdquo; to start.</p>
          </div>
        )}
      </div>

      <EditModal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit Dish' : 'New Dish'}
        maxWidth="2xl"
        footer={
          <>
            <GhostButton onClick={() => setEditing(null)}>Cancel</GhostButton>
            <PrimaryButton onClick={save}>{editing?.id ? 'Save' : 'Create'}</PrimaryButton>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <FieldLabel>Dish Name</FieldLabel>
                <TextInput value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
              </div>
              <div>
                <FieldLabel>Servings</FieldLabel>
                <TextInput type="number" value={editing.servings} onChange={(v) => setEditing({ ...editing, servings: parseInt(v) || 1 })} />
              </div>
              <div>
                <FieldLabel>Target Food Cost %</FieldLabel>
                <TextInput type="number" value={editing.target_pct} onChange={(v) => setEditing({ ...editing, target_pct: parseFloat(v) || 0 })} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <FieldLabel>Ingredients</FieldLabel>
                <button type="button" onClick={addIng} className="text-xs text-seat-red hover:text-red-300 flex items-center gap-1">
                  <Plus size={12} /> Add
                </button>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-[10px] text-zinc-500 uppercase px-1">
                  <div className="col-span-4">Ingredient</div>
                  <div className="col-span-2">Quantity</div>
                  <div className="col-span-2">Unit</div>
                  <div className="col-span-2">$/Unit</div>
                  <div className="col-span-1 text-right">Total</div>
                  <div className="col-span-1"></div>
                </div>
                {editing.ingredients.map((ing, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <TextInput value={ing.name} onChange={(v) => updateIng(idx, 'name', v)} placeholder="Ingredient" />
                    </div>
                    <div className="col-span-2">
                      <TextInput type="number" value={ing.quantity || ''} onChange={(v) => updateIng(idx, 'quantity', parseFloat(v) || 0)} />
                    </div>
                    <div className="col-span-2">
                      <Select value={ing.unit} onChange={(v) => updateIng(idx, 'unit', v)} options={UNITS.map(u => ({ label: u, value: u }))} />
                    </div>
                    <div className="col-span-2">
                      <TextInput type="number" value={ing.cost_per_unit || ''} onChange={(v) => updateIng(idx, 'cost_per_unit', parseFloat(v) || 0)} />
                    </div>
                    <div className="col-span-1 text-right text-xs text-white font-medium font-mono">
                      {formatCurrency(ing.quantity * ing.cost_per_unit)}
                    </div>
                    <button type="button" onClick={() => removeIng(idx)} className="col-span-1 text-zinc-500 hover:text-red-400 flex justify-center">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-seat-border/40">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase">Total Cost</p>
                <p className="text-sm font-semibold text-white">{formatCurrency(editingTotal)}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase">Per Serving</p>
                <p className="text-sm font-semibold text-white">{formatCurrency(editingCostPerServing)}</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase">Suggested Price</p>
                <p className="text-sm font-semibold text-green-400">{formatCurrency(editingSuggestedPrice)}</p>
              </div>
            </div>
          </div>
        )}
      </EditModal>

      <EditModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Dish?"
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
