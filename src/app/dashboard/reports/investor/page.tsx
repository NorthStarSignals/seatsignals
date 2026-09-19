'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '@/lib/utils';
import {
  FileText,
  TrendingUp,
  Download,
  Loader2,
} from 'lucide-react';

interface InvestorData {
  revenue: { current_month: number; prev_month: number; ytd: number; growth_pct: number };
  customers: { total: number; new_this_month: number; retention_rate: number; avg_ltv: number };
  operations: { avg_check: number; covers_per_day: number; food_cost_pct: number; labor_pct: number; net_margin: number };
  milestones: { title: string; date: string; status: 'completed' | 'upcoming' }[];
}

function generateData(): InvestorData {
  return {
    revenue: { current_month: 142500, prev_month: 128000, ytd: 985000, growth_pct: 11.3 },
    customers: { total: 4250, new_this_month: 380, retention_rate: 72, avg_ltv: 850 },
    operations: { avg_check: 68, covers_per_day: 185, food_cost_pct: 29, labor_pct: 28, net_margin: 14 },
    milestones: [
      { title: 'Launched online ordering platform', date: '2026-03-15', status: 'completed' },
      { title: 'Reached 4,000 customer milestone', date: '2026-03-22', status: 'completed' },
      { title: 'Integrated with DoorDash & Uber Eats', date: '2026-04-01', status: 'completed' },
      { title: 'Private dining room renovation complete', date: '2026-04-20', status: 'upcoming' },
      { title: 'Summer seasonal menu launch', date: '2026-05-01', status: 'upcoming' },
      { title: 'Second location scouting begins', date: '2026-06-01', status: 'upcoming' },
    ],
  };
}

export default function InvestorReportPage() {
  const [data, setData] = useState<InvestorData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setTimeout(() => { setData(generateData()); setLoading(false); }, 300);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (<div className="p-6 flex items-center justify-center py-40"><Loader2 size={32} className="animate-spin text-zinc-500" /></div>);
  }
  if (!data) return <div className="p-6"><p className="text-zinc-400">Failed to load.</p></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Investor Report</h1>
            <p className="text-sm text-zinc-500">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} Board Report</p>
          </div>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-xs border border-zinc-700 hover:text-white">
          <Download size={14} /> Export PDF
        </button>
      </div>

      {/* Executive Summary */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Executive Summary</h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Revenue grew {data.revenue.growth_pct}% month-over-month to {formatCurrency(data.revenue.current_month)}, bringing YTD revenue to {formatCurrency(data.revenue.ytd)}.
          Customer base expanded to {data.customers.total.toLocaleString()} with {data.customers.new_this_month} new customers this month.
          Retention rate holds steady at {data.customers.retention_rate}%.
          Operational efficiency continues to improve with net margin at {data.operations.net_margin}%.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Monthly Revenue', value: formatCurrency(data.revenue.current_month), sub: `+${data.revenue.growth_pct}% MoM`, positive: true },
          { label: 'YTD Revenue', value: formatCurrency(data.revenue.ytd), sub: `${new Date().getMonth() + 1} months`, positive: true },
          { label: 'Total Customers', value: data.customers.total.toLocaleString(), sub: `+${data.customers.new_this_month} new`, positive: true },
          { label: 'Net Margin', value: `${data.operations.net_margin}%`, sub: 'After all expenses', positive: data.operations.net_margin > 10 },
        ].map(kpi => (
          <div key={kpi.label} className="bg-seat-card border border-seat-border rounded-xl p-4">
            <p className="text-[10px] text-zinc-500 uppercase">{kpi.label}</p>
            <p className="text-xl font-bold text-white mt-1">{kpi.value}</p>
            <p className={`text-xs mt-0.5 flex items-center gap-1 ${kpi.positive ? 'text-green-400' : 'text-red-400'}`}>
              <TrendingUp size={10} /> {kpi.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Revenue & Customers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Revenue Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-zinc-400">Current Month</span><span className="text-white font-medium">{formatCurrency(data.revenue.current_month)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-zinc-400">Previous Month</span><span className="text-zinc-300">{formatCurrency(data.revenue.prev_month)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-zinc-400">Year to Date</span><span className="text-white font-semibold">{formatCurrency(data.revenue.ytd)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-zinc-400">MoM Growth</span><span className="text-green-400 font-medium">+{data.revenue.growth_pct}%</span></div>
          </div>
        </div>

        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Customer Metrics</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-zinc-400">Total Customers</span><span className="text-white font-medium">{data.customers.total.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span className="text-zinc-400">New This Month</span><span className="text-green-400">{data.customers.new_this_month}</span></div>
            <div className="flex justify-between text-sm"><span className="text-zinc-400">Retention Rate</span><span className="text-white font-medium">{data.customers.retention_rate}%</span></div>
            <div className="flex justify-between text-sm"><span className="text-zinc-400">Avg Lifetime Value</span><span className="text-white font-medium">{formatCurrency(data.customers.avg_ltv)}</span></div>
          </div>
        </div>
      </div>

      {/* Operations */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Operational Metrics</h3>
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: 'Avg Check', value: formatCurrency(data.operations.avg_check), target: '$65', ok: data.operations.avg_check >= 65 },
            { label: 'Covers/Day', value: data.operations.covers_per_day.toString(), target: '175', ok: data.operations.covers_per_day >= 175 },
            { label: 'Food Cost', value: `${data.operations.food_cost_pct}%`, target: '<30%', ok: data.operations.food_cost_pct < 30 },
            { label: 'Labor Cost', value: `${data.operations.labor_pct}%`, target: '<30%', ok: data.operations.labor_pct < 30 },
            { label: 'Net Margin', value: `${data.operations.net_margin}%`, target: '>12%', ok: data.operations.net_margin > 12 },
          ].map(m => (
            <div key={m.label} className="text-center">
              <p className="text-[10px] text-zinc-500">{m.label}</p>
              <p className={`text-lg font-bold mt-1 ${m.ok ? 'text-green-400' : 'text-amber-400'}`}>{m.value}</p>
              <p className="text-[9px] text-zinc-600 mt-0.5">Target: {m.target}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Milestones */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Milestones & Roadmap</h3>
        <div className="space-y-3">
          {data.milestones.map((m, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${m.status === 'completed' ? 'bg-green-500' : 'bg-zinc-600'}`} />
              <span className={`text-sm flex-1 ${m.status === 'completed' ? 'text-zinc-400' : 'text-white'}`}>{m.title}</span>
              <span className="text-xs text-zinc-500">{new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
