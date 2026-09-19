'use client';

import { useState, useMemo } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import {
  CalendarDays, Plus, ChevronLeft, ChevronRight, Clock, Users, Pencil, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useCrudApi } from '@/hooks/use-crud-api';
import {
  EditModal, FieldLabel, TextInput, Select, PrimaryButton, GhostButton, DangerButton,
} from '@/components/dashboard/edit-modal';

interface Shift {
  id: string;
  staff_name: string;
  role: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes: string;
}

const ROLES = ['Server', 'Host', 'Bartender', 'Line Cook', 'Sous Chef', 'Dishwasher', 'Manager'];

const ROLE_COLORS: Record<string, string> = {
  Server: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Host: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Bartender: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Line Cook': 'bg-red-500/10 text-red-400 border-red-500/20',
  'Sous Chef': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Dishwasher: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  Manager: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function hoursBetween(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let diff = eh * 60 + em - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return diff / 60;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function makeInitialShifts(): Shift[] {
  const today = new Date();
  const monday = getWeekStart(today);
  const dayOffset = (n: number) => {
    const d = new Date(monday.getTime() + n * 86400000);
    return d.toISOString().split('T')[0];
  };
  return [
    { id: 's1', staff_name: 'Marco Silva', role: 'Server', date: dayOffset(1), start_time: '11:00', end_time: '17:00', status: 'scheduled', notes: '' },
    { id: 's2', staff_name: 'Sarah Chen', role: 'Bartender', date: dayOffset(1), start_time: '16:00', end_time: '23:00', status: 'confirmed', notes: '' },
    { id: 's3', staff_name: 'James Park', role: 'Sous Chef', date: dayOffset(2), start_time: '10:00', end_time: '19:00', status: 'scheduled', notes: '' },
    { id: 's4', staff_name: 'Lisa Rodriguez', role: 'Host', date: dayOffset(3), start_time: '17:00', end_time: '22:00', status: 'scheduled', notes: '' },
    { id: 's5', staff_name: 'Emma Wilson', role: 'Server', date: dayOffset(4), start_time: '11:00', end_time: '17:00', status: 'confirmed', notes: '' },
    { id: 's6', staff_name: 'David Kim', role: 'Line Cook', date: dayOffset(5), start_time: '14:00', end_time: '22:00', status: 'scheduled', notes: '' },
    { id: 's7', staff_name: 'Marco Silva', role: 'Server', date: dayOffset(6), start_time: '17:00', end_time: '23:00', status: 'scheduled', notes: '' },
  ];
}

function emptyShift(): Shift {
  return {
    id: '',
    staff_name: '',
    role: 'Server',
    date: new Date().toISOString().split('T')[0],
    start_time: '08:00',
    end_time: '16:00',
    status: 'scheduled',
    notes: '',
  };
}

export default function StaffSchedulePage() {
  const { items: shifts, add, update, remove } = useCrudApi<Shift>('/api/staff-shifts');
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [form, setForm] = useState<Shift>(emptyShift());

  const today = new Date().toISOString().split('T')[0];

  const weekDates = useMemo(() => {
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart.getTime() + i * 86400000);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, [weekStart]);

  const weekShifts = useMemo(
    () => shifts.filter((s) => weekDates.includes(s.date)),
    [shifts, weekDates],
  );

  const stats = useMemo(() => {
    const today_shifts = shifts.filter((s) => s.date === today).length;
    const totalHours = weekShifts.reduce((sum, s) => sum + hoursBetween(s.start_time, s.end_time), 0);
    const uniqueStaff = new Set(shifts.map((s) => s.staff_name));
    return {
      today_shifts,
      week_shifts: weekShifts.length,
      total_staff: uniqueStaff.size,
      hours_scheduled: Math.round(totalHours * 10) / 10,
    };
  }, [shifts, weekShifts, today]);

  const openAdd = (date?: string) => {
    setEditing(null);
    setForm({ ...emptyShift(), date: date || new Date().toISOString().split('T')[0] });
    setModalOpen(true);
  };
  const openEdit = (shift: Shift) => {
    setEditing(shift);
    setForm(shift);
    setModalOpen(true);
  };
  const save = () => {
    if (!form.staff_name.trim()) { toast.error('Staff name is required'); return; }
    if (editing) {
      update(editing.id, form);
      toast.success('Shift updated');
    } else {
      add({ ...form });
      toast.success('Shift added');
    }
    setModalOpen(false);
  };
  const del = (shift: Shift) => {
    if (!confirm(`Delete shift for ${shift.staff_name}?`)) return;
    remove(shift.id);
    toast.success('Shift deleted');
  };

  const prevWeek = () => setWeekStart(new Date(weekStart.getTime() - 7 * 86400000));
  const nextWeek = () => setWeekStart(new Date(weekStart.getTime() + 7 * 86400000));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Staff Schedule</h1>
            <p className="text-sm text-zinc-500">Manage shifts and staffing</p>
          </div>
        </div>
        <button onClick={() => openAdd()} className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 transition">
          <Plus size={16} /> Add Shift
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Today's Shifts" value={stats.today_shifts} icon={<CalendarDays size={18} />} />
        <MetricCard title="This Week" value={stats.week_shifts} icon={<Clock size={18} />} />
        <MetricCard title="Total Staff" value={stats.total_staff} icon={<Users size={18} />} />
        <MetricCard title="Hours Scheduled" value={stats.hours_scheduled} subtitle="this week" icon={<Clock size={18} />} />
      </div>

      <div className="flex items-center justify-between">
        <button onClick={prevWeek} className="p-2 text-zinc-400 hover:text-white transition-colors">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-sm font-medium text-white">
          Week of {weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </h2>
        <button onClick={nextWeek} className="p-2 text-zinc-400 hover:text-white transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {weekDates.map((dateStr) => {
          const dayShifts = shifts.filter((s) => s.date === dateStr);
          const isToday = dateStr === today;
          return (
            <div key={dateStr} className={cn('bg-seat-card border rounded-xl p-3 min-h-[200px] hover:border-zinc-600 transition', isToday ? 'border-seat-red/50' : 'border-seat-border')}>
              <div className={cn('flex items-center justify-between text-xs font-medium mb-2 pb-2 border-b border-seat-border/50', isToday ? 'text-seat-red' : 'text-zinc-400')}>
                <span>{formatDate(dateStr)}</span>
                <button onClick={() => openAdd(dateStr)} className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white">
                  <Plus size={12} />
                </button>
              </div>
              <div className="space-y-1.5">
                {dayShifts.map((shift) => (
                  <button
                    key={shift.id}
                    onClick={() => openEdit(shift)}
                    className={cn('w-full text-left text-[10px] p-1.5 rounded border hover:opacity-80 transition', ROLE_COLORS[shift.role] || 'bg-zinc-800 text-zinc-400 border-zinc-700')}
                  >
                    <div className="font-medium truncate">{shift.staff_name}</div>
                    <div className="opacity-70">{shift.start_time}-{shift.end_time}</div>
                  </button>
                ))}
                {dayShifts.length === 0 && <p className="text-[10px] text-zinc-700 text-center py-4">No shifts</p>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Today&apos;s Schedule Detail</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-seat-border">
                <th className="text-left py-2 px-3 text-zinc-500 font-medium text-xs">Staff</th>
                <th className="text-left py-2 px-3 text-zinc-500 font-medium text-xs">Role</th>
                <th className="text-left py-2 px-3 text-zinc-500 font-medium text-xs">Shift</th>
                <th className="text-left py-2 px-3 text-zinc-500 font-medium text-xs">Status</th>
                <th className="text-right py-2 px-3 text-zinc-500 font-medium text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shifts.filter((s) => s.date === today).map((shift) => (
                <tr key={shift.id} className="border-b border-seat-border/50">
                  <td className="py-2 px-3 text-white font-medium">{shift.staff_name}</td>
                  <td className="py-2 px-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border', ROLE_COLORS[shift.role] || 'bg-zinc-800 text-zinc-400 border-zinc-700')}>{shift.role}</span>
                  </td>
                  <td className="py-2 px-3 text-zinc-300">{shift.start_time} - {shift.end_time}</td>
                  <td className="py-2 px-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full', shift.status === 'confirmed' ? 'bg-green-500/10 text-green-400' : shift.status === 'completed' ? 'bg-blue-500/10 text-blue-400' : shift.status === 'cancelled' ? 'bg-red-500/10 text-red-400' : 'bg-zinc-800 text-zinc-400')}>
                      {shift.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button onClick={() => openEdit(shift)} className="p-1 text-zinc-400 hover:text-white"><Pencil size={12} /></button>
                    <button onClick={() => del(shift)} className="p-1 text-zinc-400 hover:text-red-400 ml-1"><Trash2 size={12} /></button>
                  </td>
                </tr>
              ))}
              {shifts.filter((s) => s.date === today).length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-zinc-500">No shifts today</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Shift' : 'Add Shift'}
        maxWidth="lg"
        footer={
          <>
            <GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton>
            {editing && <DangerButton onClick={() => { del(editing); setModalOpen(false); }}>Delete</DangerButton>}
            <PrimaryButton onClick={save}>{editing ? 'Save changes' : 'Add shift'}</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <FieldLabel>Staff Name</FieldLabel>
            <TextInput value={form.staff_name} onChange={(v) => setForm({ ...form, staff_name: v })} placeholder="Jane Doe" />
          </div>
          <div>
            <FieldLabel>Role</FieldLabel>
            <Select value={form.role} onChange={(v) => setForm({ ...form, role: v })} options={ROLES.map((r) => ({ label: r, value: r }))} />
          </div>
          <div>
            <FieldLabel>Date</FieldLabel>
            <TextInput value={form.date} onChange={(v) => setForm({ ...form, date: v })} type="date" />
          </div>
          <div>
            <FieldLabel>Start Time</FieldLabel>
            <TextInput value={form.start_time} onChange={(v) => setForm({ ...form, start_time: v })} type="time" />
          </div>
          <div>
            <FieldLabel>End Time</FieldLabel>
            <TextInput value={form.end_time} onChange={(v) => setForm({ ...form, end_time: v })} type="time" />
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Status</FieldLabel>
            <Select
              value={form.status}
              onChange={(v) => setForm({ ...form, status: v as Shift['status'] })}
              options={[
                { label: 'Scheduled', value: 'scheduled' },
                { label: 'Confirmed', value: 'confirmed' },
                { label: 'Completed', value: 'completed' },
                { label: 'Cancelled', value: 'cancelled' },
              ]}
            />
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Notes</FieldLabel>
            <TextInput value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} placeholder="Optional" />
          </div>
        </div>
      </EditModal>
    </div>
  );
}
