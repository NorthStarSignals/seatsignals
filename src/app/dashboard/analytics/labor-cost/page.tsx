'use client';

import { useState, useEffect, useCallback } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  Users,
  DollarSign,
  Target,
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
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface MonthlyData {
  month: string;
  revenue: number;
  labor_cost: number;
  labor_pct: number;
  foh_cost: number;
  boh_cost: number;
  mgmt_cost: number;
  overtime_cost: number;
}

interface ForecastData {
  month: string;
  projected_revenue: number;
  projected_labor: number;
  labor_pct: number;
  type: string;
}

interface RoleData {
  role: string;
  cost: number;
  pct: number;
  headcount: number;
}

interface LaborData {
  monthly: MonthlyData[];
  forecast: ForecastData[];
  by_role: RoleData[];
  stats: {
    avg_labor_pct: number;
    total_labor_cost: number;
    total_revenue: number;
    overtime_cost: number;
    target_labor_pct: number;
    headcount: number;
  };
}

const COLORS = ['#E11D48', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function LaborCostPage() {
  const [data, setData] = useState<LaborData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/labor-cost');
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (<div className="p-6 space-y-6"><div className="animate-pulse space-y-4"><div className="h-8 bg-zinc-800 rounded w-64" /><div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i=><div key={i} className="h-28 bg-zinc-800/50 rounded-xl" />)}</div></div></div>);
  }
  if (!data) return <div className="p-6"><p className="text-zinc-400">Failed to load data.</p></div>;

  const trendData = [
    ...data.monthly.map(m => ({ month: m.month, labor_pct: m.labor_pct, type: 'actual' })),
    ...data.forecast.map(f => ({ month: f.month, labor_pct: f.labor_pct, type: 'forecast' })),
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-seat-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Labor Cost Analysis</h1>
          <p className="text-sm text-zinc-500">Track labor costs as percentage of revenue with forecasting</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Avg Labor %" value={`${data.stats.avg_labor_pct}%`} icon={<Target size={18} />} />
        <MetricCard title="Total Labor Cost" value={formatCurrency(data.stats.total_labor_cost)} icon={<DollarSign size={18} />} />
        <MetricCard title="Overtime Cost" value={formatCurrency(data.stats.overtime_cost)} icon={<Clock size={18} />} />
        <MetricCard title="Headcount" value={data.stats.headcount} icon={<Users size={18} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Labor % Trend */}
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Labor % Trend + Forecast</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
              <XAxis dataKey="month" tick={{ fill: '#a1a1aa', fontSize: 11 }} stroke="#27272A" />
              <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} stroke="#27272A" domain={[20, 40]} />
              <Tooltip contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: '8px', color: '#fff' }} labelStyle={{ color: '#a1a1aa' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [`${value}%`, 'Labor %']} />
              <ReferenceLine y={data.stats.target_labor_pct} stroke="#10B981" strokeDasharray="5 5" label={{ value: 'Target', fill: '#10B981', fontSize: 10 }} />
              <Line type="monotone" dataKey="labor_pct" stroke="#E11D48" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* By Role Pie */}
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Cost by Role</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data.by_role} dataKey="cost" nameKey="role" cx="50%" cy="50%" outerRadius={100}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                label={(entry: any) => `${entry.role} ${entry.pct}%`}>
                {data.by_role.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: '8px', color: '#fff' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [formatCurrency(Number(value)), 'Cost']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue vs Labor Stacked */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Revenue vs Labor Cost</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
            <XAxis dataKey="month" tick={{ fill: '#a1a1aa', fontSize: 11 }} stroke="#27272A" />
            <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} stroke="#27272A" />
            <Tooltip contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: '8px', color: '#fff' }} labelStyle={{ color: '#a1a1aa' }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [formatCurrency(Number(value)), '']} />
            <Bar dataKey="foh_cost" stackId="labor" fill="#3B82F6" name="FOH" />
            <Bar dataKey="boh_cost" stackId="labor" fill="#F59E0B" name="BOH" />
            <Bar dataKey="mgmt_cost" stackId="labor" fill="#8B5CF6" name="Mgmt" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Role Details Table */}
      <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-seat-border">
              <th className="text-left px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Role</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Headcount</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Total Cost</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">% of Labor</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Cost/Head</th>
            </tr>
          </thead>
          <tbody>
            {data.by_role.map(r => (
              <tr key={r.role} className="border-b border-seat-border/50 hover:bg-zinc-800/30 transition-colors">
                <td className="px-4 py-3 text-white font-medium">{r.role}</td>
                <td className="px-4 py-3 text-right text-zinc-300">{r.headcount}</td>
                <td className="px-4 py-3 text-right text-white">{formatCurrency(r.cost)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-seat-red rounded-full" style={{ width: `${r.pct}%` }} />
                    </div>
                    <span className={cn('text-xs', r.pct > 25 ? 'text-amber-400' : 'text-zinc-300')}>{r.pct}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-zinc-300">{formatCurrency(r.headcount > 0 ? Math.round(r.cost / r.headcount) : 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
