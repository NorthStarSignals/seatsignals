'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  Check,
  X,
  Search,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal,
  FieldLabel,
  TextInput,
  PrimaryButton,
  GhostButton,
  DangerButton,
} from '@/components/dashboard/edit-modal';

const ALLERGENS = ['Gluten', 'Dairy', 'Eggs', 'Fish', 'Shellfish', 'Nuts', 'Peanuts', 'Soy', 'Sesame'];
const DIETARY_TAGS = ['Vegan', 'Vegetarian', 'GF', 'Keto', 'Halal'];

interface MenuItem {
  id: string;
  name: string;
  category: string;
  allergens: string[];
  dietary: string[];
}

const INITIAL: MenuItem[] = [
  { id: 'a1', name: 'Crispy Calamari', category: 'Appetizers', allergens: ['Gluten', 'Shellfish'], dietary: [] },
  { id: 'a2', name: 'Burrata & Tomato', category: 'Appetizers', allergens: ['Dairy'], dietary: ['Vegetarian'] },
  { id: 'a3', name: 'Tuna Tartare', category: 'Appetizers', allergens: ['Fish', 'Gluten', 'Sesame'], dietary: [] },
  { id: 'a4', name: 'French Onion Soup', category: 'Appetizers', allergens: ['Dairy', 'Gluten'], dietary: ['Vegetarian'] },
  { id: 'a5', name: 'Grilled Salmon', category: 'Entrées', allergens: ['Fish', 'Dairy'], dietary: [] },
  { id: 'a6', name: 'Filet Mignon', category: 'Entrées', allergens: ['Dairy'], dietary: [] },
  { id: 'a7', name: 'Mushroom Risotto', category: 'Entrées', allergens: ['Dairy'], dietary: ['Vegetarian'] },
  { id: 'a8', name: 'Pan-Seared Duck', category: 'Entrées', allergens: [], dietary: [] },
  { id: 'a9', name: 'Lobster Linguine', category: 'Entrées', allergens: ['Shellfish', 'Gluten'], dietary: [] },
  { id: 'a10', name: 'Impossible Burger', category: 'Entrées', allergens: ['Gluten', 'Soy'], dietary: ['Vegan'] },
  { id: 'a11', name: 'Caesar Salad', category: 'Salads', allergens: ['Dairy', 'Gluten', 'Eggs', 'Fish'], dietary: [] },
  { id: 'a12', name: 'Kale & Quinoa', category: 'Salads', allergens: [], dietary: ['Vegan', 'GF'] },
  { id: 'a13', name: 'Chocolate Lava Cake', category: 'Desserts', allergens: ['Dairy', 'Gluten', 'Eggs'], dietary: ['Vegetarian'] },
  { id: 'a14', name: 'Crème Brûlée', category: 'Desserts', allergens: ['Dairy', 'Eggs'], dietary: ['Vegetarian', 'GF'] },
  { id: 'a15', name: 'Tiramisu', category: 'Desserts', allergens: ['Dairy', 'Gluten', 'Eggs'], dietary: ['Vegetarian'] },
];

type Draft = { id?: string; name: string; category: string; allergens: string[]; dietary: string[] };

const emptyDraft = (): Draft => ({ name: '', category: 'Entrées', allergens: [], dietary: [] });

