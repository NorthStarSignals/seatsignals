'use client';

import { useState, useMemo } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import {
  Clock, UserCheck, Coffee, LogOut, Play, Pause, Square, Plus, Users, Trash2, Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal, FieldLabel, TextInput, Select, PrimaryButton, GhostButton,
} from '@/components/dashboard/edit-modal';

interface TimeEntry {
  id: string;
  employee_name: string;
  role: string;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  date: string;
  status: 'clocked_in' | 'on_break' | 'clocked_out';
}

const ROLES = ['Server', 'Bartender', 'Host', 'Line Cook', 'Sous Chef', 'Dishwasher', 'Expo', 'Manager'];

const ROLE_COLORS: Record<string, string> = {
  Server: 'bg-blue-500/10 text-blue-400',
  Bartender: 'bg-amber-500/10 text-amber-400',
  Host: 'bg-purple-500/10 text-purple-400',
  'Line Cook': 'bg-orange-500/10 text-orange-400',
  'Sous Chef': 'bg-red-500/10 text-red-400',
  Dishwasher: 'bg-cyan-500/10 text-cyan-400',
  Expo: 'bg-emerald-500/10 text-emerald-400',
  Manager: 'bg-pink-500/10 text-pink-400',
};

const STATUS_STYLES: Record<string, string> = {
  clocked_in: 'bg-green-500/10 text-green-400',
  on_break: 'bg-amber-500/10 text-amber-400',
  clocked_out: 'bg-zinc-800 text-zinc-400',
};

function today() {
  return new Date().toISOString().split('T')[0];
}

function hoursBetween(from: string, to: string, breakMins: number) {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(0, ms / 3600000 - breakMins / 60);
}

function makeInitial(): TimeEntry[] {
  const now = new Date();
  const t = today();
  const threeH = new Date(now.getTime() - 3 * 3600 * 1000).toISOString();
  const fiveH = new Date(now.getTime() - 5 * 3600 * 1000).toISOString();
  const eightH = new Date(now.getTime() - 8 * 3600 * 1000).toISOString();
  return [
    { id: 't1', employee_name: 'Marco Silva', role: 'Server', clock_in: threeH, clock_out: null, break_minutes: 0, date: t, status: 'clocked_in' },
    { id: 't2', employee_name: 'Sarah Chen', role: 'Bartender', clock_in: fiveH, clock_out: null, break_minutes: 15, date: t, status: 'on_break' },
    { id: 't3', employee_name: 'James Park', role: 'Sous Chef', clock_in: eightH, clock_out: new Date(now.getTime() - 1000 * 60 * 60).toISOString(), break_minutes: 30, date: t, status: 'clocked_out' },
  ];
}

