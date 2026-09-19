'use client';

import { useState, useEffect } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  Clock,
  Users,
  DollarSign,
  TrendingUp,
  Zap,
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

interface PosHourly { hour: number; revenue_cents: number; orders: number }
interface PosPeakResponse { has_data: boolean; window_days: number; hourly: PosHourly[]; by_day_of_week: Array<{ day: number; revenue_cents: number; orders: number }>; total_orders: number }

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function formatHour(h: number): string {
  if (h === 0) return '12am';
  if (h === 12) return '12pm';
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

const hourlyData = [
  { hour: '10am', covers: 12, revenue: 480, wait: 0, staff: 3 },
  { hour: '11am', covers: 35, revenue: 1750, wait: 0, staff: 5 },
  { hour: '12pm', covers: 85, revenue: 4250, wait: 8, staff: 8 },
  { hour: '1pm', covers: 72, revenue: 3600, wait: 5, staff: 8 },
  { hour: '2pm', covers: 38, revenue: 1900, wait: 0, staff: 5 },
  { hour: '3pm', covers: 15, revenue: 600, wait: 0, staff: 3 },
  { hour: '4pm', covers: 18, revenue: 900, wait: 0, staff: 4 },
  { hour: '5pm', covers: 45, revenue: 2700, wait: 0, staff: 6 },
  { hour: '6pm', covers: 88, revenue: 5280, wait: 10, staff: 10 },
  { hour: '7pm', covers: 95, revenue: 6650, wait: 15, staff: 10 },
  { hour: '8pm', covers: 82, revenue: 5740, wait: 12, staff: 10 },
  { hour: '9pm', covers: 55, revenue: 3850, wait: 5, staff: 8 },
  { hour: '10pm', covers: 25, revenue: 1750, wait: 0, staff: 5 },
];

const weekComparison = [
  { day: 'Mon', lunch_peak: 65, dinner_peak: 55, total: 420 },
  { day: 'Tue', lunch_peak: 70, dinner_peak: 62, total: 455 },
  { day: 'Wed', lunch_peak: 75, dinner_peak: 68, total: 510 },
  { day: 'Thu', lunch_peak: 78, dinner_peak: 75, total: 560 },
  { day: 'Fri', lunch_peak: 82, dinner_peak: 95, total: 680 },
  { day: 'Sat', lunch_peak: 88, dinner_peak: 98, total: 720 },
  { day: 'Sun', lunch_peak: 90, dinner_peak: 72, total: 580 },
];

export default function PeakHoursPage() {
  const [metric, setMetric] = useState<'covers' | 'revenue' | 'wait'>('covers');
  const [pos, setPos] = useState<PosPeakResponse | null>(null);

  useEffect(() => {
    fetch('/api/metrics/peak-hours?days=30')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.has_data) setPos(d); })
      .catch(() => {});
  }, []);

  const peakHour = hourlyData.reduce((a, b) => a.covers > b.covers ? a : b);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const totalCovers = hourlyData.reduce((s, h) => s + h.covers, 0);
  const totalRevenue = hourlyData.reduce((s, h) => s + h.revenue, 0);
  const avgWait = Math.round(hourlyData.filter(h => h.wait > 0).reduce((s, h) => s + h.wait, 0) / hourlyData.filter(h => h.wait > 0).length);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
          <Clock className="w-5 h-5 text-seat-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Peak Hours Analysis</h1>
          <p className="text-sm text-zinc-500">Optimize staffing and capacity with hourly data</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Peak Hour" value={peakHour.hour} icon={<Clock size={18} />} />
        <MetricCard title="Peak Covers" value={peakHour.covers} icon={<Users size={18} />} />
        <MetricCard title="Today Revenue" value={formatCurrency(totalRevenue)} icon={<DollarSign size={18} />} />
        <MetricCard title="Avg Wait (Peak)" value={`${avgWait} min`} icon={<TrendingUp size={18} />} />
      </div>

      {/* Real POS: last 30 days of order timestamps, bucketed by hour-of-day. */}
      {pos && (() => {
        const peak = [...pos.hourly].sort((a, b) => b.revenue_cents - a.revenue_cents)[0];
        const chartData = pos.hourly.map(h => ({
          hour: formatHour(h.hour),
          orders: h.orders,
          revenue: h.revenue_cents / 100,
        }));
        const dowData = pos.by_day_of_week.map((d) => ({
          day: DOW_LABELS[d.day],
          revenue: d.revenue_cents / 100,
          orders: d.orders,
        }));
        return (
          <div className="bg-seat-card border border-green-500/20 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-green-400" />
                <h3 className="text-sm font-semibold text-white">Live POS — Last {pos.window_days} Days</h3>
                <span className="text-[10px] text-zinc-500">{pos.total_orders.toLocaleString()} orders</span>
              </div>
              <span className="text-[10px] font-medium text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">REAL DATA</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              <MetricCard title="Peak Hour (real)" value={formatHour(peak.hour)} subtitle={`${peak.orders} orders`} />
              <MetricCard title="Peak Hour Revenue" value={formatCurrency(peak.revenue_cents / 100)} />
              <MetricCard title="30-Day Revenue" value={formatCurrency(pos.hourly.reduce((s, h) => s + h.revenue_cents, 0) / 100)} />
              <MetricCard title="30-Day Orders" value={pos.total_orders.toLocaleString()} />
            </div>
            <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Orders by Hour of Day</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                <XAxis dataKey="hour" stroke="#52525B" tick={{ fill: '#71717A', fontSize: 10 }} />
                <YAxis stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: 8 }} />
                <Bar dataKey="orders" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2 mt-4">Revenue by Day of Week</h4>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                <XAxis dataKey="day" stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
                <YAxis stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: 8 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [formatCurrency(Number(v)), 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })()}

      {/* Main Chart */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Hourly Breakdown</h3>
          <div className="flex gap-1 bg-zinc-800 rounded-lg p-1">
            {(['covers', 'revenue', 'wait'] as const).map(m => (
              <button key={m} onClick={() => setMetric(m)}
                className={cn('px-3 py-1 rounded text-xs font-medium capitalize transition-colors',
                  metric === m ? 'bg-seat-red text-white' : 'text-zinc-400 hover:text-white')}>
                {m === 'wait' ? 'Wait Time' : m}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
            <XAxis dataKey="hour" stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
            <YAxis stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }}
              tickFormatter={v => metric === 'revenue' ? `$${(v/1000).toFixed(0)}k` : `${v}`} />
            <Tooltip contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: 8 }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [metric === 'revenue' ? formatCurrency(value) : `${value}${metric === 'wait' ? ' min' : ''}`, '']} />
            <Bar dataKey={metric} radius={[4, 4, 0, 0]}
              fill={metric === 'wait' ? '#F59E0B' : '#E11D48'} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Staff Overlay */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Covers vs Staff On Duty</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
            <XAxis dataKey="hour" stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
            <YAxis yAxisId="left" stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: 8 }} />
            <Line yAxisId="left" type="monotone" dataKey="covers" stroke="#E11D48" strokeWidth={2} name="Covers" dot={{ r: 3 }} />
            <Line yAxisId="right" type="monotone" dataKey="staff" stroke="#3B82F6" strokeWidth={2} name="Staff" dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-6 mt-3 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-seat-red" /> Covers</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-blue-500" /> Staff</div>
        </div>
      </div>

      {/* Weekly Comparison */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Weekly Peak Comparison</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weekComparison}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
            <XAxis dataKey="day" stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
            <YAxis stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: 8 }} />
            <Bar dataKey="lunch_peak" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Lunch Peak" stackId="a" />
            <Bar dataKey="dinner_peak" fill="#E11D48" radius={[4, 4, 0, 0]} name="Dinner Peak" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
