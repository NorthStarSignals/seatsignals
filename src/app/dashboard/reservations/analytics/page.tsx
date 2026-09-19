'use client';

import { MetricCard } from '@/components/ui/metric-card';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { cn } from '@/lib/utils';
import {
  CalendarCheck,
  Users,
  TrendingUp,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

const dailyReservations = [
  { day: 'Mon', reservations: 28, walkins: 42, total: 70 },
  { day: 'Tue', reservations: 32, walkins: 38, total: 70 },
  { day: 'Wed', reservations: 38, walkins: 35, total: 73 },
  { day: 'Thu', reservations: 45, walkins: 32, total: 77 },
  { day: 'Fri', reservations: 68, walkins: 25, total: 93 },
  { day: 'Sat', reservations: 75, walkins: 22, total: 97 },
  { day: 'Sun', reservations: 55, walkins: 30, total: 85 },
];

const monthlyTrend = [
  { month: 'Jan', reservations: 820, conversion: 72 },
  { month: 'Feb', reservations: 780, conversion: 74 },
  { month: 'Mar', reservations: 920, conversion: 78 },
  { month: 'Apr', reservations: 880, conversion: 76 },
  { month: 'May', reservations: 960, conversion: 80 },
  { month: 'Jun', reservations: 1020, conversion: 82 },
];

const sources = [
  { source: 'Website', pct: 42, count: 428 },
  { source: 'Phone', pct: 25, count: 255 },
  { source: 'OpenTable', pct: 18, count: 184 },
  { source: 'Resy', pct: 8, count: 82 },
  { source: 'Walk-in → Res', pct: 5, count: 51 },
  { source: 'Social Media', pct: 2, count: 20 },
];

export default function ReservationAnalyticsPage() {
  const totalRes = monthlyTrend[monthlyTrend.length - 1].reservations;
  const conversionRate = '82%';
  const avgPartySize = '3.4';
  const avgLeadTime = '2.3 days';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
          <CalendarCheck className="w-5 h-5 text-seat-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Reservation Analytics</h1>
          <p className="text-sm text-zinc-500">Deep dive into reservation patterns and conversion</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Monthly Reservations" value={totalRes.toLocaleString()} icon={<CalendarCheck size={18} />} />
        <MetricCard title="Show Rate" value={conversionRate} icon={<TrendingUp size={18} />} />
        <MetricCard title="Avg Party Size" value={avgPartySize} icon={<Users size={18} />} />
        <MetricCard title="Avg Lead Time" value={avgLeadTime} icon={<Clock size={18} />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Reservations vs Walk-ins by Day</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dailyReservations}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
              <XAxis dataKey="day" stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
              <YAxis stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: 8 }} />
              <Bar dataKey="reservations" stackId="a" fill="#E11D48" name="Reservations" />
              <Bar dataKey="walkins" stackId="a" fill="#3B82F6" name="Walk-ins" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Monthly Reservation Volume</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
              <XAxis dataKey="month" stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
              <YAxis stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: 8 }} />
              <Line type="monotone" dataKey="reservations" stroke="#E11D48" strokeWidth={2} name="Reservations" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Booking Sources */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Booking Sources</h3>
        <div className="space-y-3">
          {sources.map(s => (
            <div key={s.source} className="flex items-center gap-4">
              <span className="w-28 text-sm text-zinc-300">{s.source}</span>
              <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-seat-red rounded-full" style={{ width: `${s.pct}%` }} />
              </div>
              <span className="w-20 text-right text-sm text-white font-medium">{s.count} ({s.pct}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
