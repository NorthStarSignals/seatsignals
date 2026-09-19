'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import {
  ClipboardCheck, Users, CheckCircle, Clock, ChevronDown, ChevronUp, Plus, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal, FieldLabel, TextInput, Select, PrimaryButton, GhostButton,
} from '@/components/dashboard/edit-modal';

interface OnboardingTask {
  id: string;
  category: string;
  task: string;
  required: boolean;
  estimated_time: string;
  completed: boolean;
  completed_date: string | null;
}

interface EmployeeOnboarding {
  id: string;
  employee_name: string;
  role: string;
  start_date: string;
  tasks: OnboardingTask[];
}

const STATUS_STYLES: Record<string, string> = {
  not_started: 'bg-zinc-800 text-zinc-400',
  in_progress: 'bg-amber-500/10 text-amber-400',
  completed: 'bg-green-500/10 text-green-400',
};

const ROLE_COLORS: Record<string, string> = {
  Server: 'bg-blue-500/10 text-blue-400',
  'Line Cook': 'bg-orange-500/10 text-orange-400',
  Bartender: 'bg-amber-500/10 text-amber-400',
  Host: 'bg-purple-500/10 text-purple-400',
  'Sous Chef': 'bg-red-500/10 text-red-400',
  Manager: 'bg-emerald-500/10 text-emerald-400',
};

const ROLES = ['Server', 'Host', 'Bartender', 'Line Cook', 'Sous Chef', 'Dishwasher', 'Manager'];
const CATEGORIES = ['Paperwork', 'Training', 'Orientation', 'Systems', 'Shadowing'];

function defaultTasks(): OnboardingTask[] {
  return [
    { id: `t${Date.now()}-1`, category: 'Paperwork', task: 'Sign employment agreement', required: true, estimated_time: '15m', completed: false, completed_date: null },
    { id: `t${Date.now()}-2`, category: 'Paperwork', task: 'Submit tax forms (W4)', required: true, estimated_time: '10m', completed: false, completed_date: null },
    { id: `t${Date.now()}-3`, category: 'Training', task: 'Complete food safety training', required: true, estimated_time: '1h', completed: false, completed_date: null },
    { id: `t${Date.now()}-4`, category: 'Orientation', task: 'Tour facility + meet team', required: true, estimated_time: '30m', completed: false, completed_date: null },
    { id: `t${Date.now()}-5`, category: 'Systems', task: 'Set up POS login', required: true, estimated_time: '10m', completed: false, completed_date: null },
    { id: `t${Date.now()}-6`, category: 'Shadowing', task: 'Shadow experienced staff (2 shifts)', required: true, estimated_time: '8h', completed: false, completed_date: null },
  ];
}

const INITIAL: EmployeeOnboarding[] = [
  { id: 'ob1', employee_name: 'Jake Martinez', role: 'Server', start_date: new Date().toISOString().split('T')[0], tasks: defaultTasks().map((t, i) => ({ ...t, completed: i < 2, completed_date: i < 2 ? new Date().toISOString() : null })) },
  { id: 'ob2', employee_name: 'Priya Shah', role: 'Line Cook', start_date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0], tasks: defaultTasks().map((t, i) => ({ ...t, completed: i < 4, completed_date: i < 4 ? new Date().toISOString() : null })) },
];

function progressOf(ob: EmployeeOnboarding) {
  if (ob.tasks.length === 0) return 0;
  return Math.round((ob.tasks.filter((t) => t.completed).length / ob.tasks.length) * 100);
}
function statusOf(ob: EmployeeOnboarding) {
  const p = progressOf(ob);
  return p === 100 ? 'completed' : p > 0 ? 'in_progress' : 'not_started';
}

