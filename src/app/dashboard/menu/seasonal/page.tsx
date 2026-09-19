'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import {
  Leaf,
  Sun,
  CloudSnow,
  Flower,
  Calendar,
  Plus,
  Trash2,
  Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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

interface SeasonalPlan {
  id: string;
  season: 'Spring' | 'Summer' | 'Fall' | 'Winter';
  date_range: { start: string; end: string };
  theme: string;
  status: 'draft' | 'active' | 'archived';
  created_at: string;
  featured_count: number;
}

const seasonConfig: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  Spring: { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', icon: <Flower className="w-5 h-5" /> },
  Summer: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: <Sun className="w-5 h-5" /> },
  Fall: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: <Leaf className="w-5 h-5" /> },
  Winter: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: <CloudSnow className="w-5 h-5" /> },
};

const statusStyles: Record<string, string> = {
  draft: 'bg-zinc-700/50 text-zinc-300',
  active: 'bg-green-500/20 text-green-400',
  archived: 'bg-zinc-700/50 text-zinc-500',
};

const INITIAL: SeasonalPlan[] = [
  { id: 'sp1', season: 'Spring', date_range: { start: '2026-03-20', end: '2026-06-20' }, theme: 'Garden Fresh Revival', status: 'active', created_at: '2026-02-15', featured_count: 6 },
  { id: 'sp2', season: 'Summer', date_range: { start: '2026-06-21', end: '2026-09-21' }, theme: 'Coastal & Citrus', status: 'draft', created_at: '2026-03-10', featured_count: 4 },
  { id: 'sp3', season: 'Winter', date_range: { start: '2025-12-21', end: '2026-03-19' }, theme: 'Hearth & Home', status: 'archived', created_at: '2025-11-01', featured_count: 8 },
];

type Draft = {
  id?: string;
  season: SeasonalPlan['season'];
  theme: string;
  start: string;
  end: string;
  featured_count: string;
};

const emptyDraft = (): Draft => ({ season: 'Spring', theme: '', start: '', end: '', featured_count: '0' });

