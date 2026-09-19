'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { cn, formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  BookOpen,
  AlertTriangle,
  Leaf,
  DollarSign,
  Clock,
  Plus,
  Search,
  Pencil,
  Trash2,
} from 'lucide-react';
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

interface Recipe {
  id: string;
  name: string;
  category: string;
  prep_time_min: number;
  cook_time_min: number;
  yield_servings: number;
  food_cost: number;
  sell_price: number;
  allergens: string[];
  dietary_tags: string[];
  instructions: string;
  is_active: boolean;
}

const CATEGORIES = ['appetizer', 'entree', 'dessert', 'drink', 'side', 'sauce'];
const ALLERGENS = ['gluten', 'dairy', 'nuts', 'shellfish', 'eggs', 'soy', 'fish', 'sesame'];
const DIETARY_TAGS = ['vegan', 'vegetarian', 'gf', 'keto', 'halal'];

const ALLERGEN_COLORS: Record<string, string> = {
  gluten: 'bg-red-500/15 text-red-400 border-red-500/20',
  dairy: 'bg-red-500/15 text-red-400 border-red-500/20',
  nuts: 'bg-red-500/15 text-red-400 border-red-500/20',
  shellfish: 'bg-red-500/15 text-red-400 border-red-500/20',
  eggs: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  soy: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  fish: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  sesame: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
};

const DIETARY_COLORS: Record<string, string> = {
  vegan: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  vegetarian: 'bg-green-500/15 text-green-400 border-green-500/20',
  gf: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  keto: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  halal: 'bg-teal-500/15 text-teal-400 border-teal-500/20',
};

const INITIAL: Recipe[] = [
  { id: 'r1', name: 'Pan-Seared Salmon', category: 'entree', prep_time_min: 10, cook_time_min: 12, yield_servings: 1, food_cost: 7.5, sell_price: 28, allergens: ['fish'], dietary_tags: ['gf'], instructions: 'Pat salmon dry. Sear skin-side down 4 min. Flip and finish 3 min.', is_active: true },
  { id: 'r2', name: 'Caesar Salad', category: 'appetizer', prep_time_min: 8, cook_time_min: 0, yield_servings: 2, food_cost: 3.2, sell_price: 14, allergens: ['dairy', 'gluten', 'eggs', 'fish'], dietary_tags: ['vegetarian'], instructions: 'Toss romaine with dressing. Top with parm and croutons.', is_active: true },
  { id: 'r3', name: 'Chocolate Lava Cake', category: 'dessert', prep_time_min: 15, cook_time_min: 11, yield_servings: 4, food_cost: 3.8, sell_price: 14, allergens: ['dairy', 'gluten', 'eggs'], dietary_tags: ['vegetarian'], instructions: 'Melt chocolate + butter. Whisk eggs+sugar. Combine. Bake 11 min at 425F.', is_active: true },
];

type Draft = {
  id?: string;
  name: string;
  category: string;
  prep_time_min: string;
  cook_time_min: string;
  yield_servings: string;
  food_cost: string;
  sell_price: string;
  allergens: string[];
  dietary_tags: string[];
  instructions: string;
};

const emptyDraft = (): Draft => ({
  name: '', category: 'entree',
  prep_time_min: '', cook_time_min: '', yield_servings: '1',
  food_cost: '', sell_price: '',
  allergens: [], dietary_tags: [],
  instructions: '',
});

function marginPct(r: Recipe) {
  return r.sell_price > 0 ? ((r.sell_price - r.food_cost) / r.sell_price) * 100 : 0;
}