export default function AllergenMatrixPage() {
  const { items, add, update, remove } = useCrudList<MenuItem>('seatsignals_menu_allergens', INITIAL);
  const [search, setSearch] = useState('');
  const [filterAllergen, setFilterAllergen] = useState<string | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MenuItem | null>(null);

  const filtered = items.filter(item => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterAllergen === 'safe') return !item.allergens.length;
    if (filterAllergen && filterAllergen !== 'safe') return item.allergens.includes(filterAllergen);
    return true;
  });

  const categories = Array.from(new Set(filtered.map(i => i.category)));

  const allergenCounts = ALLERGENS.map(a => ({
    name: a,
    count: items.filter(i => i.allergens.includes(a)).length,
  })).sort((a, b) => b.count - a.count);

  const openEdit = (it: MenuItem) => setEditing({ id: it.id, name: it.name, category: it.category, allergens: [...it.allergens], dietary: [...it.dietary] });

  const toggleTag = (key: 'allergens' | 'dietary', tag: string) => {
    if (!editing) return;
    const list = editing[key];
    setEditing({
      ...editing,
      [key]: list.includes(tag) ? list.filter(t => t !== tag) : [...list, tag],
    });
  };

  const save = () => {
    if (!editing?.name.trim()) { toast.error('Name required'); return; }
    const data = { name: editing.name.trim(), category: editing.category, allergens: editing.allergens, dietary: editing.dietary };
    if (editing.id) {
      update(editing.id, data);
      toast.success('Allergens updated');
    } else {
      add({ id: `a-${Date.now()}`, ...data });
      toast.success('Item added');
    }
    setEditing(null);
  };

  const doDelete = () => {
    if (!confirmDelete) return;
    remove(confirmDelete.id);
    toast.success('Removed');
    setConfirmDelete(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Allergen Matrix</h1>
            <p className="text-sm text-zinc-500">Complete allergen information for all menu items</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..."
              className="pl-9 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-seat-red w-56" />
          </div>
          <button onClick={() => setEditing(emptyDraft())}
            className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90">
            <Plus size={14} /> Add Item
          </button>
        </div>
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Allergen Prevalence</h3>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterAllergen(null)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              !filterAllergen ? 'bg-seat-red text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white')}>
            All ({items.length})
          </button>
          {allergenCounts.map(a => (
            <button key={a.name} onClick={() => setFilterAllergen(filterAllergen === a.name ? null : a.name)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                filterAllergen === a.name ? 'bg-amber-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white')}>
              {a.name} ({a.count})
            </button>
          ))}
          <button onClick={() => setFilterAllergen(filterAllergen === 'safe' ? null : 'safe')}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              filterAllergen === 'safe' ? 'bg-green-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white')}>
            Allergen-Free ({items.filter(i => !i.allergens.length).length})
          </button>
        </div>
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-seat-border">
              <th className="text-left py-3 px-3 text-[10px] text-zinc-500 uppercase w-48">Menu Item</th>
              {ALLERGENS.map(a => (
                <th key={a} className="text-center py-3 px-1 text-[10px] text-zinc-500 uppercase min-w-[60px]">
                  {a}
                </th>
              ))}
              <th className="text-left py-3 px-3 text-[10px] text-zinc-500 uppercase">Dietary</th>
              <th className="text-right py-3 px-3 text-[10px] text-zinc-500 uppercase w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <CategoryRows
                key={`cat-${cat}`}
                cat={cat}
                items={filtered.filter(i => i.category === cat)}
                onEdit={openEdit}
                onDelete={setConfirmDelete}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Important Notes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500/10"><X size={10} className="text-red-400" /></span>
              <span className="text-zinc-300">Contains allergen</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500/10"><Check size={10} className="text-green-400" /></span>
              <span className="text-zinc-300">Free from allergen</span>
            </div>
          </div>
          <div className="text-xs text-zinc-500 space-y-1">
            <p>• All items are prepared in a kitchen that processes common allergens.</p>
            <p>• Cross-contamination cannot be fully eliminated.</p>
            <p>• Please inform your server of any allergies before ordering.</p>
            <p>• This matrix is updated as of {new Date().toLocaleDateString()}.</p>
          </div>
        </div>
      </div>

      <EditModal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit Allergens' : 'Add Menu Item'}
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Item Name</FieldLabel>
                <TextInput value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
              </div>
              <div>
                <FieldLabel>Category</FieldLabel>
                <TextInput value={editing.category} onChange={(v) => setEditing({ ...editing, category: v })} />
              </div>
            </div>
            <div>
              <FieldLabel>Allergens</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {ALLERGENS.map(a => (
                  <button key={a} type="button"
                    onClick={() => toggleTag('allergens', a)}
                    className={cn('px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                      editing.allergens.includes(a)
                        ? 'bg-red-500/20 text-red-400 border-red-500/40'
                        : 'bg-zinc-800 text-zinc-500 border-zinc-700')}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel>Dietary Tags</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {DIETARY_TAGS.map(d => (
                  <button key={d} type="button"
                    onClick={() => toggleTag('dietary', d)}
                    className={cn('px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                      editing.dietary.includes(d)
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-zinc-800 text-zinc-500 border-zinc-700')}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </EditModal>

      <EditModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Item?"
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

function CategoryRows({
  cat,
  items,
  onEdit,
  onDelete,
}: {
  cat: string;
  items: MenuItem[];
  onEdit: (i: MenuItem) => void;
  onDelete: (i: MenuItem) => void;
}) {
  return (
    <>
      <tr>
        <td colSpan={ALLERGENS.length + 3} className="pt-4 pb-1 px-3">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{cat}</span>
        </td>
      </tr>
      {items.map(item => (
        <tr key={item.id} className="border-b border-seat-border/20 hover:bg-zinc-800/30">
          <td className="py-2.5 px-3 text-white font-medium">{item.name}</td>
          {ALLERGENS.map(a => (
            <td key={a} className="py-2.5 px-1 text-center">
              {item.allergens.includes(a) ? (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500/10">
                  <X size={12} className="text-red-400" />
                </span>
              ) : (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500/10">
                  <Check size={12} className="text-green-400" />
                </span>
              )}
            </td>
          ))}
          <td className="py-2.5 px-3">
            <div className="flex gap-1 flex-wrap">
              {item.dietary.map(d => (
                <span key={d} className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium',
                  d === 'Vegan' ? 'bg-green-500/10 text-green-400' :
                  d === 'Vegetarian' ? 'bg-emerald-500/10 text-emerald-400' :
                  'bg-amber-500/10 text-amber-400')}>
                  {d}
                </span>
              ))}
              {item.allergens.length === 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-green-500/10 text-green-400">
                  Allergen-Free
                </span>
              )}
            </div>
          </td>
          <td className="py-2.5 px-3 text-right">
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => onEdit(item)} className="text-zinc-500 hover:text-white"><Pencil size={12} /></button>
              <button onClick={() => onDelete(item)} className="text-zinc-600 hover:text-red-400"><Trash2 size={12} /></button>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}
