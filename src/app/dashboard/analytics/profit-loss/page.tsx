'use client';

import { useState, useEffect, useCallback } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { formatCurrency } from '@/lib/utils';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';

interface MonthlyPL {
  month: string;
  revenue: number;
  cogs: number;
  labor: number;
  overhead: number;
  marketing: number;
  total_expenses: number;
  profit: number;
  margin: number;
}

interface PLData {
  current_month: MonthlyPL & { month: string };
  revenue_trend: number;
  monthly_data: MonthlyPL[];
  expense_breakdown: Array<{ category: string; amount: number; pct: number; color: string }>;
  food_cost_pct: number;
}

export default function ProfitLossPage() {
  const [data, setData] = useState<PLData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch('/api/analytics/profit-loss')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-800 rounded w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-zinc-800/50 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="p-6"><p className="text-zinc-400">Failed to load P&L data.</p></div>;
  }

  const cm = data.current_month;
  const profitPositive = cm.profit >= 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-seat-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Profit & Loss</h1>
          <p className="text-sm text-zinc-500">Revenue, costs, and profitability analysis</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Revenue"
          value={formatCurrency(cm.revenue)}
          subtitle="This month"
          trend={{ value: Math.abs(data.revenue_trend), positive: data.revenue_trend > 0 }}
          icon={<DollarSign className="w-4 h-4" />}
        />
        <MetricCard
          title="Total Expenses"
          value={formatCurrency(cm.total_expenses)}
          subtitle={`${cm.revenue > 0 ? Math.round((cm.total_expenses / cm.revenue) * 100) : 0}% of revenue`}
          icon={<TrendingDown className="w-4 h-4" />}
        />
        <MetricCard
          title="Net Profit"
          value={formatCurrency(cm.profit)}
          subtitle={profitPositive ? 'Profitable' : 'Operating at loss'}
          icon={profitPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        />
        <MetricCard
          title="Profit Margin"
          value={`${cm.margin}%`}
          subtitle={`Food cost: ${data.food_cost_pct}%`}
          icon={<PieIcon className="w-4 h-4" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Profit Trend */}
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
            Revenue vs Profit Trend
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.monthly_data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
              <XAxis dataKey="month" tick={{ fill: '#a1a1aa', fontSize: 12 }} stroke="#27272A" />
              <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} stroke="#27272A" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1C1C21',
                  border: '1px solid #27272A',
                  borderRadius: '8px',
                  color: '#fff',
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => [formatCurrency(Number(value)), name]}
                labelStyle={{ color: '#a1a1aa' }}
              />
              <Legend wrapperStyle={{ color: '#a1a1aa', fontSize: '12px' }} />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#E11D48" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="profit" name="Profit" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Breakdown Pie */}
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
            Expense Breakdown
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.expense_breakdown}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="amount"
                nameKey="category"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                label={({ category, pct }: any) => `${category}: ${pct}%`}
              >
                {data.expense_breakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1C1C21',
                  border: '1px solid #27272A',
                  borderRadius: '8px',
                  color: '#fff',
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => [formatCurrency(Number(value)), name]}
              />
              <Legend wrapperStyle={{ color: '#a1a1aa', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Expense Stack */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
          Monthly Expense Breakdown
        </h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.monthly_data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
            <XAxis dataKey="month" tick={{ fill: '#a1a1aa', fontSize: 12 }} stroke="#27272A" />
            <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} stroke="#27272A" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1C1C21',
                border: '1px solid #27272A',
                borderRadius: '8px',
                color: '#fff',
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [formatCurrency(Number(value)), name]}
              labelStyle={{ color: '#a1a1aa' }}
            />
            <Legend wrapperStyle={{ color: '#a1a1aa', fontSize: '12px' }} />
            <Bar dataKey="cogs" name="COGS" stackId="expenses" fill="#ef4444" />
            <Bar dataKey="labor" name="Labor" stackId="expenses" fill="#f59e0b" />
            <Bar dataKey="overhead" name="Overhead" stackId="expenses" fill="#3b82f6" />
            <Bar dataKey="marketing" name="Marketing" stackId="expenses" fill="#a855f7" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* P&L Table */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
          Monthly P&L Statement
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-seat-border">
                <th className="text-left py-2 px-3 text-zinc-500 font-medium text-xs">Month</th>
                <th className="text-right py-2 px-3 text-zinc-500 font-medium text-xs">Revenue</th>
                <th className="text-right py-2 px-3 text-zinc-500 font-medium text-xs">COGS</th>
                <th className="text-right py-2 px-3 text-zinc-500 font-medium text-xs">Labor</th>
                <th className="text-right py-2 px-3 text-zinc-500 font-medium text-xs">Other</th>
                <th className="text-right py-2 px-3 text-zinc-500 font-medium text-xs">Profit</th>
                <th className="text-right py-2 px-3 text-zinc-500 font-medium text-xs">Margin</th>
              </tr>
            </thead>
            <tbody>
              {data.monthly_data.slice().reverse().map(m => (
                <tr key={m.month} className="border-b border-seat-border/50 hover:bg-zinc-800/30">
                  <td className="py-2 px-3 text-white font-mono text-xs">{m.month}</td>
                  <td className="py-2 px-3 text-right text-white">{formatCurrency(m.revenue)}</td>
                  <td className="py-2 px-3 text-right text-red-400">{formatCurrency(m.cogs)}</td>
                  <td className="py-2 px-3 text-right text-amber-400">{formatCurrency(m.labor)}</td>
                  <td className="py-2 px-3 text-right text-zinc-400">{formatCurrency(m.overhead + m.marketing)}</td>
                  <td className={cn('py-2 px-3 text-right font-medium', m.profit >= 0 ? 'text-green-400' : 'text-red-400')}>
                    {formatCurrency(m.profit)}
                  </td>
                  <td className={cn('py-2 px-3 text-right font-medium', m.margin >= 10 ? 'text-green-400' : m.margin >= 0 ? 'text-amber-400' : 'text-red-400')}>
                    {m.margin}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