export default function OnboardingPage() {
  const { items, add, update, remove } = useCrudList<EmployeeOnboarding>(
    'seatsignals_staff_onboarding',
    INITIAL,
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addHireOpen, setAddHireOpen] = useState(false);
  const [newHire, setNewHire] = useState({ employee_name: '', role: 'Server', start_date: new Date().toISOString().split('T')[0] });

  const [taskModalFor, setTaskModalFor] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({ category: 'Training', task: '', required: true, estimated_time: '30m' });

  const stats = {
    total_new_hires: items.length,
    active_onboarding: items.filter((o) => statusOf(o) !== 'completed').length,
    completed: items.filter((o) => statusOf(o) === 'completed').length,
    avg_progress: items.length ? Math.round(items.reduce((s, o) => s + progressOf(o), 0) / items.length) : 0,
  };

  const addHire = () => {
    if (!newHire.employee_name.trim()) { toast.error('Name is required'); return; }
    add({
      id: Date.now().toString(),
      employee_name: newHire.employee_name,
      role: newHire.role,
      start_date: newHire.start_date,
      tasks: defaultTasks(),
    });
    toast.success('New hire added');
    setAddHireOpen(false);
    setNewHire({ employee_name: '', role: 'Server', start_date: new Date().toISOString().split('T')[0] });
  };

  const toggleTask = (ob: EmployeeOnboarding, task: OnboardingTask) => {
    const newTasks = ob.tasks.map((t) =>
      t.id === task.id
        ? { ...t, completed: !t.completed, completed_date: !t.completed ? new Date().toISOString() : null }
        : t,
    );
    update(ob.id, { tasks: newTasks });
    toast.success(task.completed ? 'Task unchecked' : 'Task completed');
  };

  const addTask = () => {
    if (!taskModalFor) return;
    if (!taskForm.task.trim()) { toast.error('Task description required'); return; }
    const ob = items.find((o) => o.id === taskModalFor);
    if (!ob) return;
    const newTask: OnboardingTask = {
      id: Date.now().toString(),
      category: taskForm.category,
      task: taskForm.task,
      required: taskForm.required,
      estimated_time: taskForm.estimated_time,
      completed: false,
      completed_date: null,
    };
    update(ob.id, { tasks: [...ob.tasks, newTask] });
    toast.success('Task added');
    setTaskModalFor(null);
    setTaskForm({ category: 'Training', task: '', required: true, estimated_time: '30m' });
  };

  const delTask = (ob: EmployeeOnboarding, task: OnboardingTask) => {
    if (!confirm(`Delete task "${task.task}"?`)) return;
    update(ob.id, { tasks: ob.tasks.filter((t) => t.id !== task.id) });
    toast.success('Task removed');
  };

  const delHire = (ob: EmployeeOnboarding) => {
    if (!confirm(`Remove ${ob.employee_name} from onboarding?`)) return;
    remove(ob.id);
    toast.success('Hire removed');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Employee Onboarding</h1>
            <p className="text-sm text-zinc-500">Track new hire onboarding progress</p>
          </div>
        </div>
        <button onClick={() => setAddHireOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 transition">
          <Plus size={16} /> Add New Hire
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="New Hires" value={stats.total_new_hires} icon={<Users size={18} />} />
        <MetricCard title="In Progress" value={stats.active_onboarding} icon={<Clock size={18} />} />
        <MetricCard title="Completed" value={stats.completed} icon={<CheckCircle size={18} />} />
        <MetricCard title="Avg Progress" value={`${stats.avg_progress}%`} icon={<ClipboardCheck size={18} />} />
      </div>

      <div className="space-y-4">
        {items.map((ob) => {
          const isOpen = expanded === ob.id;
          const status = statusOf(ob);
          const progress = progressOf(ob);
          const categories = Array.from(new Set(ob.tasks.map((t) => t.category)));
          return (
            <div key={ob.id} className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
              <div className="w-full p-4 flex items-center gap-4 hover:bg-zinc-800/20 transition">
                <button onClick={() => setExpanded(isOpen ? null : ob.id)} className="w-10 h-10 rounded-full bg-seat-red/10 flex items-center justify-center text-seat-red text-sm font-bold flex-shrink-0">
                  {ob.employee_name.split(' ').map((n) => n[0]).join('')}
                </button>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(isOpen ? null : ob.id)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-white">{ob.employee_name}</h3>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', ROLE_COLORS[ob.role] || 'bg-zinc-800 text-zinc-400')}>{ob.role}</span>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', STATUS_STYLES[status])}>{status.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all', progress === 100 ? 'bg-green-500' : 'bg-seat-red')} style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-xs text-zinc-400">{progress}% · Started {new Date(ob.start_date).toLocaleDateString()}</span>
                  </div>
                </div>
                <button onClick={() => setTaskModalFor(ob.id)} className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800"><Plus size={14} /></button>
                <button onClick={() => delHire(ob)} className="p-1.5 text-zinc-500 hover:text-red-400 rounded hover:bg-zinc-800"><Trash2 size={14} /></button>
                {isOpen ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
              </div>

              {isOpen && (
                <div className="border-t border-seat-border/50 px-4 pb-4 space-y-4">
                  {categories.map((cat) => (
                    <div key={cat}>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-3 mb-2 px-2">{cat}</p>
                      <div className="space-y-1">
                        {ob.tasks.filter((t) => t.category === cat).map((task) => (
                          <div key={task.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800/30 transition group">
                            <button onClick={() => toggleTask(ob, task)} className={cn('w-4 h-4 rounded border flex items-center justify-center flex-shrink-0', task.completed ? 'bg-green-500 border-green-500' : 'border-zinc-600')}>
                              {task.completed && <CheckCircle size={10} className="text-white" />}
                            </button>
                            <span className={cn('text-sm flex-1 text-left', task.completed ? 'text-zinc-500 line-through' : 'text-white')}>{task.task}</span>
                            {task.required && <span className="text-[9px] px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded">Required</span>}
                            <span className="text-[10px] text-zinc-600">{task.estimated_time}</span>
                            <button onClick={() => delTask(ob, task)} className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 transition">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {ob.tasks.length === 0 && <p className="text-xs text-zinc-500 px-3">No tasks yet. Click + to add one.</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <EditModal
        open={addHireOpen}
        onClose={() => setAddHireOpen(false)}
        title="Add New Hire"
        footer={
          <>
            <GhostButton onClick={() => setAddHireOpen(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={addHire}>Add Hire</PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Name</FieldLabel>
            <TextInput value={newHire.employee_name} onChange={(v) => setNewHire({ ...newHire, employee_name: v })} />
          </div>
          <div>
            <FieldLabel>Role</FieldLabel>
            <Select value={newHire.role} onChange={(v) => setNewHire({ ...newHire, role: v })} options={ROLES.map((r) => ({ label: r, value: r }))} />
          </div>
          <div>
            <FieldLabel>Start Date</FieldLabel>
            <TextInput value={newHire.start_date} onChange={(v) => setNewHire({ ...newHire, start_date: v })} type="date" />
          </div>
        </div>
      </EditModal>

      <EditModal
        open={taskModalFor !== null}
        onClose={() => setTaskModalFor(null)}
        title="Add Onboarding Task"
        footer={
          <>
            <GhostButton onClick={() => setTaskModalFor(null)}>Cancel</GhostButton>
            <PrimaryButton onClick={addTask}>Add Task</PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Task</FieldLabel>
            <TextInput value={taskForm.task} onChange={(v) => setTaskForm({ ...taskForm, task: v })} placeholder="Describe the task" />
          </div>
          <div>
            <FieldLabel>Category</FieldLabel>
            <Select value={taskForm.category} onChange={(v) => setTaskForm({ ...taskForm, category: v })} options={CATEGORIES.map((c) => ({ label: c, value: c }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Estimated Time</FieldLabel>
              <TextInput value={taskForm.estimated_time} onChange={(v) => setTaskForm({ ...taskForm, estimated_time: v })} placeholder="30m" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={taskForm.required} onChange={(e) => setTaskForm({ ...taskForm, required: e.target.checked })} className="rounded border-zinc-600 bg-zinc-800 text-seat-red" />
                Required
              </label>
            </div>
          </div>
        </div>
      </EditModal>
    </div>
  );
}