export default function TimeClockPage() {
  const { items: entries, add, update, remove } = useCrudList<TimeEntry>(
    'seatsignals_staff_timeclock',
    makeInitial(),
  );
  const [tab, setTab] = useState<'active' | 'today' | 'all'>('active');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ employee_name: '', role: 'Server' });

  const activeEntries = useMemo(
    () => entries.filter((e) => e.status !== 'clocked_out'),
    [entries],
  );
  const todayEntries = useMemo(
    () => entries.filter((e) => e.date === today()),
    [entries],
  );

  const stats = useMemo(() => ({
    active_now: activeEntries.length,
    clocked_in: entries.filter((e) => e.status === 'clocked_in').length,
    on_break: entries.filter((e) => e.status === 'on_break').length,
    total_hours_today: Math.round(
      todayEntries.reduce((sum, e) => {
        const end = e.clock_out || new Date().toISOString();
        return sum + hoursBetween(e.clock_in, end, e.break_minutes);
      }, 0) * 10,
    ) / 10,
  }), [activeEntries, entries, todayEntries]);

  const clockIn = () => {
    if (!form.employee_name.trim()) { toast.error('Enter a name'); return; }
    add({
      id: Date.now().toString(),
      employee_name: form.employee_name,
      role: form.role,
      clock_in: new Date().toISOString(),
      clock_out: null,
      break_minutes: 0,
      date: today(),
      status: 'clocked_in',
    });
    toast.success(`${form.employee_name} clocked in`);
    setForm({ employee_name: '', role: 'Server' });
    setModalOpen(false);
  };

  const setStatus = (entry: TimeEntry, action: 'break' | 'resume' | 'clock_out') => {
    if (action === 'break') {
      update(entry.id, { status: 'on_break' });
      toast.success(`${entry.employee_name} on break`);
    } else if (action === 'resume') {
      update(entry.id, { status: 'clocked_in', break_minutes: entry.break_minutes + 15 });
      toast.success(`${entry.employee_name} back from break`);
    } else {
      update(entry.id, { status: 'clocked_out', clock_out: new Date().toISOString() });
      toast.success(`${entry.employee_name} clocked out`);
    }
  };

  const del = (entry: TimeEntry) => {
    if (!confirm(`Delete time entry for ${entry.employee_name}?`)) return;
    remove(entry.id);
    toast.success('Entry deleted');
  };

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatElapsed = (hours: number) => `${Math.floor(hours)}h ${Math.round((hours - Math.floor(hours)) * 60)}m`;

  const visible = useMemo(() => {
    let list = tab === 'active' ? activeEntries : tab === 'today' ? todayEntries : entries;
    if (dateFilter) list = list.filter((e) => e.date === dateFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.employee_name.toLowerCase().includes(q));
    }
    return list;
  }, [tab, activeEntries, todayEntries, entries, dateFilter, search]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Time Clock</h1>
            <p className="text-sm text-zinc-500">Employee clock in/out tracking</p>
          </div>
        </div>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 transition">
          <Plus size={16} /> Clock In
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Active Now" value={stats.active_now} icon={<Users size={18} />} />
        <MetricCard title="Clocked In" value={stats.clocked_in} icon={<UserCheck size={18} />} />
        <MetricCard title="On Break" value={stats.on_break} icon={<Coffee size={18} />} />
        <MetricCard title="Hours Today" value={`${stats.total_hours_today}h`} icon={<Clock size={18} />} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(['active', 'today', 'all'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors', tab === t ? 'bg-seat-red text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white')}>
            {t === 'active' ? `Active (${activeEntries.length})` : t === 'today' ? `Today (${todayEntries.length})` : `All (${entries.length})`}
          </button>
        ))}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee..." className="pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-seat-red" />
        </div>
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-seat-red" />
        {dateFilter && <button onClick={() => setDateFilter('')} className="text-xs text-zinc-400 hover:text-white">Clear</button>}
      </div>

      {tab === 'active' && (
        <div className="space-y-3">
          {visible.map((entry) => {
            const elapsed = hoursBetween(entry.clock_in, entry.clock_out || new Date().toISOString(), entry.break_minutes);
            return (
              <div key={entry.id} className={cn('bg-seat-card border rounded-xl p-4 flex flex-wrap items-center gap-4', entry.status === 'on_break' ? 'border-amber-500/30' : elapsed > 8 ? 'border-red-500/30' : 'border-seat-border')}>
                <div className="w-10 h-10 rounded-full bg-seat-red/10 flex items-center justify-center text-seat-red text-sm font-bold flex-shrink-0">
                  {entry.employee_name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-white">{entry.employee_name}</h3>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', ROLE_COLORS[entry.role] || 'bg-zinc-800 text-zinc-400')}>{entry.role}</span>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', STATUS_STYLES[entry.status])}>{entry.status.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400 flex-wrap">
                    <span>In: {formatTime(entry.clock_in)}</span>
                    <span className={cn(elapsed > 8 ? 'text-red-400' : 'text-emerald-400')}>{formatElapsed(elapsed)} elapsed</span>
                    {entry.break_minutes > 0 && <span>Break: {entry.break_minutes}m</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {entry.status === 'clocked_in' && (
                    <button onClick={() => setStatus(entry, 'break')} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20 hover:bg-amber-500/20 transition">
                      <Pause size={12} /> Break
                    </button>
                  )}
                  {entry.status === 'on_break' && (
                    <button onClick={() => setStatus(entry, 'resume')} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-500/10 text-green-400 rounded-lg border border-green-500/20 hover:bg-green-500/20 transition">
                      <Play size={12} /> Resume
                    </button>
                  )}
                  <button onClick={() => setStatus(entry, 'clock_out')} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition">
                    <Square size={12} /> Clock Out
                  </button>
                  <button onClick={() => del(entry)} className="p-2 text-zinc-500 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
          {visible.length === 0 && (
            <div className="text-center py-20">
              <LogOut size={48} className="mx-auto text-zinc-700 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-1">No Active Employees</h3>
              <p className="text-sm text-zinc-400">Clock in employees as they arrive</p>
            </div>
          )}
        </div>
      )}

      {tab !== 'active' && (
        <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-seat-border">
                <th className="text-left px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Employee</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Role</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">In</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Out</th>
                <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Break</th>
                <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Total</th>
                <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((entry) => {
                const elapsed = entry.clock_out ? hoursBetween(entry.clock_in, entry.clock_out, entry.break_minutes) : null;
                return (
                  <tr key={entry.id} className="border-b border-seat-border/50 hover:bg-zinc-800/30">
                    <td className="px-4 py-3 text-white font-medium">{entry.employee_name}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full', ROLE_COLORS[entry.role] || 'bg-zinc-800 text-zinc-400')}>{entry.role}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{entry.date}</td>
                    <td className="px-4 py-3 text-zinc-300">{formatTime(entry.clock_in)}</td>
                    <td className="px-4 py-3 text-zinc-300">{entry.clock_out ? formatTime(entry.clock_out) : '—'}</td>
                    <td className="px-4 py-3 text-right text-zinc-400">{entry.break_minutes}m</td>
                    <td className="px-4 py-3 text-right text-white font-medium">{elapsed != null ? `${elapsed.toFixed(1)}h` : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => del(entry)} className="p-1 text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-zinc-500">No entries match</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Clock In Employee"
        footer={
          <>
            <GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={clockIn}>Clock In</PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Employee Name</FieldLabel>
            <TextInput value={form.employee_name} onChange={(v) => setForm({ ...form, employee_name: v })} placeholder="Jane Doe" />
          </div>
          <div>
            <FieldLabel>Role</FieldLabel>
            <Select value={form.role} onChange={(v) => setForm({ ...form, role: v })} options={ROLES.map((r) => ({ label: r, value: r }))} />
          </div>
        </div>
      </EditModal>
    </div>
  );
}
