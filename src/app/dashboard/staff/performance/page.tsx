'use client';

import { useState, useMemo } from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import {
  Trophy, TrendingUp, DollarSign, Star, ArrowUpRight, Users, ChevronRight, Target,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useLocalStorageState } from '@/hooks/use-local-storage-state';
import {
  EditModal, FieldLabel, TextInput, PrimaryButton, GhostButton,
} from '@/components/dashboard/edit-modal';

interface StaffMember {
  member_id: string;
  name: string;
  email: string;
  role: string;
  revenue_per_shift: number;
  avg_check_size: number;
  customer_satisfaction: number;
  upsell_rate: number;
  shifts_worked: number;
  composite_score: number;
  badges: string[];
}

interface Targets {
  revenue_per_shift: number;
  avg_check_size: number;
  customer_satisfaction: number;
  upsell_rate: number;
}

const INITIAL_MEMBERS: StaffMember[] = [
  { member_id: '1', name: 'Marco Silva', email: 'marco@example.com', role: 'Server', revenue_per_shift: 1850, avg_check_size: 72, customer_satisfaction: 4.9, upsell_rate: 28, shifts_worked: 48, composite_score: 94, badges: ['Top Closer', 'Best Reviews'] },
  { member_id: '2', name: 'Sarah Chen', email: 'sarah@example.com', role: 'Bartender', revenue_per_shift: 1720, avg_check_size: 58, customer_satisfaction: 4.8, upsell_rate: 32, shifts_worked: 44, composite_score: 91, badges: ['Most Upsells'] },
  { member_id: '3', name: 'Emma Wilson', email: 'emma@example.com', role: 'Server', revenue_per_shift: 1680, avg_check_size: 68, customer_satisfaction: 4.7, upsell_rate: 24, shifts_worked: 42, composite_score: 88, badges: ['Iron Shift'] },
  { member_id: '4', name: 'Lisa Rodriguez', email: 'lisa@example.com', role: 'Host', revenue_per_shift: 1450, avg_check_size: 0, customer_satisfaction: 4.6, upsell_rate: 0, shifts_worked: 40, composite_score: 84, badges: [] },
  { member_id: '5', name: 'David Kim', email: 'david@example.com', role: 'Line Cook', revenue_per_shift: 0, avg_check_size: 0, customer_satisfaction: 4.5, upsell_rate: 0, shifts_worked: 45, composite_score: 79, badges: ['Iron Shift'] },
];

const INITIAL_TARGETS: Targets = {
  revenue_per_shift: 1700,
  avg_check_size: 65,
  customer_satisfaction: 4.7,
  upsell_rate: 25,
};

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() || '').join('');
  const sizeClass = size === 'lg' ? 'w-14 h-14 text-lg' : size === 'md' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs';
  return (
    <div className={`${sizeClass} rounded-full bg-zinc-700 flex items-center justify-center font-semibold text-zinc-300 shrink-0`}>{initials}</div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-sm">1</div>;
  if (rank === 2) return <div className="w-8 h-8 rounded-full bg-zinc-400/20 border border-zinc-400/40 flex items-center justify-center text-zinc-300 font-bold text-sm">2</div>;
  if (rank === 3) return <div className="w-8 h-8 rounded-full bg-orange-600/20 border border-orange-600/40 flex items-center justify-center text-orange-400 font-bold text-sm">3</div>;
  return <div className="w-8 h-8 rounded-full bg-zinc-800 border border-[#27272A] flex items-center justify-center text-zinc-500 font-semibold text-sm">{rank}</div>;
}

