'use client';

import { useState, useMemo } from 'react';
import {
  GraduationCap, AlertTriangle, CheckCircle, Clock, BookOpen, Users, Plus, Pencil, Trash2,
} from 'lucide-react';
import { MetricCard } from '@/components/ui/metric-card';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useCrudList, useLocalStorageState } from '@/hooks/use-local-storage-state';
import {
  EditModal, FieldLabel, TextInput, Select, PrimaryButton, GhostButton, DangerButton,
} from '@/components/dashboard/edit-modal';

interface TrainingProgram {
  id: string;
  name: string;
  category: string;
  duration_hours: number;
  required: boolean;
  pass_score: number;
}

interface TrainingRecord {
  id: string;
  employee_name: string;
  role: string;
  program_id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'expired';
  score: number | null;
  completed_date: string | null;
  expiry_date: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string }> = {
  completed: { label: 'Completed', dot: 'bg-emerald-400', bg: 'bg-emerald-400/15 text-emerald-400' },
  in_progress: { label: 'In Progress', dot: 'bg-amber-400', bg: 'bg-amber-400/15 text-amber-400' },
  not_started: { label: 'Not Started', dot: 'bg-zinc-500', bg: 'bg-zinc-500/15 text-zinc-400' },
  expired: { label: 'Expired', dot: 'bg-red-400', bg: 'bg-red-400/15 text-red-400' },
};

const CATEGORIES = ['Compliance', 'Skills', 'Safety', 'Customer Service', 'Leadership'];

const INITIAL_PROGRAMS: TrainingProgram[] = [
  { id: 'pr1', name: 'ServSafe Manager', category: 'Compliance', duration_hours: 8, required: true, pass_score: 80 },
  { id: 'pr2', name: 'TIPS Alcohol Certification', category: 'Compliance', duration_hours: 3, required: true, pass_score: 70 },
  { id: 'pr3', name: 'Wine 101', category: 'Skills', duration_hours: 4, required: false, pass_score: 75 },
  { id: 'pr4', name: 'Allergens & Dietary Restrictions', category: 'Safety', duration_hours: 2, required: true, pass_score: 85 },
  { id: 'pr5', name: 'Hospitality & Guest Service', category: 'Customer Service', duration_hours: 3, required: true, pass_score: 75 },
];

const INITIAL_RECORDS: TrainingRecord[] = [
  { id: 'r1', employee_name: 'Marco Silva', role: 'Server', program_id: 'pr2', status: 'completed', score: 92, completed_date: '2025-08-15', expiry_date: '2028-08-15' },
  { id: 'r2', employee_name: 'Marco Silva', role: 'Server', program_id: 'pr5', status: 'in_progress', score: null, completed_date: null, expiry_date: null },
  { id: 'r3', employee_name: 'Sarah Chen', role: 'Bartender', program_id: 'pr2', status: 'completed', score: 88, completed_date: '2025-06-10', expiry_date: '2028-06-10' },
  { id: 'r4', employee_name: 'James Park', role: 'Sous Chef', program_id: 'pr1', status: 'completed', score: 95, completed_date: '2025-03-22', expiry_date: '2030-03-22' },
  { id: 'r5', employee_name: 'David Kim', role: 'Line Cook', program_id: 'pr4', status: 'not_started', score: null, completed_date: null, expiry_date: null },
];

const EMPLOYEES = [
  { name: 'Marco Silva', role: 'Server' },
  { name: 'Sarah Chen', role: 'Bartender' },
  { name: 'James Park', role: 'Sous Chef' },
  { name: 'Lisa Rodriguez', role: 'Host' },
  { name: 'David Kim', role: 'Line Cook' },
  { name: 'Emma Wilson', role: 'Server' },
];

function emptyProgram(): TrainingProgram {
  return { id: '', name: '', category: 'Compliance', duration_hours: 1, required: false, pass_score: 75 };
}

