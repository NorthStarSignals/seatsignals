'use client';

import { useMemo, useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import {
  Star, Calendar, TrendingUp, Award, Plus, Pencil, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal, FieldLabel, TextInput, TextArea, Select, PrimaryButton, GhostButton, DangerButton,
} from '@/components/dashboard/edit-modal';

interface Review {
  id: string;
  name: string;
  role: string;
  lastReview: string;
  nextReview: string;
  rating: number;
  status: 'overdue' | 'upcoming' | 'completed';
  strengths: string;
  growth: string;
}

const ROLES = ['Server', 'Host', 'Bartender', 'Line Cook', 'Sous Chef', 'Dishwasher', 'Manager'];

const INITIAL: Review[] = [
  { id: 'r1', name: 'Marco Silva', role: 'Server', lastReview: '2026-01-15', nextReview: '2026-04-15', rating: 4.8, status: 'overdue', strengths: 'Wine knowledge, upselling', growth: 'POS speed' },
  { id: 'r2', name: 'Sarah Chen', role: 'Bartender', lastReview: '2026-02-10', nextReview: '2026-05-10', rating: 4.6, status: 'upcoming', strengths: 'Cocktail creativity, guest rapport', growth: 'Inventory management' },
  { id: 'r3', name: 'James Park', role: 'Sous Chef', lastReview: '2025-12-20', nextReview: '2026-03-20', rating: 4.9, status: 'completed', strengths: 'Plating, line leadership', growth: 'Cost control' },
  { id: 'r4', name: 'Lisa Rodriguez', role: 'Host', lastReview: '2026-03-01', nextReview: '2026-06-01', rating: 4.4, status: 'completed', strengths: 'Reservation management', growth: 'Conflict resolution' },
  { id: 'r5', name: 'David Kim', role: 'Line Cook', lastReview: '2025-11-30', nextReview: '2026-02-28', rating: 4.2, status: 'overdue', strengths: 'Speed, consistency', growth: 'Cleanliness, communication' },
  { id: 'r6', name: 'Emma Wilson', role: 'Server', lastReview: '2026-02-22', nextReview: '2026-05-22', rating: 4.7, status: 'upcoming', strengths: 'Tip average, regulars', growth: 'Wine training' },
];

const statusColor = (s: string) => {
  if (s === 'overdue') return 'bg-red-500/10 text-red-500 border-red-500/30';
  if (s === 'upcoming') return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
  return 'bg-green-500/10 text-green-500 border-green-500/30';
};

function emptyReview(): Review {
  return {
    id: '',
    name: '',
    role: 'Server',
    lastReview: new Date().toISOString().split('T')[0],
    nextReview: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
    rating: 4.5,
    status: 'upcoming',
    strengths: '',
    growth: '',
  };
}

export default function PerformanceReviewsPage() {
  const { items: reviews, add, update, remove } = useCrudList<Review>(
    'seatsignals_staff_reviews',
    INITIAL,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Review | null>(null);
  const [form, setForm] = useState<Review>(emptyReview());

  const stats = useMemo(() => {
    const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    return {
      avgRating,
      overdue: reviews.filter((r) => r.status === 'overdue').length,
      upcoming: reviews.filter((r) => r.status === 'upcoming').length,
      top: reviews.slice().sort((a, b) => b.rating - a.rating)[0],
    };
  }, [reviews]);

  const openAdd = () => { setEditing(null); setForm(emptyReview()); setModalOpen(true); };
  const openEdit = (r: Review) => { setEditing(r); setForm(r); setModalOpen(true); };
  const save = () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (editing) { update(editing.id, form); toast.success('Review updated'); }
    else { add({ ...form, id: Date.now().toString() }); toast.success('Review scheduled'); }
    setModalOpen(false);
  };
  const del = (r: Review) => {
    if (!confirm(`Delete review for ${r.name}?`)) return;
    remove(r.id);
    toast.success('Review deleted');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Performance Reviews</h1>
          <p className="text-seat-muted mt-1">Quarterly check-ins, ratings, and growth tracking</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg font-medium flex items-center gap-2">
          <Plus size={16} /> Schedule Review
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Avg Team Rating" value={stats.avgRating.toFixed(1)} subtitle="out of 5.0" trend={{ value: 4, positive: true }} />
        <MetricCard title="Reviews Overdue" value={stats.overdue} subtitle="action needed" />
        <MetricCard title="Upcoming (30d)" value={stats.upcoming} subtitle="schedule now" />
        <MetricCard title="Top Performer" value={stats.top?.name.split(' ')[0] || '—'} subtitle={stats.top ? `${stats.top.rating} rating` : ''} />
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-seat-red" /> Team Performance
        </h3>
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="bg-seat-black border border-seat-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-seat-red/20 flex items-center justify-center text-seat-red font-bold">
                    {r.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <div className="text-white font-medium">{r.name}</div>
                    <div className="text-xs text-seat-muted">{r.role}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-white font-bold">{r.rating}</span>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs border ${statusColor(r.status)}`}>{r.status}</span>
                  <button onClick={() => openEdit(r)} className="p-1 text-zinc-400 hover:text-white"><Pencil size={14} /></button>
                  <button onClick={() => del(r)} className="p-1 text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-seat-muted">Next Review</div>
                  <div className="text-white flex items-center gap-1 mt-1"><Calendar className="w-3 h-3" /> {r.nextReview}</div>
                </div>
                <div>
                  <div className="text-seat-muted">Strengths</div>
                  <div className="text-white mt-1">{r.strengths || '—'}</div>
                </div>
                <div>
                  <div className="text-seat-muted">Growth Area</div>
                  <div className="text-white mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-green-500" /> {r.growth || '—'}</div>
                </div>
              </div>
            </div>
          ))}
          {reviews.length === 0 && <p className="text-sm text-zinc-500">No reviews scheduled. Click &quot;Schedule Review&quot; to add one.</p>}
        </div>
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Review' : 'Schedule Review'}
        maxWidth="lg"
        footer={
          <>
            <GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton>
            {editing && <DangerButton onClick={() => { del(editing); setModalOpen(false); }}>Delete</DangerButton>}
            <PrimaryButton onClick={save}>{editing ? 'Save' : 'Schedule'}</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Name</FieldLabel>
            <TextInput value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          </div>
          <div>
            <FieldLabel>Role</FieldLabel>
            <Select value={form.role} onChange={(v) => setForm({ ...form, role: v })} options={ROLES.map((r) => ({ label: r, value: r }))} />
          </div>
          <div>
            <FieldLabel>Last Review</FieldLabel>
            <TextInput value={form.lastReview} onChange={(v) => setForm({ ...form, lastReview: v })} type="date" />
          </div>
          <div>
            <FieldLabel>Next Review</FieldLabel>
            <TextInput value={form.nextReview} onChange={(v) => setForm({ ...form, nextReview: v })} type="date" />
          </div>
          <div>
            <FieldLabel>Rating (0-5)</FieldLabel>
            <TextInput value={form.rating} onChange={(v) => setForm({ ...form, rating: Number(v) || 0 })} type="number" />
          </div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <Select
              value={form.status}
              onChange={(v) => setForm({ ...form, status: v as Review['status'] })}
              options={[{ label: 'Upcoming', value: 'upcoming' }, { label: 'Overdue', value: 'overdue' }, { label: 'Completed', value: 'completed' }]}
            />
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Strengths</FieldLabel>
            <TextArea value={form.strengths} onChange={(v) => setForm({ ...form, strengths: v })} />
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Growth Area</FieldLabel>
            <TextArea value={form.growth} onChange={(v) => setForm({ ...form, growth: v })} />
          </div>
        </div>
      </EditModal>
    </div>
  );
}
