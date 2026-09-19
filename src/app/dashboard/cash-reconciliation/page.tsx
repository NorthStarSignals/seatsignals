'use client';

import { useState, useEffect, useCallback } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  Banknote,
  CheckCircle,
  AlertTriangle,
  TrendingDown,
  Plus,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface CashEntry {
  id: string;
  date: string;
  register: string;
  opening_cash: number;
  cash_sales: number;
  cash_tips: number;
  payouts: number;
  expected_closing: number;
  actual_closing: number;
  variance: number;
  status: 'balanced' | 'over' | 'short';
  counted_by: string;
  notes: string;
}

interface CashData {
  entries: CashEntry[];
  today_entries: CashEntry[];
  daily_totals: { date: string; cash_sales: number; variance: number; count: number }[];
  stats: {
    total_entries: number;
    total_variance: number;
    shortages: number;
    balanced: number;
    accuracy_rate: number;
    today_cash_sales: number;
  };
}

export default function CashReconciliationPage() {
  const [data, setData] = useState<CashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ register: 'Register 1 (Main)', opening_cash: 200, cash_sales: 0, cash_tips: 0, payouts: 0, actual_closing: 0, counted_by: '', notes: '' });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/cash-reconciliation');
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const submitCount = async () => {
    try {
      const res = await fetch('/api/cash-reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success('Cash count submitted');
        setShowForm(false);
        fetchData();
      }
    } catch { toast.error('Failed to submit'); }
  };

  if (loading) {
    return (<div className="p-6 space-y-6"><div className="animate-pulse space-y-4"><div className="h-8 bg-zinc-800 rounded w-64" /><div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i=><div key={i} className="h-28 bg-zinc-800/50 rounded-xl" />)}</div></div></div>);
  }

  if (!data) return <div className="p-6"><p className="text-zinc-400">Failed to load.</p></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Banknote className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Cash Reconciliation</h1>
            <p className="text-sm text-zinc-500">Daily cash counts and variance tracking</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 transition-colors">
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'New Count'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Today Cash Sales" value={formatCurrency(data.stats.today_cash_sales)} icon={<Banknote size={18} />} />
        <MetricCard title="Accuracy Rate" value={`${data.stats.accuracy_rate}%`} icon={<CheckCircle size={18} />} />
        <MetricCard title="Total Variance" value={formatCurrency(data.stats.total_variance)} icon={<TrendingDown size={18} />} />
        <MetricCard title="Shortages" value={data.stats.shortages} icon={<AlertTriangle size={18} />} />
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-seat-card border border-seat-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Submit Cash Count</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Register', key: 'register', type: 'select', options: ['Register 1 (Main)', 'Register 2 (Bar)', 'Register 3 (Patio)'] },
              { label: 'Opening Cash', key: 'opening_cash', type: 'number' },
              { label: 'Cash Sales', key: 'cash_sales', type: 'number' },
              { label: 'Cash Tips', key: 'cash_tips', type: 'number' },
              { label: 'Payouts', key: 'payouts', type: 'number' },
              { label: 'Actual Closing', key: 'actual_closing', type: 'number' },
              { label: 'Counted By', key: 'counted_by', type: 'text' },
              { label: 'Notes', key: 'notes', type: 'text' },
            ].map(field => (
              <div key={field.key}>
                <label className="text-[10px] text-zinc-500 mb-1 block">{field.label}</label>
                {field.type === 'select' ? (
                  <select value={form[field.key as keyof typeof form]} onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-seat-red">
                    {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={field.type} value={form[field.key as keyof typeof form]}
                    onChange={e => setForm({ ...form, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-seat-red" />
                )}
              </div>
            ))}
          </div>
          <button onClick={submitCount} className="px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90">Submit Count</button>
        </div>
      )}

      {/* Variance Chart */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Daily Variance (Last 7 Days)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.daily_totals}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
            <XAxis dataKey="date" tick={{ fill: '#a1a1aa', fontSize: 11 }} stroke="#27272A"
              tickFormatter={(d: string) => new Date(d + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' })} />
            <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} stroke="#27272A" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: '8px', color: '#fff' }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [formatCurrency(Number(value)), 'Variance']}
              labelStyle={{ color: '#a1a1aa' }}
            />
            <Bar dataKey="variance" fill="#E11D48" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Today's Counts */}
      <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-seat-border">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Today&apos;s Counts</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-seat-border">
              <th className="text-left px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Register</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Opening</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Sales</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Expected</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Actual</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Variance</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Counted By</th>
            </tr>
          </thead>
          <tbody>
            {data.today_entries.map(e => (
              <tr key={e.id} className="border-b border-seat-border/50 hover:bg-zinc-800/30 transition-colors">
                <td className="px-4 py-3 text-white font-medium">{e.register}</td>
                <td className="px-4 py-3 text-right text-zinc-300">{formatCurrency(e.opening_cash)}</td>
                <td className="px-4 py-3 text-right text-zinc-300">{formatCurrency(e.cash_sales)}</td>
                <td className="px-4 py-3 text-right text-zinc-300">{formatCurrency(e.expected_closing)}</td>
                <td className="px-4 py-3 text-right text-white font-medium">{formatCurrency(e.actual_closing)}</td>
                <td className={cn('px-4 py-3 text-right font-medium',
                  e.variance > 0 ? 'text-amber-400' : e.variance < -5 ? 'text-red-400' : 'text-green-400')}>
                  {e.variance >= 0 ? '+' : ''}{formatCurrency(e.variance)}
                </td>
                <td className="px-4 py-3">
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium',
                    e.status === 'balanced' ? 'bg-green-500/10 text-green-400' :
                    e.status === 'over' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400')}>
                    {e.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-400">{e.counted_by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Full History */}
      <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-seat-border">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">7-Day History</h3>
        </div>
        <div className="divide-y divide-seat-border/50">
          {data.entries.filter(e => e.date !== new Date().toISOString().split('T')[0]).map(e => (
            <div key={e.id} className="px-4 py-3 flex items-center justify-between hover:bg-zinc-800/20 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500">{new Date(e.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                <span className="text-sm text-white">{e.register}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-zinc-400">{formatCurrency(e.cash_sales)} sales</span>
                <span className={cn('text-xs font-medium',
                  Math.abs(e.variance) <= 2 ? 'text-green-400' : e.variance > 0 ? 'text-amber-400' : 'text-red-400')}>
                  {e.variance >= 0 ? '+' : ''}{formatCurrency(e.variance)}
                </span>
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium',
                  e.status === 'balanced' ? 'bg-green-500/10 text-green-400' :
                  e.status === 'over' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400')}>
                  {e.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