function StatCard({ label, value, icon: Icon, sub }: { label: string; value: string; icon: typeof DollarSign; sub?: string }) {
  return (
    <div className="p-4 rounded-lg bg-[#1C1C21] border border-[#27272A]">
      <div className="flex items-center gap-2 text-zinc-400 text-xs mb-2">
        <Icon className="w-3.5 h-3.5" />{label}
      </div>
      <div className="text-xl font-bold text-zinc-100">{value}</div>
      {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
    </div>
  );
}

export default function StaffPerformancePage() {
  const [members] = useLocalStorageState<StaffMember[]>('seatsignals_staff_performance_members', INITIAL_MEMBERS);
  const [targets, setTargets] = useLocalStorageState<Targets>('seatsignals_staff_performance_targets', INITIAL_TARGETS);
  const [selected, setSelected] = useState<StaffMember | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<Targets>(targets);

  const sorted = useMemo(() => members.slice().sort((a, b) => b.composite_score - a.composite_score), [members]);
  const averages = useMemo(() => ({
    avg_revenue_per_shift: Math.round(members.reduce((s, m) => s + m.revenue_per_shift, 0) / members.length),
    avg_check_size: Math.round(members.reduce((s, m) => s + m.avg_check_size, 0) / members.length),
    avg_satisfaction: +(members.reduce((s, m) => s + m.customer_satisfaction, 0) / members.length).toFixed(1),
    avg_upsell_rate: Math.round(members.reduce((s, m) => s + m.upsell_rate, 0) / members.length),
    total_staff: members.length,
  }), [members]);

  const radarData = useMemo(() => {
    const toPct = (value: number, target: number) => target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
    return [
      { category: 'Revenue', 'Team Avg': toPct(averages.avg_revenue_per_shift, targets.revenue_per_shift), Target: 100, ...Object.fromEntries(sorted.slice(0, 5).map((m) => [m.name, toPct(m.revenue_per_shift, targets.revenue_per_shift)])) },
      { category: 'Check Size', 'Team Avg': toPct(averages.avg_check_size, targets.avg_check_size), Target: 100, ...Object.fromEntries(sorted.slice(0, 5).map((m) => [m.name, toPct(m.avg_check_size, targets.avg_check_size)])) },
      { category: 'Satisfaction', 'Team Avg': toPct(averages.avg_satisfaction, targets.customer_satisfaction), Target: 100, ...Object.fromEntries(sorted.slice(0, 5).map((m) => [m.name, toPct(m.customer_satisfaction, targets.customer_satisfaction)])) },
      { category: 'Upsell', 'Team Avg': toPct(averages.avg_upsell_rate, targets.upsell_rate), Target: 100, ...Object.fromEntries(sorted.slice(0, 5).map((m) => [m.name, toPct(m.upsell_rate, targets.upsell_rate)])) },
    ];
  }, [averages, targets, sorted]);

  const saveTargets = () => {
    setTargets(form);
    toast.success('Targets updated');
    setEditOpen(false);
  };

  const openEdit = () => { setForm(targets); setEditOpen(true); };

  const radarColors = ['#E11D48', '#8b5cf6', '#3b82f6', '#f59e0b', '#10b981'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Staff Performance</h1>
          <p className="text-sm text-zinc-400 mt-1">Track team performance, identify top performers</p>
        </div>
        <button onClick={openEdit} className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 transition">
          <Target size={16} /> Edit Targets
        </button>
      </div>

      {/* Targets display */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-[#1C1C21] border border-[#27272A] relative">
          <div className="text-xs text-zinc-500 mb-1">Revenue/Shift Target</div>
          <div className="text-xl font-bold text-white">${targets.revenue_per_shift}</div>
          <div className="text-xs text-zinc-400 mt-1">Team avg: ${averages.avg_revenue_per_shift}</div>
        </div>
        <div className="p-4 rounded-lg bg-[#1C1C21] border border-[#27272A]">
          <div className="text-xs text-zinc-500 mb-1">Check Size Target</div>
          <div className="text-xl font-bold text-white">${targets.avg_check_size}</div>
          <div className="text-xs text-zinc-400 mt-1">Team avg: ${averages.avg_check_size}</div>
        </div>
        <div className="p-4 rounded-lg bg-[#1C1C21] border border-[#27272A]">
          <div className="text-xs text-zinc-500 mb-1">Satisfaction Target</div>
          <div className="text-xl font-bold text-white">{targets.customer_satisfaction}/5</div>
          <div className="text-xs text-zinc-400 mt-1">Team avg: {averages.avg_satisfaction}/5</div>
        </div>
        <div className="p-4 rounded-lg bg-[#1C1C21] border border-[#27272A]">
          <div className="text-xs text-zinc-500 mb-1">Upsell Target</div>
          <div className="text-xl font-bold text-white">{targets.upsell_rate}%</div>
          <div className="text-xs text-zinc-400 mt-1">Team avg: {averages.avg_upsell_rate}%</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={Users} label="Total Staff" value={String(averages.total_staff)} />
        <StatCard icon={DollarSign} label="Avg Revenue/Shift" value={`$${averages.avg_revenue_per_shift.toLocaleString()}`} />
        <StatCard icon={TrendingUp} label="Avg Check Size" value={`$${averages.avg_check_size}`} />
        <StatCard icon={Star} label="Avg Satisfaction" value={`${averages.avg_satisfaction}/5`} />
        <StatCard icon={ArrowUpRight} label="Avg Upsell Rate" value={`${averages.avg_upsell_rate}%`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-xl bg-[#1C1C21] border border-[#27272A] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Leaderboard</h2>
          </div>
          <div className="space-y-2">
            {sorted.map((member, idx) => {
              const isSelected = selected?.member_id === member.member_id;
              return (
                <button
                  key={member.member_id}
                  onClick={() => setSelected(isSelected ? null : member)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition ${isSelected ? 'bg-[#E11D48]/10 border border-[#E11D48]/30' : 'bg-[#09090B] border border-[#27272A] hover:border-zinc-600'}`}
                >
                  <RankBadge rank={idx + 1} />
                  <Avatar name={member.name} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-100 truncate">{member.name}</span>
                      <span className="text-xs text-zinc-500 capitalize">{member.role}</span>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <div className="text-lg font-bold text-zinc-100">{member.composite_score}</div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Score</div>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-zinc-500 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          {selected && (
            <div className="rounded-xl bg-[#1C1C21] border border-[#27272A] p-5">
              <div className="flex items-center gap-3 mb-5">
                <Avatar name={selected.name} size="lg" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-zinc-100">{selected.name}</h3>
                  <p className="text-xs text-zinc-500">{selected.email}</p>
                  <p className="text-xs text-zinc-400 capitalize mt-0.5">{selected.role}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatCard icon={DollarSign} label="Revenue / Shift" value={`$${selected.revenue_per_shift.toLocaleString()}`} sub={`target $${targets.revenue_per_shift}`} />
                <StatCard icon={TrendingUp} label="Avg Check" value={`$${selected.avg_check_size}`} sub={`target $${targets.avg_check_size}`} />
                <StatCard icon={Star} label="Satisfaction" value={`${selected.customer_satisfaction}/5`} sub={`target ${targets.customer_satisfaction}`} />
                <StatCard icon={ArrowUpRight} label="Upsell Rate" value={`${selected.upsell_rate}%`} sub={`target ${targets.upsell_rate}%`} />
              </div>
            </div>
          )}

          <div className="rounded-xl bg-[#1C1C21] border border-[#27272A] p-5">
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">Vs Targets (100 = target)</h2>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="#27272A" />
                <PolarAngleAxis dataKey="category" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 120]} />
                <Tooltip contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: '8px', fontSize: '12px' }} labelStyle={{ color: '#e4e4e7' }} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }} />
                <Radar name="Team Avg" dataKey="Team Avg" stroke="#6b7280" fill="#6b7280" fillOpacity={0.15} strokeWidth={2} strokeDasharray="4 4" />
                {sorted.slice(0, 5).map((m, i) => (
                  <Radar key={m.member_id} name={m.name} dataKey={m.name} stroke={radarColors[i % radarColors.length]} fill={radarColors[i % radarColors.length]} fillOpacity={0.08} strokeWidth={1.5} />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <EditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Targets"
        footer={
          <>
            <GhostButton onClick={() => setEditOpen(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={saveTargets}>Save</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Revenue per Shift ($)</FieldLabel>
            <TextInput value={form.revenue_per_shift} onChange={(v) => setForm({ ...form, revenue_per_shift: Number(v) || 0 })} type="number" />
          </div>
          <div>
            <FieldLabel>Avg Check Size ($)</FieldLabel>
            <TextInput value={form.avg_check_size} onChange={(v) => setForm({ ...form, avg_check_size: Number(v) || 0 })} type="number" />
          </div>
          <div>
            <FieldLabel>Customer Satisfaction (0-5)</FieldLabel>
            <TextInput value={form.customer_satisfaction} onChange={(v) => setForm({ ...form, customer_satisfaction: Number(v) || 0 })} type="number" />
          </div>
          <div>
            <FieldLabel>Upsell Rate (%)</FieldLabel>
            <TextInput value={form.upsell_rate} onChange={(v) => setForm({ ...form, upsell_rate: Number(v) || 0 })} type="number" />
          </div>
        </div>
      </EditModal>
    </div>
  );
}
