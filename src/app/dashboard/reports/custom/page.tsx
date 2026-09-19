'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  FileBarChart,
  Play,
  Download,
  Loader2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';

const AVAILABLE_METRICS = [
  { key: 'revenue', label: 'Revenue', color: '#E11D48' },
  { key: 'transactions', label: 'Transactions', color: '#3B82F6' },
  { key: 'avg_check', label: 'Avg Check', color: '#10B981' },
  { key: 'covers', label: 'Covers', color: '#F59E0B' },
  { key: 'tips', label: 'Tips', color: '#8B5CF6' },
  { key: 'per_person', label: 'Per Person Avg', color: '#EC4899' },
  { key: 'customer_count', label: 'Customer Count', color: '#06B6D4' },
  { key: 'new_customers', label: 'New Customers', color: '#84CC16' },
  { key: 'avg_ltv', label: 'Avg LTV', color: '#F97316' },
];

interface ReportRow {
  period: string;
  [key: string]: unknown;
}

export default function CustomReportPage() {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['revenue', 'transactions']);
  const [groupBy, setGroupBy] = useState('day');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [report, setReport] = useState<ReportRow[]>([]);
  const [summary, setSummary] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const toggleMetric = (key: string) => {
    setSelectedMetrics(prev =>
      prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key]
    );
  };

  const runReport = async () => {
    if (selectedMetrics.length === 0) { toast.error('Select at least one metric'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/reports/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: selectedMetrics, date_from: dateFrom || undefined, date_to: dateTo || undefined, group_by: groupBy }),
      });
      if (res.ok) {
        const data = await res.json();
        setReport(data.report || []);
        setSummary(data.summary || {});
        setHasRun(true);
        toast.success(`Report generated: ${data.row_count} rows`);
      }
    } catch { toast.error('Failed to generate report'); }
    finally { setLoading(false); }
  };

  const exportCSV = () => {
    if (report.length === 0) return;
    const headers = Object.keys(report[0]);
    const csv = [headers.join(','), ...report.map(row => headers.map(h => row[h] ?? '').join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custom_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  };

  const chartMetrics = selectedMetrics.filter(m => !['customer_count', 'new_customers', 'avg_ltv'].includes(m));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
          <FileBarChart className="w-5 h-5 text-seat-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Custom Report Builder</h1>
          <p className="text-sm text-zinc-500">Select metrics, date range, and grouping to build custom reports</p>
        </div>
      </div>

      {/* Config */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">Report Configuration</h3>

        {/* Metrics */}
        <div>
          <label className="text-xs text-zinc-400 mb-2 block">Metrics (select multiple)</label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_METRICS.map(m => (
              <button key={m.key} onClick={() => toggleMetric(m.key)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                  selectedMetrics.includes(m.key)
                    ? 'border-seat-red bg-seat-red/10 text-white'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white')}>
                <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: m.color }} />
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Range & Grouping */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-seat-red" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-seat-red" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Group By</label>
            <select value={groupBy} onChange={e => setGroupBy(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-seat-red">
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={runReport} disabled={loading || selectedMetrics.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 disabled:opacity-50 transition-colors">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {loading ? 'Generating...' : 'Run Report'}
          </button>
          {report.length > 0 && (
            <button onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-medium hover:text-white transition-colors border border-zinc-700">
              <Download size={16} /> Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {Object.keys(summary).length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(summary).map(([key, value]) => (
            <div key={key} className="bg-seat-card border border-seat-border rounded-xl p-4">
              <p className="text-[10px] text-zinc-500 uppercase">{key.replace(/_/g, ' ')}</p>
              <p className="text-xl font-bold text-white mt-1">
                {typeof value === 'number' && key.includes('ltv') ? formatCurrency(value) : String(value)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {hasRun && report.length > 0 && chartMetrics.length > 0 && (
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={report}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
              <XAxis dataKey="period" tick={{ fill: '#a1a1aa', fontSize: 11 }} stroke="#27272A" />
              <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} stroke="#27272A" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: '8px', color: '#fff' }}
                labelStyle={{ color: '#a1a1aa' }}
              />
              {chartMetrics.map(key => {
                const m = AVAILABLE_METRICS.find(am => am.key === key);
                return (
                  <Line key={key} type="monotone" dataKey={key} stroke={m?.color || '#E11D48'} strokeWidth={2} dot={{ r: 3 }} name={m?.label || key} />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Data Table */}
      {hasRun && report.length > 0 && (
        <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-seat-border">
                  <th className="text-left px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Period</th>
                  {selectedMetrics.filter(m => !['customer_count', 'new_customers', 'avg_ltv'].includes(m)).map(key => (
                    <th key={key} className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">
                      {AVAILABLE_METRICS.find(m => m.key === key)?.label || key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.map((row, i) => (
                  <tr key={i} className="border-b border-seat-border/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 text-white font-medium">{row.period}</td>
                    {selectedMetrics.filter(m => !['customer_count', 'new_customers', 'avg_ltv'].includes(m)).map(key => (
                      <td key={key} className="px-4 py-3 text-right text-zinc-300">
                        {['revenue', 'avg_check', 'tips', 'per_person'].includes(key)
                          ? formatCurrency(Number(row[key] || 0))
                          : String(row[key] ?? 0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {hasRun && report.length === 0 && (
        <div className="text-center py-20">
          <FileBarChart size={48} className="mx-auto text-zinc-700 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-1">No Data</h3>
          <p className="text-sm text-zinc-400">Try adjusting your date range or metrics</p>
        </div>
      )}
    </div>
  );
}