export default function RecipesPage() {
  const { items: recipes, add, update, remove } = useCrudList<Recipe>('seatsignals_recipes', INITIAL);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterAllergen, setFilterAllergen] = useState('');
  const [editing, setEditing] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Recipe | null>(null);

  const filtered = recipes.filter(r => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCategory && r.category !== filterCategory) return false;
    if (filterAllergen && !r.allergens.includes(filterAllergen)) return false;
    return true;
  });

  const stats = {
    total_recipes: recipes.length,
    active_count: recipes.filter(r => r.is_active).length,
    avg_food_cost_pct: recipes.length
      ? Math.round(recipes.reduce((s, r) => s + (r.sell_price > 0 ? (r.food_cost / r.sell_price) * 100 : 0), 0) / recipes.length)
      : 0,
    allergen_alerts: recipes.reduce((s, r) => s + r.allergens.length, 0),
  };

  const openNew = () => setEditing(emptyDraft());
  const openEdit = (r: Recipe) => setEditing({
    id: r.id,
    name: r.name,
    category: r.category,
    prep_time_min: String(r.prep_time_min),
    cook_time_min: String(r.cook_time_min),
    yield_servings: String(r.yield_servings),
    food_cost: String(r.food_cost),
    sell_price: String(r.sell_price),
    allergens: [...r.allergens],
    dietary_tags: [...r.dietary_tags],
    instructions: r.instructions,
  });

  const toggleTag = (key: 'allergens' | 'dietary_tags', tag: string) => {
    if (!editing) return;
    const list = editing[key];
    setEditing({ ...editing, [key]: list.includes(tag) ? list.filter(x => x !== tag) : [...list, tag] });
  };

  const save = () => {
    if (!editing?.name.trim()) { toast.error('Name required'); return; }
    const data = {
      name: editing.name.trim(),
      category: editing.category,
      prep_time_min: parseInt(editing.prep_time_min) || 0,
      cook_time_min: parseInt(editing.cook_time_min) || 0,
      yield_servings: parseInt(editing.yield_servings) || 1,
      food_cost: parseFloat(editing.food_cost) || 0,
      sell_price: parseFloat(editing.sell_price) || 0,
      allergens: editing.allergens,
      dietary_tags: editing.dietary_tags,
      instructions: editing.instructions,
    };
    if (editing.id) {
      update(editing.id, data);
      toast.success('Recipe updated');
    } else {
      add({ id: `r-${Date.now()}`, ...data, is_active: true });
      toast.success('Recipe created');
    }
    setEditing(null);
  };

  const doDelete = () => {
    if (!confirmDelete) return;
    remove(confirmDelete.id);
    toast.success('Recipe removed');
    setConfirmDelete(null);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Recipes & Allergens</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage recipes, track costs, and monitor allergens</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors">
          <Plus className="w-4 h-4" /> New Recipe
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Total Recipes" value={stats.total_recipes} icon={<BookOpen className="w-4 h-4" />} />
        <MetricCard title="Avg Food Cost %" value={`${stats.avg_food_cost_pct}%`} icon={<DollarSign className="w-4 h-4" />} />
        <MetricCard title="Active Items" value={stats.active_count} icon={<Leaf className="w-4 h-4" />} />
        <MetricCard title="Allergen Alerts" value={stats.allergen_alerts} icon={<AlertTriangle className="w-4 h-4" />} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input type="text" placeholder="Search recipes..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-seat-card border border-seat-border rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500" />
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="px-3 py-2 bg-seat-card border border-seat-border rounded-lg text-sm text-white focus:outline-none focus:border-zinc-500">
          <option value="">All Categories</option>
          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>)}
        </select>
        <select value={filterAllergen} onChange={e => setFilterAllergen(e.target.value)}
          className="px-3 py-2 bg-seat-card border border-seat-border rounded-lg text-sm text-white focus:outline-none focus:border-zinc-500">
          <option value="">All Allergens</option>
          {ALLERGENS.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-seat-card border border-seat-border rounded-xl flex flex-col items-center justify-center py-16 px-4">
            <BookOpen className="w-12 h-12 text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-500 font-medium">No recipes found</p>
            <p className="text-xs text-zinc-600 mt-1">Try adjusting your filters or add a new recipe</p>
          </div>
        ) : (
          filtered.map(recipe => {
            const margin = marginPct(recipe);
            return (
              <div key={recipe.id} className="bg-seat-card border border-seat-border rounded-xl overflow-hidden hover:border-zinc-600 transition-colors">
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white truncate">{recipe.name}</h3>
                        {!recipe.is_active && <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400">Inactive</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded capitalize">{recipe.category}</span>
                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {recipe.prep_time_min + recipe.cook_time_min} min
                        </span>
                        <span className="text-xs text-zinc-500">{formatCurrency(recipe.sell_price)}</span>
                        <span className="text-xs text-zinc-500">Cost: {formatCurrency(recipe.food_cost)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                      {recipe.allergens.map(a => (
                        <span key={a}
                          className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border capitalize',
                            ALLERGEN_COLORS[a] || 'bg-zinc-700 text-zinc-300 border-zinc-600')}>
                          {a}
                        </span>
                      ))}
                      {recipe.dietary_tags.map(d => (
                        <span key={d}
                          className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border',
                            DIETARY_COLORS[d] || 'bg-zinc-700 text-zinc-300 border-zinc-600')}>
                          {d}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        margin >= 65 ? 'bg-emerald-500/15 text-emerald-400'
                        : margin >= 50 ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-red-500/15 text-red-400')}>
                        {margin.toFixed(1)}%
                      </span>
                      <button onClick={() => openEdit(recipe)} className="text-zinc-500 hover:text-white"><Pencil size={14} /></button>
                      <button onClick={() => setConfirmDelete(recipe)} className="text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <EditModal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit Recipe' : 'New Recipe'}
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Name</FieldLabel>
                <TextInput value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
              </div>
              <div>
                <FieldLabel>Category</FieldLabel>
                <Select
                  value={editing.category}
                  onChange={(v) => setEditing({ ...editing, category: v })}
                  options={CATEGORIES.map(c => ({ label: c.charAt(0).toUpperCase() + c.slice(1), value: c }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <FieldLabel>Prep (min)</FieldLabel>
                <TextInput type="number" value={editing.prep_time_min} onChange={(v) => setEditing({ ...editing, prep_time_min: v })} />
              </div>
              <div>
                <FieldLabel>Cook (min)</FieldLabel>
                <TextInput type="number" value={editing.cook_time_min} onChange={(v) => setEditing({ ...editing, cook_time_min: v })} />
              </div>
              <div>
                <FieldLabel>Yield</FieldLabel>
                <TextInput type="number" value={editing.yield_servings} onChange={(v) => setEditing({ ...editing, yield_servings: v })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Food Cost ($)</FieldLabel>
                <TextInput type="number" value={editing.food_cost} onChange={(v) => setEditing({ ...editing, food_cost: v })} />
              </div>
              <div>
                <FieldLabel>Sell Price ($)</FieldLabel>
                <TextInput type="number" value={editing.sell_price} onChange={(v) => setEditing({ ...editing, sell_price: v })} />
              </div>
            </div>
            <div>
              <FieldLabel>Allergens</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {ALLERGENS.map(a => (
                  <button key={a} type="button"
                    onClick={() => toggleTag('allergens', a)}
                    className={cn('px-2.5 py-1 rounded-full text-xs font-medium border transition-colors capitalize',
                      editing.allergens.includes(a) ? ALLERGEN_COLORS[a] : 'bg-zinc-800 text-zinc-500 border-zinc-700')}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel>Dietary</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {DIETARY_TAGS.map(d => (
                  <button key={d} type="button"
                    onClick={() => toggleTag('dietary_tags', d)}
                    className={cn('px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                      editing.dietary_tags.includes(d) ? DIETARY_COLORS[d] : 'bg-zinc-800 text-zinc-500 border-zinc-700')}>
                    {d.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel>Instructions</FieldLabel>
              <TextArea value={editing.instructions} onChange={(v) => setEditing({ ...editing, instructions: v })} rows={4} />
            </div>
          </div>
        )}
      </EditModal>

      <EditModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Recipe?"
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
