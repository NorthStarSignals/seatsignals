'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal, FieldLabel, TextInput, Select, PrimaryButton, GhostButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { Clock, Plus, Pencil, Trash2, Zap, Users, DollarSign, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type DealType = 'percent' | 'fixed' | 'bogo' | 'happy_hour';

interface Rule {
  id: string;
  name: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  dealType: DealType;
  dealValue: number;
  channel: 'sms' | 'email' | 'both';
  enabled: boolean;
  redemptions: number;
  revenue: number;
}

const INITIAL: Rule[] = [
  { id: 'd1', name: 'Tuesday 2-5 Happy Hour', dayOfWeek: 'Tue', startTime: '14:00', endTime: '17:00', dealType: 'happy_hour', dealValue: 50, channel: 'sms', enabled: true, redemptions: 184, revenue: 4820 },
  { id: 'd2', name: 'Monday Lunch Flash', dayOfWeek: 'Mon', startTime: '11:30', endTime: '14:00', dealType: 'percent', dealValue: 20, channel: 'both', enabled: true, redemptions: 98, revenue: 3120 },
  { id: 'd3', name: 'Wednesday BOGO Appetizer', dayOfWeek: 'Wed', startTime: '17:00', endTime: '19:00', dealType: 'bogo', dealValue: 100, channel: 'sms', enabled: true, redemptions: 145, revenue: 5280 },
  { id: 'd4', name: 'Thursday Late Night', dayOfWeek: 'Thu', startTime: '21:00', endTime: '23:00', dealType: 'fixed', dealValue: 10, channel: 'sms', enabled: false, redemptions: 62, revenue: 1180 },
  { id: 'd5', name: 'Weekend Brunch Early', dayOfWeek: 'Sat', startTime: '09:00', endTime: '11:00', dealType: 'percent', dealValue: 15, channel: 'email', enabled: true, redemptions: 112, revenue: 2840 },
];

const weeklyLift = [
  { day: 'Mon', baseline: 180, withDeals: 265 },
  { day: 'Tue', baseline: 120, withDeals: 240 },
  { day: 'Wed', baseline: 160, withDeals: 280 },
  { day: 'Thu', baseline: 220, withDeals: 290 },
  { day: 'Fri', baseline: 340, withDeals: 360 },
  { day: 'Sat', baseline: 380, withDeals: 440 },
  { day: 'Sun', baseline: 290, withDeals: 320 },
];

function empty(): Omit<Rule, 'id'> {
  return {
    name: '', dayOfWeek: 'Tue', startTime: '14:00', endTime: '17:00',
    dealType: 'percent', dealValue: 20, channel: 'sms',
    enabled: true, redemptions: 0, revenue: 0,
  };
}

const dealLabel = (r: Rule) => {
  if (r.dealType === 'percent') return `${r.dealValue}% off`;
  if (r.dealType === 'fixed') return `$${r.dealValue} off`;
  if (r.dealType === 'bogo') return 'BOGO';
  return 'Happy Hour';
};

