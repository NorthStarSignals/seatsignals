'use client';

import { useMemo, useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { formatCurrency } from '@/lib/utils';
import {
  DollarSign, Users, Clock, TrendingUp, Play, History, Plus, Trash2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';
import { useCrudList, useLocalStorageState } from '@/hooks/use-local-storage-state';
import {
  EditModal, FieldLabel, TextInput, Select, PrimaryButton, GhostButton,
} from '@/components/dashboard/edit-modal';

interface PayrollEntry {
  id: string;
  employee_name: string;
  role: string;
  hourly_rate: number;
  regular_hours: number;
  overtime_hours: number;
  tips_earned: number;
}

interface PayrollRun {
  id: string;
  run_at: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  total_gross: number;
  total_net: number;
  employees: number;
}

const ROLES = ['Server', 'Bartender', 'Host', 'Line Cook', 'Sous Chef', 'Dishwasher', 'Manager'];

const INITIAL_PAYROLL: PayrollEntry[] = [
  { id: 'p1', employee_name: 'Marco Silva', role: 'Server', hourly_rate: 16, regular_hours: 40, overtime_hours: 0, tips_earned: 450 },
  { id: 'p2', employee_name: 'Sarah Chen', role: 'Bartender', hourly_rate: 18, regular_hours: 38, overtime_hours: 2, tips_earned: 580 },
  { id: 'p3', employee_name: 'James Park', role: 'Sous Chef', hourly_rate: 26, regular_hours: 40, overtime_hours: 5, tips_earned: 0 },
  { id: 'p4', employee_name: 'Lisa Rodriguez', role: 'Host', hourly_rate: 15, regular_hours: 32, overtime_hours: 0, tips_earned: 120 },
  { id: 'p5', employee_name: 'David Kim', role: 'Line Cook', hourly_rate: 19, regular_hours: 40, overtime_hours: 3, tips_earned: 0 },
  { id: 'p6', employee_name: 'Emma Wilson', role: 'Server', hourly_rate: 17, regular_hours: 36, overtime_hours: 0, tips_earned: 420 },
];

function computeRow(p: PayrollEntry) {
  const gross = p.hourly_rate * p.regular_hours + p.hourly_rate * 1.5 * p.overtime_hours + p.tips_earned;
  const deductions = gross * 0.22;
  const net = gross - deductions;
  return { gross, deductions, net };
}

function emptyEntry(): PayrollEntry {
  return { id: '', employee_name: '', role: 'Server', hourly_rate: 15, regular_hours: 0, overtime_hours: 0, tips_earned: 0 };
}

export default function PayrollPage() {
  const { items: payroll, add, update, remove } = useCrudList<PayrollEntry>(
    'seatsignals_staff_payroll',
    INITIAL_PAYROLL,
  );
  const [history, setHistory] = useLocalStorageState<PayrollRun[]>(
    'seatsignals_staff_payroll_history',
    [],
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PayrollEntry | null>(null);
  const [form, setForm] = useState<PayrollEntry>(emptyEntry());
  const [running, setRunning] = useState(false);

  const period = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 13 * 86400000);
    const pay = new Date(end.getTime() + 3 * 86400000);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      pay_date: pay.toISOString().split('T')[0],
    };
  }, []);

  const rows = payroll.map((p) => ({ ...p, ...computeRow(p) }));
  const byRole = useMemo(() => {
    const map = new Map<string, { count: number; total_pay: number; total_hours: number }>();
    rows.forEach((r) => {
      const b = map.get(r.role) || { count: 0, total_pay: 0, total_hours: 0 };
      b.count++;
      b.total_pay += r.gross;
      b.total_hours += r.regular_hours + r.overtime_hours;
      map.set(r.role, b);
    });
    return Array.from(map.entries()).map(([role, b]) => ({ role, ...b, avg_pay: b.total_pay / b.count }));
  }, [rows]);
  const stats = useMemo(() => ({
    total_employees: rows.length,
    total_gross: rows.reduce((s, r) => s + r.gross, 0),
    total_net: rows.reduce((s, r) => s + r.net, 0),
    total_tips: rows.reduce((s, r) => s + r.tips_earned, 0),
    total_overtime_hours: rows.reduce((s, r) => s + r.overtime_hours, 0),
    total_hours: rows.reduce((s, r) => s + r.regular_hours + r.overtime_hours, 0),
    avg_hourly_cost: rows.length > 0 ? rows.reduce((s, r) => s + r.gross, 0) / rows.reduce((s, r) => s + r.regular_hours + r.overtime_hours, 0) : 0,
  }), [rows]);

  const openAdd = () => { setEditing(null); setForm(emptyEntry()); setModalOpen(true); };
  const openEdit = (p: PayrollEntry) => { setEditing(p); setForm(p); setModalOpen(true); };
  const save = () => {
    if (!form.employee_name.trim()) { toast.error('Name is required'); return; }
    if (editing) { update(editing.id, form); toast.success('Entry updated'); }
    else { add({ ...form, id: Date.now().toString() }); toast.success('Entry added'); }
    setModalOpen(false);
  };
  const del = (p: PayrollEntry) => {
    if (!confirm(`Remove ${p.employee_name}?`)) return;
    remove(p.id);
    toast.success('Entry removed');
  };

  const runPayroll = async () => {
    if (rows.length === 0) { toast.error('No payroll entries to run'); return; }
    setRunning(true);
    const tid = toast.loading('Running payroll...');
    await new Promise((r) => setTimeout(r, 900));
    const run: PayrollRun = {
      id: Date.now().toString(),
      run_at: new Date().toISOString(),
      period_start: period.start,
      period_end: period.end,
      pay_date: period.pay_date,
      total_gross: stats.total_gross,
      total_net: stats.total_net,
      employees: stats.total_employees,
    };
    setHistory((h) => [run, ...h]);
    toast.dismiss(tid);
    toast.success(`Payroll run: ${formatCurrency(stats.total_net)} to ${stats.total_employees} employees`);
    setRunning(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Payroll Summary</h1>
            <p className="text-sm text-zinc-500">
              Period: {new Date(period.start).toLocaleDateString()} – {new Date(period.end).toLocaleDateString()}
              {' '}· Pay Date: {new Date(period.pay_date).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white rounded-lg text-sm font-medium hover:bg-zinc-700 transition">
            <Plus size={16} /> Add Entry
          </button>
          <button onClick={runPayroll} disabled={running} className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 transition disabled:opacity-50">
            <Play size={16} /> {running ? 'Running...' : 'Run Payroll'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total Gross" value={formatCurrency(stats.total_gross)} icon={<DollarSign size={18} />} />
        <MetricCard title="Total Net" value={formatCurrency(stats.total_net)} icon={<TrendingUp size={18} />} />
        <MetricCard title="Employees" value={stats.total_employees} icon={<Users size={18} />} />
        <MetricCard title="Total Hours" value={stats.total_hours} icon={<Clock size={18} />} />
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Payroll by Role</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={byRole}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
            <XAxis dataKey="role" tick={{ fill: '#a1a1aa', fontSize: 11 }} stroke="#27272A" />
            <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} stroke="#27272A" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: '8px', color: '#fff' }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [formatCurrency(Number(value)), 'Total Pay']}
              labelStyle={{ color: '#a1a1aa' }}
            />
            <Bar dataKey="total_pay" fill="#E11D48" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-seat-border">
              <th className="text-left px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Employee</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Role</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Rate</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Reg Hrs</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">OT Hrs</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Tips</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Gross</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Net</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-seat-border/50 hover:bg-zinc-800/30">
                <td className="px-4 py-3 text-white font-medium">{r.employee_name}</td>
                <td className="px-4 py-3 text-zinc-300">{r.role}</td>
                <td className="px-4 py-3 text-right text-zinc-300">{formatCurrency(r.hourly_rate)}/hr</td>
                <td className="px-4 py-3 text-right text-zinc-300">{r.regular_hours}</td>
                <td className="px-4 py-3 text-right">{r.overtime_hours > 0 ? <span className="text-amber-400">{r.overtime_hours}</span> : <span className="text-zinc-600">—</span>}</td>
                <td className="px-4 py-3 text-right text-green-400">{r.tips_earned > 0 ? formatCurrency(r.tips_earned) : '—'}</td>
                <td className="px-4 py-3 text-right text-white font-medium">{formatCurrency(r.gross)}</td>
                <td className="px-4 py-3 text-right text-emerald-400 font-semibold">{formatCurrency(r.net)}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(r)} className="text-xs text-zinc-400 hover:text-white mr-2">Edit</button>
                  <button onClick={() => del(r)} className="p-1 text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-seat-border bg-zinc-800/30">
              <td colSpan={5} className="px-4 py-3 text-white font-semibold">Totals</td>
              <td className="px-4 py-3 text-right text-green-400 font-medium">{formatCurrency(stats.total_tips)}</td>
              <td className="px-4 py-3 text-right text-white font-semibold">{formatCurrency(stats.total_gross)}</td>
              <td className="px-4 py-3 text-right text-emerald-400 font-bold">{formatCurrency(stats.total_net)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <History size={16} className="text-zinc-400" />
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Payroll History</h2>
        </div>
        {history.length === 0 ? (
          <p className="text-xs text-zinc-500">No runs yet — click &ldquo;Run Payroll&rdquo; to record one.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-seat-border">
                <th className="text-left px-2 py-2 text-[11px] font-medium text-zinc-500 uppercase">Run At</th>
                <th className="text-left px-2 py-2 text-[11px] font-medium text-zinc-500 uppercase">Period</th>
                <th className="text-right px-2 py-2 text-[11px] font-medium text-zinc-500 uppercase">Employees</th>
                <th className="text-right px-2 py-2 text-[11px] font-medium text-zinc-500 uppercase">Gross</th>
                <th className="text-right px-2 py-2 text-[11px] font-medium text-zinc-500 uppercase">Net</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-b border-seat-border/50">
                  <td className="px-2 py-2 text-zinc-300">{new Date(h.run_at).toLocaleString()}</td>
                  <td className="px-2 py-2 text-zinc-300">{h.period_start} – {h.period_end}</td>
                  <td className="px-2 py-2 text-right text-zinc-300">{h.employees}</td>
                  <td className="px-2 py-2 text-right text-white">{formatCurrency(h.total_gross)}</td>
                  <td className="px-2 py-2 text-right text-emerald-400 font-semibold">{formatCurrency(h.total_net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Payroll Entry' : 'Add Payroll Entry'}
        maxWidth="lg"
        footer={
          <>
            <GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={save}>{editing ? 'Save' : 'Add'}</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <FieldLabel>Employee Name</FieldLabel>
            <TextInput value={form.employee_name} onChange={(v) => setForm({ ...form, employee_name: v })} />
          </div>
          <div>
            <FieldLabel>Role</FieldLabel>
            <Select value={form.role} onChange={(v) => setForm({ ...form, role: v })} options={ROLES.map((r) => ({ label: r, value: r }))} />
          </div>
          <div>
            <FieldLabel>Hourly Rate</FieldLabel>
            <TextInput value={form.hourly_rate} onChange={(v) => setForm({ ...form, hourly_rate: Number(v) || 0 })} type="number" />
          </div>
          <div>
            <FieldLabel>Regular Hours</FieldLabel>
            <TextInput value={form.regular_hours} onChange={(v) => setForm({ ...form, regular_hours: Number(v) || 0 })} type="number" />
          </div>
          <div>
            <FieldLabel>Overtime Hours</FieldLabel>
            <TextInput value={form.overtime_hours} onChange={(v) => setForm({ ...form, overtime_hours: Number(v) || 0 })} type="number" />
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Tips Earned</FieldLabel>
            <TextInput value={form.tips_earned} onChange={(v) => setForm({ ...form, tips_earned: Number(v) || 0 })} type="number" />
          </div>
        </div>
      </EditModal>
    </div>
  );
}