export default function StaffTrainingPage() {
  const { items: programs, add: addProgram, update: updateProgram, remove: removeProgram } = useCrudList<TrainingProgram>(
    'seatsignals_staff_training',
    INITIAL_PROGRAMS,
  );
  const [records, setRecords] = useLocalStorageState<TrainingRecord[]>(
    'seatsignals_staff_training_records',
    INITIAL_RECORDS,
  );
  const [filterProgram, setFilterProgram] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [progModalOpen, setProgModalOpen] = useState(false);
  const [editingProg, setEditingProg] = useState<TrainingProgram | null>(null);
  const [progForm, setProgForm] = useState<TrainingProgram>(emptyProgram());

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({ employee_name: '', program_id: '' });

  const stats = useMemo(() => {
    const completedCount = records.filter((r) => r.status === 'completed').length;
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 86400000);
    const expiring = records.filter((r) => r.status === 'completed' && r.expiry_date && new Date(r.expiry_date) > now && new Date(r.expiry_date) <= in30).length;
    const overdue = records.filter((r) => r.status === 'expired').length;
    return {
      total_programs: programs.length,
      completion_rate: records.length ? Math.round((completedCount / records.length) * 100) : 0,
      expiring_soon: expiring,
      overdue_count: overdue,
    };
  }, [programs, records]);

  const openAddProgram = () => { setEditingProg(null); setProgForm(emptyProgram()); setProgModalOpen(true); };
  const openEditProgram = (p: TrainingProgram) => { setEditingProg(p); setProgForm(p); setProgModalOpen(true); };
  const saveProgram = () => {
    if (!progForm.name.trim()) { toast.error('Name is required'); return; }
    if (editingProg) { updateProgram(editingProg.id, progForm); toast.success('Program updated'); }
    else { addProgram({ ...progForm, id: Date.now().toString() }); toast.success('Program added'); }
    setProgModalOpen(false);
  };
  const delProgram = (p: TrainingProgram) => {
    if (!confirm(`Delete program "${p.name}"?`)) return;
    removeProgram(p.id);
    setRecords((r) => r.filter((x) => x.program_id !== p.id));
    toast.success('Program deleted');
  };

  const assign = () => {
    if (!assignForm.employee_name || !assignForm.program_id) { toast.error('Select employee and program'); return; }
    const emp = EMPLOYEES.find((e) => e.name === assignForm.employee_name);
    setRecords((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        employee_name: assignForm.employee_name,
        role: emp?.role || 'Server',
        program_id: assignForm.program_id,
        status: 'not_started',
        score: null,
        completed_date: null,
        expiry_date: null,
      },
    ]);
    toast.success(`Training assigned to ${assignForm.employee_name}`);
    setAssignOpen(false);
    setAssignForm({ employee_name: '', program_id: '' });
  };

  const markComplete = (rec: TrainingRecord) => {
    const now = new Date();
    setRecords((prev) => prev.map((r) =>
      r.id === rec.id
        ? { ...r, status: 'completed', score: 85, completed_date: now.toISOString().split('T')[0], expiry_date: new Date(now.getTime() + 365 * 86400000 * 3).toISOString().split('T')[0] }
        : r,
    ));
    toast.success('Training marked complete');
  };

  const delRecord = (rec: TrainingRecord) => {
    setRecords((prev) => prev.filter((r) => r.id !== rec.id));
    toast.success('Record deleted');
  };

  const filteredRecords = records.filter((r) => {
    if (filterProgram !== 'all' && r.program_id !== filterProgram) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    return true;
  });

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 86400000);
  const expiringRecords = records.filter((r) => r.status === 'completed' && r.expiry_date && new Date(r.expiry_date) > now && new Date(r.expiry_date) <= in30);

  const programCompletions = programs.map((p) => {
    const progRecords = records.filter((r) => r.program_id === p.id);
    const completed = progRecords.filter((r) => r.status === 'completed').length;
    const total = progRecords.length || 1;
    return { ...p, completionPct: Math.round((completed / total) * 100) };
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-seat-red" /> Staff Training
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Track certifications, compliance, and skill development</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openAddProgram} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white rounded-lg text-sm font-medium hover:bg-zinc-700 transition">
            <Plus size={16} /> Add Program
          </button>
          <button onClick={() => setAssignOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 transition">
            <Plus size={16} /> Assign Training
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Programs" value={stats.total_programs} icon={<BookOpen className="w-4 h-4" />} />
        <MetricCard title="Completion Rate" value={`${stats.completion_rate}%`} icon={<CheckCircle className="w-4 h-4" />} />
        <MetricCard title="Expiring Soon" value={stats.expiring_soon} icon={<Clock className="w-4 h-4" />} />
        <MetricCard title="Overdue" value={stats.overdue_count} icon={<AlertTriangle className="w-4 h-4" />} />
      </div>

      {/* Programs list */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-seat-red" /> Programs
        </h2>
        <div className="space-y-2">
          {programCompletions.map((prog) => (
            <div key={prog.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-800/30 transition">
              <div className="w-44 min-w-[11rem]">
                <p className="text-sm text-white font-medium truncate">{prog.name}</p>
                <p className="text-xs text-zinc-500">{prog.category} · {prog.duration_hours}h{prog.required ? ' · Required' : ''}</p>
              </div>
              <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', prog.completionPct >= 75 ? 'bg-emerald-500' : prog.completionPct >= 50 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${prog.completionPct}%` }} />
              </div>
              <span className="text-sm text-zinc-400 w-12 text-right">{prog.completionPct}%</span>
              <button onClick={() => openEditProgram(prog)} className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800"><Pencil size={14} /></button>
              <button onClick={() => delProgram(prog)} className="p-1.5 text-zinc-500 hover:text-red-400 rounded hover:bg-zinc-800"><Trash2 size={14} /></button>
            </div>
          ))}
          {programs.length === 0 && <p className="text-xs text-zinc-500">No programs yet.</p>}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={filterProgram} onChange={(e) => setFilterProgram(e.target.value)} className="bg-seat-card border border-seat-border rounded-lg px-3 py-2 text-sm text-white">
          <option value="all">All Programs</option>
          {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-seat-card border border-seat-border rounded-lg px-3 py-2 text-sm text-white">
          <option value="all">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="in_progress">In Progress</option>
          <option value="not_started">Not Started</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Records */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-6 overflow-x-auto">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-seat-red" /> Training Records
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-seat-border text-zinc-400">
              <th className="text-left font-medium pb-3 pr-4">Employee</th>
              <th className="text-left font-medium pb-3 pr-4">Program</th>
              <th className="text-left font-medium pb-3 pr-4">Status</th>
              <th className="text-left font-medium pb-3 pr-4">Score</th>
              <th className="text-left font-medium pb-3 pr-4">Expiry</th>
              <th className="text-right font-medium pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((r) => {
              const prog = programs.find((p) => p.id === r.program_id);
              const cfg = STATUS_CONFIG[r.status];
              return (
                <tr key={r.id} className="border-b border-seat-border/50 hover:bg-white/[0.02]">
                  <td className="py-3 pr-4">
                    <p className="text-white font-medium">{r.employee_name}</p>
                    <p className="text-xs text-zinc-500">{r.role}</p>
                  </td>
                  <td className="py-3 pr-4 text-zinc-300">{prog?.name || r.program_id}</td>
                  <td className="py-3 pr-4">
                    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs', cfg.bg)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} /> {cfg.label}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-zinc-300">{r.score ?? '—'}</td>
                  <td className="py-3 pr-4 text-zinc-300">{r.expiry_date || '—'}</td>
                  <td className="py-3 text-right">
                    {r.status !== 'completed' && (
                      <button onClick={() => markComplete(r)} className="text-xs text-emerald-400 hover:text-emerald-300 mr-2">Mark Complete</button>
                    )}
                    <button onClick={() => delRecord(r)} className="p-1 text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button>
                  </td>
                </tr>
              );
            })}
            {filteredRecords.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-zinc-500">No records match your filters</td></tr>
            )}
          </tbody>
        </table>
        <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-seat-border">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-2 text-xs text-zinc-400">
              <span className={cn('w-2.5 h-2.5 rounded-full', cfg.dot)} />{cfg.label}
            </div>
          ))}
        </div>
      </div>

      {/* Expiring */}
      {expiringRecords.length > 0 && (
        <div className="bg-seat-card border border-amber-500/30 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-amber-400 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Expiring Certifications ({expiringRecords.length})
          </h2>
          <div className="space-y-2">
            {expiringRecords.map((rec) => {
              const prog = programs.find((p) => p.id === rec.program_id);
              const daysLeft = rec.expiry_date ? Math.ceil((new Date(rec.expiry_date).getTime() - now.getTime()) / 86400000) : 0;
              return (
                <div key={rec.id} className="flex items-center justify-between p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                  <div>
                    <p className="text-sm text-white font-medium">{rec.employee_name}</p>
                    <p className="text-xs text-zinc-400">{prog?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn('text-sm font-medium', daysLeft <= 7 ? 'text-red-400' : 'text-amber-400')}>{daysLeft} days left</p>
                    <p className="text-xs text-zinc-500">Expires {rec.expiry_date}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Program modal */}
      <EditModal
        open={progModalOpen}
        onClose={() => setProgModalOpen(false)}
        title={editingProg ? 'Edit Program' : 'Add Program'}
        maxWidth="lg"
        footer={
          <>
            <GhostButton onClick={() => setProgModalOpen(false)}>Cancel</GhostButton>
            {editingProg && <DangerButton onClick={() => { delProgram(editingProg); setProgModalOpen(false); }}>Delete</DangerButton>}
            <PrimaryButton onClick={saveProgram}>{editingProg ? 'Save' : 'Add'}</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <FieldLabel>Program Name</FieldLabel>
            <TextInput value={progForm.name} onChange={(v) => setProgForm({ ...progForm, name: v })} />
          </div>
          <div>
            <FieldLabel>Category</FieldLabel>
            <Select value={progForm.category} onChange={(v) => setProgForm({ ...progForm, category: v })} options={CATEGORIES.map((c) => ({ label: c, value: c }))} />
          </div>
          <div>
            <FieldLabel>Duration (hours)</FieldLabel>
            <TextInput value={progForm.duration_hours} onChange={(v) => setProgForm({ ...progForm, duration_hours: Number(v) || 0 })} type="number" />
          </div>
          <div>
            <FieldLabel>Pass Score (%)</FieldLabel>
            <TextInput value={progForm.pass_score} onChange={(v) => setProgForm({ ...progForm, pass_score: Number(v) || 0 })} type="number" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={progForm.required} onChange={(e) => setProgForm({ ...progForm, required: e.target.checked })} className="rounded border-zinc-600 bg-zinc-800 text-seat-red" />
              Required for all staff
            </label>
          </div>
        </div>
      </EditModal>

      {/* Assign modal */}
      <EditModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Assign Training"
        footer={
          <>
            <GhostButton onClick={() => setAssignOpen(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={assign}>Assign</PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Employee</FieldLabel>
            <Select
              value={assignForm.employee_name}
              onChange={(v) => setAssignForm({ ...assignForm, employee_name: v })}
              options={[{ label: 'Select employee...', value: '' }, ...EMPLOYEES.map((e) => ({ label: `${e.name} (${e.role})`, value: e.name }))]}
            />
          </div>
          <div>
            <FieldLabel>Program</FieldLabel>
            <Select
              value={assignForm.program_id}
              onChange={(v) => setAssignForm({ ...assignForm, program_id: v })}
              options={[{ label: 'Select program...', value: '' }, ...programs.map((p) => ({ label: p.name, value: p.id }))]}
            />
          </div>
        </div>
      </EditModal>
    </div>
  );
}