export default function DeadHoursPage() {
  const { items: rules, add, update, remove } = useCrudList<Rule>('seatsignals_dead_hours', INITIAL);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty());

  const enabled = rules.filter(r => r.enabled).length;
  const totalRevenue = rules.reduce((s, r) => s + r.revenue, 0);
  const totalRedemptions = rules.reduce((s, r) => s + r.redemptions, 0);

  const openAdd = () => { setEditingId(null); setForm(empty()); setModalOpen(true); };
  const openEdit = (r: Rule) => { setEditingId(r.id); const { id: _id, ...rest } = r; void _id; setForm(rest); setModalOpen(true); };
  const save = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (editingId) { update(editingId, form); toast.success('Rule updated'); }
    else { add({ id: `d${Date.now()}`, ...form }); toast.success('Dead hour rule created'); }
    setModalOpen(false);
  };
  const del = (r: Rule) => {
    if (!confirm(`Delete "${r.name}"?`)) return;
    remove(r.id); toast.success('Deleted');
  };
  const toggle = (r: Rule) => {
    update(r.id, { enabled: !r.enabled });
    toast.success(r.enabled ? 'Paused' : 'Activated');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Dead Hour Optimizer</h1>
            <p className="text-sm text-zinc-500">Auto-trigger deals when your floor is slow</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg text-sm font-medium">
          <Plus size={16} /> New Rule
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Active Rules" value={enabled} subtitle={`${rules.length} total`} icon={<Zap size={18} />} />
        <MetricCard title="Redemptions (30d)" value={totalRedemptions.toLocaleString()} icon={<Users size={18} />} />
        <MetricCard title="Revenue Lift" value={`$${(totalRevenue / 1000).toFixed(1)}K`} icon={<DollarSign size={18} />} trend={{ value: 23, positive: true }} />
        <MetricCard title="Avg Lift %" value="23%" subtitle="vs baseline" icon={<TrendingUp size={18} />} />
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Weekly Revenue Lift</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={weeklyLift}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
            <XAxis dataKey="day" stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
            <YAxis stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: 8 }} />
            <Bar dataKey="baseline" fill="#3F3F46" name="Baseline" radius={[4, 4, 0, 0]} />
            <Bar dataKey="withDeals" fill="#E11D48" name="With Deals" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Rules</h3>
        <div className="space-y-2">
          {rules.map(r => (
            <div key={r.id} className="flex items-center gap-3 p-3 bg-seat-black border border-seat-border/50 rounded-lg">
              <button
                onClick={() => toggle(r)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${r.enabled ? 'bg-seat-red' : 'bg-seat-border'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${r.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium">{r.name}</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {r.dayOfWeek} · {r.startTime}–{r.endTime} · {dealLabel(r)} · {r.channel.toUpperCase()}
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-xs text-zinc-500">Redemptions</div>
                <div className="text-sm text-white font-medium">{r.redemptions}</div>
              </div>
              <div className="text-right hidden md:block">
                <div className="text-xs text-zinc-500">Revenue</div>
                <div className="text-sm text-white font-medium">${r.revenue.toLocaleString()}</div>
              </div>
              <div className="flex gap-0.5">
                <button onClick={() => openEdit(r)} className="p-1.5 text-zinc-500 hover:text-white rounded"><Pencil size={14} /></button>
                <button onClick={() => del(r)} className="p-1.5 text-zinc-500 hover:text-red-400 rounded"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Rule' : 'New Dead Hour Rule'}
        maxWidth="lg"
        footer={<><GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton><PrimaryButton onClick={save}>{editingId ? 'Save' : 'Create'}</PrimaryButton></>}
      >
        <div className="space-y-4">
          <div><FieldLabel>Rule Name</FieldLabel><TextInput value={form.name} onChange={(v) => setForm(f => ({ ...f, name: v }))} placeholder="Tuesday Happy Hour" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <FieldLabel>Day</FieldLabel>
              <Select value={form.dayOfWeek} onChange={(v) => setForm(f => ({ ...f, dayOfWeek: v }))} options={[
                { label: 'Monday', value: 'Mon' }, { label: 'Tuesday', value: 'Tue' }, { label: 'Wednesday', value: 'Wed' },
                { label: 'Thursday', value: 'Thu' }, { label: 'Friday', value: 'Fri' }, { label: 'Saturday', value: 'Sat' }, { label: 'Sunday', value: 'Sun' },
              ]} />
            </div>
            <div><FieldLabel>Start</FieldLabel><TextInput type="time" value={form.startTime} onChange={(v) => setForm(f => ({ ...f, startTime: v }))} /></div>
            <div><FieldLabel>End</FieldLabel><TextInput type="time" value={form.endTime} onChange={(v) => setForm(f => ({ ...f, endTime: v }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Deal Type</FieldLabel>
              <Select value={form.dealType} onChange={(v) => setForm(f => ({ ...f, dealType: v as DealType }))} options={[
                { label: 'Percent Off', value: 'percent' },
                { label: 'Dollars Off', value: 'fixed' },
                { label: 'BOGO', value: 'bogo' },
                { label: 'Happy Hour', value: 'happy_hour' },
              ]} />
            </div>
            <div><FieldLabel>Value</FieldLabel><TextInput type="number" value={form.dealValue} onChange={(v) => setForm(f => ({ ...f, dealValue: parseFloat(v) || 0 }))} /></div>
          </div>
          <div>
            <FieldLabel>Notify via</FieldLabel>
            <Select value={form.channel} onChange={(v) => setForm(f => ({ ...f, channel: v as Rule['channel'] }))} options={[
              { label: 'SMS', value: 'sms' }, { label: 'Email', value: 'email' }, { label: 'Both', value: 'both' },
            ]} />
          </div>
        </div>
      </EditModal>
    </div>
  );
}