export default function SeasonalMenuPage() {
  const { items: plans, add, update, remove } = useCrudList<SeasonalPlan>('seatsignals_menu_seasonal', INITIAL);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SeasonalPlan | null>(null);

  const openNew = () => setEditing(emptyDraft());
  const openEdit = (p: SeasonalPlan) => setEditing({
    id: p.id,
    season: p.season,
    theme: p.theme,
    start: p.date_range.start,
    end: p.date_range.end,
    featured_count: String(p.featured_count),
  });

  const save = () => {
    if (!editing?.theme.trim()) { toast.error('Theme required'); return; }
    if (!editing.start || !editing.end) { toast.error('Dates required'); return; }
    const data = {
      season: editing.season,
      theme: editing.theme.trim(),
      date_range: { start: editing.start, end: editing.end },
      featured_count: parseInt(editing.featured_count) || 0,
    };
    if (editing.id) {
      update(editing.id, data);
      toast.success('Plan updated');
    } else {
      add({
        id: `sp-${Date.now()}`,
        ...data,
        status: 'draft',
        created_at: new Date().toISOString(),
      });
      toast.success('Plan created');
    }
    setEditing(null);
  };

  const cycleStatus = (p: SeasonalPlan) => {
    const next: SeasonalPlan['status'] = p.status === 'draft' ? 'active' : p.status === 'active' ? 'archived' : 'draft';
    update(p.id, { status: next });
    toast.success(`Status → ${next}`);
  };

  const doDelete = () => {
    if (!confirmDelete) return;
    remove(confirmDelete.id);
    toast.success('Removed');
    setConfirmDelete(null);
  };

  const stats = {
    active_seasons: plans.filter(p => p.status === 'active').length,
    total_seasonal_items: plans.reduce((s, p) => s + p.featured_count, 0),
    avg_seasonal_price: 24.5,
    upcoming_season: plans.find(p => p.status === 'draft')?.season || null,
  };

  const timelineSeasons: SeasonalPlan['season'][] = ['Winter', 'Spring', 'Summer', 'Fall'];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Seasonal Menu Planner</h1>
          <p className="text-sm text-zinc-500 mt-1">Plan and manage seasonal menu rotations</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90">
          <Plus className="w-4 h-4" /> New Season Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Active Seasons" value={stats.active_seasons} icon={<Calendar className="w-4 h-4" />} />
        <MetricCard title="Seasonal Items" value={stats.total_seasonal_items} icon={<Leaf className="w-4 h-4" />} />
        <MetricCard title="Avg Seasonal Price" value={`$${stats.avg_seasonal_price.toFixed(2)}`} icon={<Sun className="w-4 h-4" />} />
        <MetricCard title="Upcoming Season" value={stats.upcoming_season || 'None'} icon={<Flower className="w-4 h-4" />} />
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-seat-red" />
          Season Timeline
        </h2>
        <div className="flex gap-1">
          {timelineSeasons.map(season => {
            const config = seasonConfig[season];
            const plan = plans.find(p => p.season === season && p.status !== 'archived');
            return (
              <div
                key={season}
                className={cn('flex-1 rounded-lg p-3 border transition-colors',
                  plan ? config.border : 'border-seat-border',
                  plan ? config.bg : 'bg-seat-black/50')}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={config.color}>{config.icon}</span>
                  <span className={cn('text-sm font-medium', config.color)}>{season}</span>
                </div>
                {plan ? (
                  <>
                    <p className="text-xs text-zinc-400 truncate">{plan.theme}</p>
                    <span className={cn('inline-block mt-1 text-xs px-2 py-0.5 rounded-full', statusStyles[plan.status])}>
                      {plan.status}
                    </span>
                  </>
                ) : (
                  <p className="text-xs text-zinc-600">No plan</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        {plans.map(plan => {
          const config = seasonConfig[plan.season];
          return (
            <div key={plan.id} className={cn('bg-seat-card border rounded-xl overflow-hidden transition-colors', config.border)}>
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', config.bg, config.color)}>
                      {config.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-semibold">{plan.season} Menu</h3>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full', statusStyles[plan.status])}>
                          {plan.status}
                        </span>
                      </div>
                      <p className={cn('text-sm', config.color)}>{plan.theme}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => cycleStatus(plan)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700">
                      Next Status
                    </button>
                    <button onClick={() => openEdit(plan)} className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setConfirmDelete(plan)} className="p-1.5 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-zinc-800">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500">
                  <span>{plan.date_range.start} to {plan.date_range.end}</span>
                  <span>{plan.featured_count} items</span>
                  <span>Created {new Date(plan.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          );
        })}
        {plans.length === 0 && (
          <div className="text-center py-12 bg-seat-card border border-seat-border rounded-xl">
            <Calendar size={32} className="mx-auto text-zinc-700 mb-2" />
            <p className="text-sm text-zinc-500">No seasonal plans yet.</p>
          </div>
        )}
      </div>

      <EditModal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit Seasonal Plan' : 'New Seasonal Plan'}
        footer={
          <>
            <GhostButton onClick={() => setEditing(null)}>Cancel</GhostButton>
            <PrimaryButton onClick={save}>{editing?.id ? 'Save' : 'Create'}</PrimaryButton>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <div>
              <FieldLabel>Season</FieldLabel>
              <Select
                value={editing.season}
                onChange={(v) => setEditing({ ...editing, season: v as SeasonalPlan['season'] })}
                options={[
                  { label: 'Spring', value: 'Spring' },
                  { label: 'Summer', value: 'Summer' },
                  { label: 'Fall', value: 'Fall' },
                  { label: 'Winter', value: 'Winter' },
                ]}
              />
            </div>
            <div>
              <FieldLabel>Theme</FieldLabel>
              <TextInput value={editing.theme} onChange={(v) => setEditing({ ...editing, theme: v })} placeholder="e.g., Garden Fresh Revival" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Start Date</FieldLabel>
                <TextInput type="date" value={editing.start} onChange={(v) => setEditing({ ...editing, start: v })} />
              </div>
              <div>
                <FieldLabel>End Date</FieldLabel>
                <TextInput type="date" value={editing.end} onChange={(v) => setEditing({ ...editing, end: v })} />
              </div>
            </div>
            <div>
              <FieldLabel>Featured Items Count</FieldLabel>
              <TextInput type="number" value={editing.featured_count} onChange={(v) => setEditing({ ...editing, featured_count: v })} />
            </div>
          </div>
        )}
      </EditModal>

      <EditModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Plan?"
        footer={
          <>
            <GhostButton onClick={() => setConfirmDelete(null)}>Cancel</GhostButton>
            <DangerButton onClick={doDelete}>Delete</DangerButton>
          </>
        }
      >
        <p className="text-sm text-zinc-400">Remove {confirmDelete?.season} / {confirmDelete?.theme}?</p>
      </EditModal>
    </div>
  );
}
