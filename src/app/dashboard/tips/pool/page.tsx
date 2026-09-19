'use client';

import { useMemo, useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { formatCurrency } from '@/lib/utils';
import {
  DollarSign, Users, Calculator, Percent, Plus, Pencil, Trash2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal, FieldLabel, TextInput, Select, PrimaryButton, GhostButton, DangerButton,
} from '@/components/dashboard/edit-modal';

interface ServerEntry {
  id: string;
  name: string;
  role: string;
  hours_worked: number;
  tips_collected: number;
  points: number;
}

type PoolMethod = 'equal' | 'hours' | 'points' | 'role';

const POOL_METHODS: { value: PoolMethod; label: string }[] = [
  { value: 'equal', label: 'Equal Split' },
  { value: 'hours', label: 'Hours-Based' },
  { value: 'points', label: 'Points-Based' },
  { value: 'role', label: 'Role-Based' },
];

const ROLE_WEIGHTS: Record<string, number> = {
  Server: 1.0,
  Bartender: 0.9,
  Host: 0.4,
  Support: 0.3,
  Busser: 0.3,
};

const ROLES = Object.keys(ROLE_WEIGHTS);

const INITIAL: ServerEntry[] = [
  { id: 's1', name: 'Marco Silva', role: 'Server', hours_worked: 32, tips_collected: 540, points: 10 },
  { id: 's2', name: 'Sarah Chen', role: 'Bartender', hours_worked: 28, tips_collected: 510, points: 9 },
  { id: 's3', name: 'Emma Wilson', role: 'Server', hours_worked: 30, tips_collected: 485, points: 10 },
  { id: 's4', name: 'Lisa Rodriguez', role: 'Host', hours_worked: 24, tips_collected: 120, points: 5 },
  { id: 's5', name: 'Tom Bradley', role: 'Busser', hours_worked: 20, tips_collected: 80, points: 4 },
];

function emptyEntry(): ServerEntry {
  return { id: '', name: '', role: 'Server', hours_worked: 0, tips_collected: 0, points: 10 };
}

function computePool(entries: ServerEntry[], method: PoolMethod, tipOutPct: number) {
  const totalTips = entries.reduce((s, e) => s + e.tips_collected, 0);
  const poolAmount = totalTips * (tipOutPct / 100);
  if (entries.length === 0) return { totalTips, poolAmount, results: [] };

  let sharesSum = 0;
  const shares = entries.map((e) => {
    let share = 1;
    if (method === 'hours') share = e.hours_worked;
    else if (method === 'points') share = e.points;
    else if (method === 'role') share = ROLE_WEIGHTS[e.role] ?? 0.5;
    sharesSum += share;
    return share;
  });

  const results = entries.map((e, i) => {
    const pool_share = sharesSum > 0 ? (shares[i] / sharesSum) * poolAmount : 0;
    const keepPct = 1 - tipOutPct / 100;
    const final_tips = e.tips_collected * keepPct + pool_share;
    return { ...e, pool_share, final_tips };
  });

  return { totalTips, poolAmount, results };
}

export default function TipPoolPage() {
  const { items: entries, add, update, remove } = useCrudList<ServerEntry>('seatsignals_tip_pool', INITIAL);
  const [method, setMethod] = useState<PoolMethod>('equal');
  const [tipOutPct, setTipOutPct] = useState(100);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ServerEntry | null>(null);
  const [form, setForm] = useState<ServerEntry>(emptyEntry());

  const { totalTips, poolAmount, results } = useMemo(
    () => computePool(entries, method, tipOutPct),
    [entries, method, tipOutPct],
  );

  const serverCount = entries.length;
  const avgPerServer = serverCount ? poolAmount / serverCount : 0;

  const chartData = results.map((s) => ({
    name: s.name.split(' ')[0],
    collected: s.tips_collected,
    final: Math.round(s.final_tips),
  }));

  const openAdd = () => { setEditing(null); setForm(emptyEntry()); setModalOpen(true); };
  const openEdit = (s: ServerEntry) => { setEditing(s); setForm(s); setModalOpen(true); };
  const save = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (editing) { update(editing.id, form); toast.success('Updated'); }
    else { add({ ...form, id: Date.now().toString() }); toast.success('Added'); }
    setModalOpen(false);
  };
  const del = (s: ServerEntry) => {
    if (!confirm(`Remove ${s.name}?`)) return;
    remove(s.id);
    toast.success('Removed');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Tip Pool Calculator</h1>
          <p className="text-sm text-zinc-400 mt-1">Configure and preview tip distribution across your team</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 transition">
          <Plus size={16} /> Add Server
        </button>
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Pool Configuration</h2>
        <div>
          <label className="block text-xs text-zinc-500 mb-2">Distribution Method</label>
          <div className="flex gap-2 flex-wrap">
            {POOL_METHODS.map((m) => (
              <button key={m.value} onClick={() => setMethod(m.value)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${method === m.value ? 'bg-seat-red text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'}`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-2">
            Tip-Out Percentage: <span className="text-white font-medium">{tipOutPct}%</span>
          </label>
          <input type="range" min={0} max={100} value={tipOutPct} onChange={(e) => setTipOutPct(Number(e.target.value))} className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-seat-red" />
          <div className="flex justify-between text-xs text-zinc-600 mt-1">
            <span>0%</span><span>50%</span><span>100%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Total Tips" value={formatCurrency(totalTips)} icon={<DollarSign className="w-4 h-4" />} />
        <MetricCard title="Pool Amount" value={formatCurrency(poolAmount)} icon={<Calculator className="w-4 h-4" />} />
        <MetricCard title="Avg Per Server" value={formatCurrency(avgPerServer)} icon={<Percent className="w-4 h-4" />} />
        <MetricCard title="Servers Count" value={serverCount} icon={<Users className="w-4 h-4" />} />
      </div>

      {chartData.length > 0 && (
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Collected vs Final</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
                <YAxis stroke="#71717a" fontSize={12} tickFormatter={(v: number) => `$${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => formatCurrency(Number(value))}
                />
                <Bar dataKey="collected" name="Collected" fill="#71717a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="final" name="Final" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
        <div className="p-5 border-b border-seat-border">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Server Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-seat-border text-xs text-zinc-500 uppercase tracking-wider">
                <th className="text-left p-4">Name</th>
                <th className="text-left p-4">Role</th>
                <th className="text-right p-4">Hours</th>
                <th className="text-right p-4">Points</th>
                <th className="text-right p-4">Collected</th>
                <th className="text-right p-4">Pool Share</th>
                <th className="text-right p-4">Final</th>
                <th className="text-right p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map((s) => {
                const diff = s.final_tips - s.tips_collected;
                const isGain = diff > 0.01;
                const isLoss = diff < -0.01;
                return (
                  <tr key={s.id} className="border-b border-seat-border/50 hover:bg-zinc-800/30 transition">
                    <td className="p-4 text-white font-medium">{s.name}</td>
                    <td className="p-4 text-zinc-400">{s.role}</td>
                    <td className="p-4 text-right text-zinc-400">{s.hours_worked}h</td>
                    <td className="p-4 text-right text-zinc-400">{s.points}</td>
                    <td className="p-4 text-right text-zinc-300">{formatCurrency(s.tips_collected)}</td>
                    <td className="p-4 text-right text-zinc-300">{formatCurrency(s.pool_share)}</td>
                    <td className={`p-4 text-right font-medium ${isGain ? 'text-emerald-400' : isLoss ? 'text-red-400' : 'text-white'}`}>
                      {formatCurrency(s.final_tips)}
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => openEdit(s)} className="p-1 text-zinc-400 hover:text-white"><Pencil size={14} /></button>
                      <button onClick={() => del(s)} className="p-1 text-zinc-500 hover:text-red-400 ml-1"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                );
              })}
              {serverCount === 0 && <tr><td colSpan={8} className="p-12 text-center text-zinc-500">Add servers to begin calculating splits.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Server' : 'Add Server'}
        maxWidth="lg"
        footer={
          <>
            <GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton>
            {editing && <DangerButton onClick={() => { del(editing); setModalOpen(false); }}>Delete</DangerButton>}
            <PrimaryButton onClick={save}>{editing ? 'Save' : 'Add'}</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <FieldLabel>Name</FieldLabel>
            <TextInput value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          </div>
          <div>
            <FieldLabel>Role</FieldLabel>
            <Select value={form.role} onChange={(v) => setForm({ ...form, role: v })} options={ROLES.map((r) => ({ label: r, value: r }))} />
          </div>
          <div>
            <FieldLabel>Hours Worked</FieldLabel>
            <TextInput value={form.hours_worked} onChange={(v) => setForm({ ...form, hours_worked: Number(v) || 0 })} type="number" />
          </div>
          <div>
            <FieldLabel>Tips Collected ($)</FieldLabel>
            <TextInput value={form.tips_collected} onChange={(v) => setForm({ ...form, tips_collected: Number(v) || 0 })} type="number" />
          </div>
          <div>
            <FieldLabel>Points</FieldLabel>
            <TextInput value={form.points} onChange={(v) => setForm({ ...form, points: Number(v) || 0 })} type="number" />
          </div>
        </div>
      </EditModal>
    </div>
  );
}
