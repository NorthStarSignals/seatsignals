'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { useCrudList, useLocalStorageState } from '@/hooks/use-local-storage-state';
import toast from 'react-hot-toast';
import { UserX, TrendingDown, Clock, AlertTriangle, Trash2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Offender {
  id: string;
  name: string;
  email: string;
  noShows: number;
  lastIncident: string;
}

interface Policy {
  requireDeposit: boolean;
  requireDepositPartySize: number;
  smsReminder24h: boolean;
  smsReminderHourBefore: boolean;
  confirmClick: boolean;
  blocklistAfter: number;
}

const INITIAL_OFFENDERS: Offender[] = [
  { id: 'o1', name: 'Johnson Party', email: 'bjohnson@email.com', noShows: 3, lastIncident: '2026-03-28' },
  { id: 'o2', name: 'Smith Party', email: 'asmith@email.com', noShows: 2, lastIncident: '2026-04-02' },
  { id: 'o3', name: 'Garcia Party', email: 'rgarcia@email.com', noShows: 2, lastIncident: '2026-04-05' },
  { id: 'o4', name: 'Patel Party', email: 'npatel@email.com', noShows: 4, lastIncident: '2026-04-08' },
];

const DEFAULT_POLICY: Policy = {
  requireDeposit: true,
  requireDepositPartySize: 6,
  smsReminder24h: true,
  smsReminderHourBefore: true,
  confirmClick: true,
  blocklistAfter: 3,
};

const monthly = [
  { month: 'Jan', rate: 8.2 },
  { month: 'Feb', rate: 7.8 },
  { month: 'Mar', rate: 6.4 },
  { month: 'Apr', rate: 5.1 },
];

const byDay = [
  { day: 'Mon', rate: 4.2 },
  { day: 'Tue', rate: 3.8 },
  { day: 'Wed', rate: 5.1 },
  { day: 'Thu', rate: 6.4 },
  { day: 'Fri', rate: 8.2 },
  { day: 'Sat', rate: 9.1 },
  { day: 'Sun', rate: 5.8 },
];

export default function NoShowsPage() {
  const { items: offenders, remove } = useCrudList<Offender>('seatsignals_no_shows', INITIAL_OFFENDERS);
  const [policy, setPolicy] = useLocalStorageState<Policy>('seatsignals_no_show_policy', DEFAULT_POLICY);
  const [filterDate, setFilterDate] = useState('');

  const filtered = filterDate ? offenders.filter(o => o.lastIncident >= filterDate) : offenders;

  const toggle = (k: keyof Policy) => {
    setPolicy(p => ({ ...p, [k]: !p[k] }));
    toast.success('Policy updated');
  };

  const del = (o: Offender) => {
    if (!confirm(`Remove ${o.name} from list?`)) return;
    remove(o.id); toast.success('Removed');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
          <UserX className="w-5 h-5 text-seat-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">No-Show Prevention</h1>
          <p className="text-sm text-zinc-500">Track, reduce, and recover from no-shows</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="No-Show Rate" value="5.1%" trend={{ value: 34, positive: false }} icon={<UserX size={18} />} />
        <MetricCard title="Lost Revenue (30d)" value="$3,820" icon={<TrendingDown size={18} />} />
        <MetricCard title="Avg Revenue per Party" value="$142" icon={<Clock size={18} />} />
        <MetricCard title="Repeat Offenders" value={offenders.length} icon={<AlertTriangle size={18} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Monthly Trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
              <XAxis dataKey="month" stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
              <YAxis stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: 8 }} />
              <Line type="monotone" dataKey="rate" stroke="#E11D48" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">By Day of Week</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
              <XAxis dataKey="day" stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
              <YAxis stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: 8 }} />
              <Bar dataKey="rate" fill="#E11D48" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Prevention Policies</h3>
        <div className="space-y-3">
          {[
            { k: 'requireDeposit', label: 'Require deposit for large parties', desc: `Deposits required for parties of ${policy.requireDepositPartySize}+` },
            { k: 'smsReminder24h', label: '24-hour SMS reminder', desc: 'Text guests one day before their reservation' },
            { k: 'smsReminderHourBefore', label: '1-hour SMS reminder', desc: 'Final reminder 60 minutes before' },
            { k: 'confirmClick', label: 'Require confirmation click', desc: 'Guests must confirm via link or reservation auto-cancels' },
          ].map(item => (
            <div key={item.k} className="flex items-center justify-between py-2 border-b border-seat-border/30">
              <div>
                <div className="text-white text-sm">{item.label}</div>
                <div className="text-xs text-zinc-500">{item.desc}</div>
              </div>
              <button
                onClick={() => toggle(item.k as keyof Policy)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${policy[item.k as keyof Policy] ? 'bg-seat-red' : 'bg-seat-border'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${policy[item.k as keyof Policy] ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
          <div className="pt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Deposit kicks in at party size:</label>
              <input
                type="number"
                value={policy.requireDepositPartySize}
                onChange={(e) => setPolicy(p => ({ ...p, requireDepositPartySize: parseInt(e.target.value) || 0 }))}
                className="w-full bg-seat-black border border-seat-border rounded px-3 py-1.5 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Auto-blocklist after # no-shows:</label>
              <input
                type="number"
                value={policy.blocklistAfter}
                onChange={(e) => setPolicy(p => ({ ...p, blocklistAfter: parseInt(e.target.value) || 0 }))}
                className="w-full bg-seat-black border border-seat-border rounded px-3 py-1.5 text-sm text-white"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Repeat Offenders</h3>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="bg-seat-black border border-seat-border rounded px-2 py-1 text-xs text-white"
          />
        </div>
        <div className="space-y-2">
          {filtered.map(o => (
            <div key={o.id} className="flex items-center justify-between p-3 bg-seat-black border border-seat-border/50 rounded-lg">
              <div>
                <div className="text-white font-medium">{o.name}</div>
                <div className="text-xs text-zinc-500">{o.email}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-bold text-seat-red">{o.noShows}</div>
                  <div className="text-[10px] text-zinc-500">no-shows</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-zinc-300">{o.lastIncident}</div>
                  <div className="text-[10px] text-zinc-500">last</div>
                </div>
                <button onClick={() => del(o)} className="p-1.5 text-zinc-500 hover:text-red-400 rounded"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
