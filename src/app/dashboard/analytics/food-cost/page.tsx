'use client';

import { useState, useEffect, useCallback } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  UtensilsCrossed,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface ItemAnalysis {
  name: string;
  category: string;
  price: number;
  food_cost: number;
  food_cost_pct: number;
  margin: number;
  margin_pct: number;
  times_ordered: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
}

interface CategoryBreakdown {
  category: string;
  revenue: number;
  cost: number;
  count: number;
  items: number;
  profit: number;
  cost_pct: number;
}

interface FoodCostData {
  items: ItemAnalysis[];
  by_category: CategoryBreakdown[];
  high_cost_items: ItemAnalysis[];
  top_profit_items: ItemAnalysis[];
  stats: {
    total_items: number;
    total_revenue: number;
    total_food_cost: number;
    total_profit: number;
    avg_food_cost_pct: number;
    avg_margin_pct: number;
  };
}

const COLORS = ['#E11D48', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

export default function FoodCostPage() {
  const [data, setData] = useState<FoodCostData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/food-cost');
      if (res.ok) setData(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="p-6 space-y-6"><div className="animate-pulse space-y-4"><div className="h-8 bg-zinc-800 rounded w-64" /><div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i=><div key={i} className="h-28 bg-zinc-800/50 rounded-xl" />)}</div></div></div>
    );
  }

  if (!data) return <div className="p-6"><p className="text-zinc-400">Failed to load food cost data.</p></div>;

  const costColor = (pct: number) => pct > 35 ? 'text-red-400' : pct > 30 ? 'text-amber-400' : 'text-green-400';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
          <UtensilsCrossed className="w-5 h-5 text-seat-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Food Cost Analysis</h1>
          <p className="text-sm text-zinc-500">Track food costs, margins, and profit drivers</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Avg Food Cost" value={`${data.stats.avg_food_cost_pct}%`} icon={<DollarSign size={18} />} />
        <MetricCard title="Avg Margin" value={`${data.stats.avg_margin_pct}%`} icon={<TrendingUp size={18} />} />
        <MetricCard title="Total Profit" value={formatCurrency(data.stats.total_profit)} icon={<DollarSign size={18} />} />
        <MetricCard title="High Cost Items" value={data.high_cost_items.length} icon={<AlertTriangle size={18} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Profit */}
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Profit by Category</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.by_category}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
              <XAxis dataKey="category" tick={{ fill: '#a1a1aa', fontSize: 11 }} stroke="#27272A" />
              <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} stroke="#27272A" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: '8px', color: '#fff' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [formatCurrency(Number(value)), '']}
                labelStyle={{ color: '#a1a1aa' }}
              />
              <Bar dataKey="profit" fill="#10B981" radius={[4, 4, 0, 0]} name="Profit" />
              <Bar dataKey="cost" fill="#E11D48" radius={[4, 4, 0, 0]} name="Food Cost" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cost Distribution Pie */}
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Cost Distribution</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data.by_category} dataKey="cost" nameKey="category" cx="50%" cy="50%"
                outerRadius={100} label={// eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (entry: any) => `${entry.category} (${entry.cost_pct}%)`}>
                {data.by_category.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: '8px', color: '#fff' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [formatCurrency(Number(value)), 'Cost']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* High Cost Alert */}
      {data.high_cost_items.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-red-400" />
            <h3 className="text-sm font-semibold text-red-400">High Food Cost Items (&gt;35%)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {data.high_cost_items.map(item => (
              <div key={item.name} className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-3 py-2">
                <span className="text-sm text-white">{item.name}</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-zinc-400">{formatCurrency(item.price)}</span>
                  <span className="text-red-400 font-medium">{item.food_cost_pct}% cost</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Profit Drivers */}
      <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-seat-border">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Top Profit Drivers</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-seat-border">
              <th className="text-left px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">#</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Item</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Category</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Price</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Food Cost</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Cost %</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Orders</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Total Profit</th>
            </tr>
          </thead>
          <tbody>
            {data.top_profit_items.map((item, i) => (
              <tr key={item.name} className="border-b border-seat-border/50 hover:bg-zinc-800/30 transition-colors">
                <td className="px-4 py-3 text-zinc-500 font-mono text-xs">{i + 1}</td>
                <td className="px-4 py-3 text-white font-medium">{item.name}</td>
                <td className="px-4 py-3 text-zinc-400">{item.category}</td>
                <td className="px-4 py-3 text-right text-zinc-300">{formatCurrency(item.price)}</td>
                <td className="px-4 py-3 text-right text-zinc-300">{formatCurrency(item.food_cost)}</td>
                <td className={cn('px-4 py-3 text-right font-medium', costColor(item.food_cost_pct))}>{item.food_cost_pct}%</td>
                <td className="px-4 py-3 text-right text-zinc-300">{item.times_ordered}</td>
                <td className="px-4 py-3 text-right text-emerald-400 font-semibold">{formatCurrency(item.total_profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
