'use client';

import { useState } from 'react';
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
import toast from 'react-hot-toast';
import { MetricCard } from '@/components/ui/metric-card';
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ItemStatus = 'pass' | 'fail' | 'na' | 'pending';
type ItemPriority = 'critical' | 'major' | 'minor';

interface ChecklistItem {
  id: string;
  item: string;
  status: ItemStatus;
  priority: ItemPriority;
  notes: string;
  last_checked: string | null;
}

interface Checklist {
  id: string;
  category: string;
  items: ChecklistItem[];
}

const INITIAL: Checklist[] = [
  {
    id: 'CL1',
    category: 'Food Storage & Handling',
    items: [
      { id: 'I1', item: 'Refrigerator temps logged (< 40°F)', status: 'pass', priority: 'critical', notes: '', last_checked: null },
      { id: 'I2', item: 'Raw meat stored below ready-to-eat foods', status: 'pass', priority: 'critical', notes: '', last_checked: null },
      { id: 'I3', item: 'Date labels on all prepped items', status: 'fail', priority: 'major', notes: 'Missing labels on salsa containers', last_checked: null },
    ],
  },
  {
    id: 'CL2',
    category: 'Cleaning & Sanitation',
    items: [
      { id: 'I4', item: 'Sanitizer buckets at proper concentration', status: 'pass', priority: 'critical', notes: '', last_checked: null },
      { id: 'I5', item: 'Hand sinks stocked with soap + towels', status: 'pass', priority: 'critical', notes: '', last_checked: null },
      { id: 'I6', item: 'Floor drains clean', status: 'pending', priority: 'minor', notes: '', last_checked: null },
    ],
  },
  {
    id: 'CL3',
    category: 'Pest Control',
    items: [
      { id: 'I7', item: 'Pest control log current', status: 'pass', priority: 'major', notes: '', last_checked: null },
      { id: 'I8', item: 'No visible signs of pests', status: 'fail', priority: 'critical', notes: 'Fruit fly activity near bar', last_checked: null },
    ],
  },
  {
    id: 'CL4',
    category: 'Staff Hygiene',
    items: [
      { id: 'I9', item: 'Handwashing training documented', status: 'pass', priority: 'major', notes: '', last_checked: null },
      { id: 'I10', item: 'Food handler cards on file', status: 'pass', priority: 'major', notes: '', last_checked: null },
    ],
  },
];

const STATUS_COLORS: Record<ItemStatus, string> = {
  pass: 'text-green-400',
  fail: 'text-red-400',
  pending: 'text-zinc-400',
  na: 'text-zinc-600',
};

const PRIORITY_STYLES: Record<ItemPriority, string> = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  major: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  minor: 'bg-zinc-800 text-zinc-400 border-zinc-700',
};

