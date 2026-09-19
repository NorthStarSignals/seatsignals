'use client';

import { useState, useEffect, useCallback } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  BarChart3,
} from 'lucide-react';
import {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  LineChart,
  Line,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from 'recharts';

interface ForecastData {
  months: { month: string; actual: number; forecast: number | null; lower: number | null; upper: number | null }[];
  scenarios: {
    conservative: { growth: number; annual: number };
    base: { growth: number; annual: number };
    optimistic: { growth: number; annual: number };
  };
  dayOfWeek: { day: string; avg: number }[];
  summary: { current_month: number; next_month_forecast: number; avg_monthly: number; trend: string; trend_pct: number };
}

export default function RevenueForecastPage() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeScenario, setActiveScenario] = useState<'conservative' | 'base' | 'optimistic'>('base');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/revenue-forecast');
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (<div className="p-6 space-y-6"><div className="animate-pulse space-y-4"><div className="h-8 bg-zinc-800 rounded w-64" /><div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i=><div key={i} className="h-28 bg-zinc-800/50 rounded-xl" />)}</div><div className="h-80 bg-zinc-800/50 rounded-xl" /></div></div>);
  }
  if (!data) return <div className="p-6"><p className="text-zinc-400">Failed to load forecast data.</p></div>;

  const chartData = data.months.map(m => ({
    month: m.month.slice(5),
    actual: m.actual || undefined,
    forecast: m.forecast || undefined,
    lower: m.lower || undefined,
    upper: m.upper || undefined,
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-seat-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Revenue Forecast</h1>
          <p className="text-sm text-zinc-500">AI-powered revenue predictions and scenario analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Current Month" value={formatCurrency(data.summary.current_month)} icon={<DollarSign size={18} />} />
        <MetricCard title="Next Month (Est.)" value={formatCurrency(data.summary.next_month_forecast)} icon={<TrendingUp size={18} />} />
        <MetricCard title="Avg Monthly" value={formatCurrency(data.summary.avg_monthly)} icon={<Calendar size={18} />} />
        <MetricCard title="Trend" value={`${data.summary.trend === 'up' ? '+' : ''}${data.summary.trend_pct}%`} icon={<BarChart3 size={18} />} />
      </div>

      {/* Forecast Chart */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Revenue Trend & 3-Month Forecast</h3>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
            <XAxis dataKey="month" stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
            <YAxis stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: 8 }}
              labelStyle={{ color: '#A1A1AA' }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [formatCurrency(value), '']}
            />
            <Area type="monotone" dataKey="upper" stroke="none" fill="#E11D4820" />
            <Area type="monotone" dataKey="lower" stroke="none" fill="#09090B" />
            <Line type="monotone" dataKey="actual" stroke="#E11D48" strokeWidth={2} dot={{ fill: '#E11D48', r: 3 }} />
            <Line type="monotone" dataKey="forecast" stroke="#E11D48" strokeWidth={2} strokeDasharray="8 4" dot={{ fill: '#E11D48', r: 3, strokeDasharray: '' }} />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-6 mt-3 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-seat-red" /> Actual</div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-seat-red border-dashed" style={{ borderTop: '2px dashed #E11D48', height: 0 }} /> Forecast</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-seat-red/10 rounded" /> Confidence Range</div>
        </div>
      </div>

      {/* Scenario Analysis */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Scenario Analysis</h3>
        <div className="flex gap-2 mb-4">
          {(['conservative', 'base', 'optimistic'] as const).map(s => (
            <button key={s} onClick={() => setActiveScenario(s)}
              className={cn('px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors',
                activeScenario === s ? 'bg-seat-red text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white')}>
              {s}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-6">
          {(['conservative', 'base', 'optimistic'] as const).map(s => {
            const sc = data.scenarios[s];
            return (
              <div key={s} className={cn('rounded-xl p-4 border transition-colors',
                activeScenario === s ? 'border-seat-red bg-seat-red/5' : 'border-seat-border bg-zinc-800/30')}>
                <p className="text-xs text-zinc-500 uppercase capitalize">{s}</p>
                <p className="text-2xl font-bold text-white mt-1">{formatCurrency(sc.annual)}</p>
                <p className="text-xs text-zinc-400 mt-0.5">Annual projection</p>
                <p className={cn('text-sm font-medium mt-2',
                  sc.growth > 5 ? 'text-green-400' : sc.growth > 0 ? 'text-amber-400' : 'text-red-400')}>
                  {sc.growth > 0 ? '+' : ''}{sc.growth}% growth
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day of Week */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Average Revenue by Day of Week</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.dayOfWeek}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
            <XAxis dataKey="day" stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
            <YAxis stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} tickFormatter={v => `$${v}`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: 8 }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [formatCurrency(value), 'Avg Revenue']}
            />
            <ReferenceLine y={data.dayOfWeek.reduce((s, d) => s + d.avg, 0) / 7} stroke="#52525B" strokeDasharray="3 3" label={{ value: 'Avg', fill: '#71717A', fontSize: 10 }} />
            <Bar dataKey="avg" fill="#E11D48" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