export default function HealthInspectionPage() {
  const { items: checklists, add, update, remove, setItems } = useCrudList<Checklist>('seatsignals_health_inspection', INITIAL);
  const [filter, setFilter] = useState<'all' | 'fail' | 'pending'>('all');
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(INITIAL.map(c => c.id)));

  const [clModalOpen, setClModalOpen] = useState(false);
  const [clEditing, setClEditing] = useState<Checklist | null>(null);
  const [clForm, setClForm] = useState({ category: '' });

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemContext, setItemContext] = useState<{ checklistId: string; editing: ChecklistItem | null } | null>(null);
  const [itemForm, setItemForm] = useState<Omit<ChecklistItem, 'id' | 'last_checked'>>({
    item: '',
    status: 'pending',
    priority: 'major',
    notes: '',
  });

  const toggleCategory = (id: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openAddChecklist = () => {
    setClEditing(null);
    setClForm({ category: '' });
    setClModalOpen(true);
  };

  const openEditChecklist = (cl: Checklist) => {
    setClEditing(cl);
    setClForm({ category: cl.category });
    setClModalOpen(true);
  };

  const handleSaveChecklist = () => {
    if (!clForm.category.trim()) {
      toast.error('Category name required');
      return;
    }
    if (clEditing) {
      update(clEditing.id, { category: clForm.category });
      toast.success('Checklist updated');
    } else {
      const id = `CL${Date.now()}`;
      add({ id, category: clForm.category, items: [] });
      setExpandedCats(prev => new Set(prev).add(id));
      toast.success('Checklist added');
    }
    setClModalOpen(false);
  };

  const handleDeleteChecklist = (id: string) => {
    if (!confirm('Delete?')) return;
    remove(id);
    toast.success('Deleted');
  };

  const openAddItem = (checklistId: string) => {
    setItemContext({ checklistId, editing: null });
    setItemForm({ item: '', status: 'pending', priority: 'major', notes: '' });
    setItemModalOpen(true);
  };

  const openEditItem = (checklistId: string, item: ChecklistItem) => {
    setItemContext({ checklistId, editing: item });
    setItemForm({
      item: item.item,
      status: item.status,
      priority: item.priority,
      notes: item.notes,
    });
    setItemModalOpen(true);
  };

  const handleSaveItem = () => {
    if (!itemContext) return;
    if (!itemForm.item.trim()) {
      toast.error('Item description required');
      return;
    }
    if (itemContext.editing) {
      const editing = itemContext.editing;
      setItems(prev =>
        prev.map(cl =>
          cl.id === itemContext.checklistId
            ? {
                ...cl,
                items: cl.items.map(i =>
                  i.id === editing.id
                    ? { ...i, ...itemForm, last_checked: new Date().toISOString() }
                    : i
                ),
              }
            : cl
        )
      );
      toast.success('Item updated');
    } else {
      setItems(prev =>
        prev.map(cl =>
          cl.id === itemContext.checklistId
            ? {
                ...cl,
                items: [
                  ...cl.items,
                  { id: `I${Date.now()}`, ...itemForm, last_checked: null },
                ],
              }
            : cl
        )
      );
      toast.success('Item added');
    }
    setItemModalOpen(false);
  };

  const handleDeleteItem = (checklistId: string, itemId: string) => {
    if (!confirm('Delete?')) return;
    setItems(prev =>
      prev.map(cl =>
        cl.id === checklistId ? { ...cl, items: cl.items.filter(i => i.id !== itemId) } : cl
      )
    );
    toast.success('Deleted');
  };

  const setItemStatus = (checklistId: string, itemId: string, status: ItemStatus) => {
    setItems(prev =>
      prev.map(cl =>
        cl.id === checklistId
          ? {
              ...cl,
              items: cl.items.map(i =>
                i.id === itemId ? { ...i, status, last_checked: new Date().toISOString() } : i
              ),
            }
          : cl
      )
    );
    toast.success(`Marked ${status}`);
  };

  const allItems = checklists.flatMap(cl => cl.items);
  const passed = allItems.filter(i => i.status === 'pass').length;
  const failed = allItems.filter(i => i.status === 'fail').length;
  const pending = allItems.filter(i => i.status === 'pending').length;
  const critical_fails = allItems.filter(i => i.status === 'fail' && i.priority === 'critical').length;
  const scored = allItems.filter(i => i.status === 'pass' || i.status === 'fail').length;
  const score = scored > 0 ? Math.round((passed / scored) * 100) : 0;
  const scoreColor = score >= 90 ? 'text-green-400' : score >= 70 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Health Inspection Prep</h1>
            <p className="text-sm text-zinc-500">Build and track readiness checklists</p>
          </div>
        </div>
        <button
          onClick={openAddChecklist}
          className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white text-sm font-medium rounded-lg hover:bg-seat-red/90"
        >
          <Plus className="w-4 h-4" /> New Checklist
        </button>
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-6 text-center">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Readiness Score</p>
        <p className={cn('text-6xl font-bold', scoreColor)}>{score}%</p>
        <div className="w-full max-w-md mx-auto mt-4 h-3 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', score >= 90 ? 'bg-green-500' : score >= 70 ? 'bg-amber-500' : 'bg-red-500')}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Passed" value={passed} icon={<CheckCircle size={18} />} />
        <MetricCard title="Failed" value={failed} icon={<XCircle size={18} />} />
        <MetricCard title="Pending" value={pending} icon={<Clock size={18} />} />
        <MetricCard title="Critical Fails" value={critical_fails} icon={<AlertTriangle size={18} />} />
      </div>

      {critical_fails > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-400" />
            <h3 className="text-sm font-semibold text-red-400">
              {critical_fails} Critical Failure{critical_fails > 1 ? 's' : ''}
            </h3>
          </div>
          <div className="space-y-1">
            {checklists.map(cl =>
              cl.items
                .filter(i => i.status === 'fail' && i.priority === 'critical')
                .map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-zinc-800/50 rounded px-3 py-2">
                    <span className="text-xs text-white">{cl.category} — {item.item}</span>
                    <button
                      onClick={() => setItemStatus(cl.id, item.id, 'pass')}
                      className="text-[10px] px-2 py-1 bg-green-500/10 text-green-400 rounded hover:bg-green-500/20"
                    >
                      Mark Pass
                    </button>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {(['all', 'fail', 'pending'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-medium transition-colors',
              filter === f ? 'bg-seat-red text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
            )}
          >
            {f === 'all' ? 'All Items' : f === 'fail' ? 'Failures Only' : 'Pending Only'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {checklists.map(cl => {
          const visibleItems = filter === 'all' ? cl.items : cl.items.filter(i => i.status === filter);
          if (filter !== 'all' && visibleItems.length === 0) return null;

          const isExpanded = expandedCats.has(cl.id);
          const catPassed = cl.items.filter(i => i.status === 'pass').length;
          const catTotal = cl.items.length;

          return (
            <div key={cl.id} className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
              <div className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800/30 transition-colors">
                <button
                  onClick={() => toggleCategory(cl.id)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  <h3 className="text-sm font-semibold text-white">{cl.category}</h3>
                  <span className="text-[10px] text-zinc-500">
                    {catPassed}/{catTotal} passed
                  </span>
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: catTotal > 0 ? `${(catPassed / catTotal) * 100}%` : '0%' }}
                    />
                  </div>
                  <button
                    onClick={() => openAddItem(cl.id)}
                    className="p-1.5 rounded text-zinc-500 hover:text-white hover:bg-zinc-800"
                    title="Add item"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditChecklist(cl)}
                    className="p-1.5 rounded text-zinc-500 hover:text-white hover:bg-zinc-800"
                    title="Edit checklist"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteChecklist(cl.id)}
                    className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                    title="Delete checklist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => toggleCategory(cl.id)} className="text-zinc-400 p-1">
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="border-t border-seat-border/50">
                  {visibleItems.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-zinc-500">
                      No items yet.{' '}
                      <button onClick={() => openAddItem(cl.id)} className="text-seat-red hover:underline">
                        Add one
                      </button>
                    </div>
                  ) : (
                    visibleItems.map(item => {
                      const Icon = item.status === 'pass' ? CheckCircle : item.status === 'fail' ? XCircle : Clock;
                      return (
                        <div
                          key={item.id}
                          className="px-4 py-3 flex items-center gap-3 border-b border-seat-border/30 last:border-0 hover:bg-zinc-800/20"
                        >
                          <Icon size={16} className={STATUS_COLORS[item.status]} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white">{item.item}</p>
                            {item.notes && <p className="text-[10px] text-red-400 mt-0.5">{item.notes}</p>}
                          </div>
                          <span
                            className={cn(
                              'text-[10px] px-2 py-0.5 rounded-full font-medium border',
                              PRIORITY_STYLES[item.priority]
                            )}
                          >
                            {item.priority}
                          </span>
                          <div className="flex gap-1">
                            {item.status !== 'pass' && (
                              <button
                                onClick={() => setItemStatus(cl.id, item.id, 'pass')}
                                className="text-[10px] px-2 py-1 bg-green-500/10 text-green-400 rounded hover:bg-green-500/20"
                              >
                                Pass
                              </button>
                            )}
                            {item.status !== 'fail' && (
                              <button
                                onClick={() => setItemStatus(cl.id, item.id, 'fail')}
                                className="text-[10px] px-2 py-1 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20"
                              >
                                Fail
                              </button>
                            )}
                            <button
                              onClick={() => openEditItem(cl.id, item)}
                              className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-800"
                              title="Edit"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(cl.id, item.id)}
                              className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
        {checklists.length === 0 && (
          <div className="bg-seat-card border border-seat-border rounded-xl p-12 text-center text-sm text-zinc-500">
            No checklists yet. Create one to get started.
          </div>
        )}
      </div>

      <EditModal
        open={clModalOpen}
        onClose={() => setClModalOpen(false)}
        title={clEditing ? 'Edit Checklist' : 'New Checklist'}
        footer={
          <>
            {clEditing && (
              <DangerButton
                onClick={() => {
                  if (!confirm('Delete?')) return;
                  remove(clEditing.id);
                  toast.success('Deleted');
                  setClModalOpen(false);
                }}
              >
                Delete
              </DangerButton>
            )}
            <GhostButton onClick={() => setClModalOpen(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={handleSaveChecklist}>{clEditing ? 'Save' : 'Add'}</PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Category Name</FieldLabel>
            <TextInput
              value={clForm.category}
              onChange={(v) => setClForm({ category: v })}
              placeholder="e.g. Food Storage & Handling"
            />
          </div>
        </div>
      </EditModal>

      <EditModal
        open={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        title={itemContext?.editing ? 'Edit Item' : 'New Checklist Item'}
        maxWidth="lg"
        footer={
          <>
            {itemContext?.editing && (
              <DangerButton
                onClick={() => {
                  if (!itemContext || !itemContext.editing) return;
                  if (!confirm('Delete?')) return;
                  handleDeleteItem(itemContext.checklistId, itemContext.editing.id);
                  setItemModalOpen(false);
                }}
              >
                Delete
              </DangerButton>
            )}
            <GhostButton onClick={() => setItemModalOpen(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={handleSaveItem}>{itemContext?.editing ? 'Save' : 'Add'}</PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Item Description</FieldLabel>
            <TextInput
              value={itemForm.item}
              onChange={(v) => setItemForm({ ...itemForm, item: v })}
              placeholder="e.g. Refrigerator temps logged (< 40°F)"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Status</FieldLabel>
              <Select
                value={itemForm.status}
                onChange={(v) => setItemForm({ ...itemForm, status: v as ItemStatus })}
                options={[
                  { label: 'Pending', value: 'pending' },
                  { label: 'Pass', value: 'pass' },
                  { label: 'Fail', value: 'fail' },
                  { label: 'N/A', value: 'na' },
                ]}
              />
            </div>
            <div>
              <FieldLabel>Priority</FieldLabel>
              <Select
                value={itemForm.priority}
                onChange={(v) => setItemForm({ ...itemForm, priority: v as ItemPriority })}
                options={[
                  { label: 'Critical', value: 'critical' },
                  { label: 'Major', value: 'major' },
                  { label: 'Minor', value: 'minor' },
                ]}
              />
            </div>
          </div>
          <div>
            <FieldLabel>Notes</FieldLabel>
            <TextArea
              value={itemForm.notes}
              onChange={(v) => setItemForm({ ...itemForm, notes: v })}
              placeholder="Optional notes or corrective action..."
            />
          </div>
        </div>
      </EditModal>
    </div>
  );
}
