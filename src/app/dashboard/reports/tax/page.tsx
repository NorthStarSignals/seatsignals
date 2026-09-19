'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  FileText,
  DollarSign,
  Download,
  Loader2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface TaxData {
  period: { year: string; quarter: string; start: string; end: string };
  income: { gross_revenue: number; tips_collected: number; sales_tax_collected: number; net_revenue: number };
  deductions: { cost_of_goods: number; labor: number; rent: number; utilities: number; insurance: number; marketing: number; supplies: number; depreciation: number; total: number };
  tax: { taxable_income: number; estimated_tax_rate: number; estimated_tax: number; sales_tax_owed: number; total_tax_liability: number };
  monthly: { month: string; revenue: number; tax_collected: number; expenses: number }[];
  by_type: { type: string; revenue: number; tax: number }[];
  transactions: number;
}

export default function TaxReportPage() {
  const [data, setData] = useState<TaxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [quarter, setQuarter] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year });
      if (quarter) params.set('quarter', quarter);
      const res = await fetch(`/api/reports/tax?${params}`);
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [year, quarter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (<div className="p-6 space-y-6"><div className="flex items-center justify-center py-40"><Loader2 size={32} className="animate-spin text-zinc-500" /></div></div>);
  }
  if (!data) return <div className="p-6"><p className="text-zinc-400">Failed to load.</p></div>;

  const Row = ({ label, value, bold, indent, color }: { label: string; value: number; bold?: boolean; indent?: boolean; color?: string }) => (
    <div className={cn('flex items-center justify-between py-2', indent && 'pl-6')}>
      <span className={cn('text-sm', bold ? 'text-white font-semibold' : 'text-zinc-400')}>{label}</span>
      <span className={cn('text-sm font-mono', bold ? 'text-white font-semibold' : color || 'text-zinc-300')}>{formatCurrency(value)}</span>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Tax Report</h1>
            <p className="text-sm text-zinc-500">{data.period.quarter} {data.period.year} · {data.transactions} transactions</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select value={year} onChange={e => setYear(e.target.value)}
            className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white focus:outline-none focus:border-seat-red">
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
          <select value={quarter} onChange={e => setQuarter(e.target.value)}
            className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white focus:outline-none focus:border-seat-red">
            <option value="">Full Year</option>
            <option value="Q1">Q1</option>
            <option value="Q2">Q2</option>
            <option value="Q3">Q3</option>
            <option value="Q4">Q4</option>
          </select>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded-lg text-xs hover:text-white border border-zinc-700">
            <Download size={12} /> PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Gross Revenue', value: data.income.gross_revenue },
          { label: 'Total Deductions', value: data.deductions.total },
          { label: 'Taxable Income', value: data.tax.taxable_income },
          { label: 'Est. Tax Liability', value: data.tax.total_tax_liability },
        ].map(c => (
          <div key={c.label} className="bg-seat-card border border-seat-border rounded-xl p-4">
            <p className="text-[10px] text-zinc-500 uppercase">{c.label}</p>
            <p className="text-xl font-bold text-white mt-1 flex items-center gap-1"><DollarSign size={14} className="text-seat-red" />{formatCurrency(c.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Statement */}
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Income</h3>
          <div className="divide-y divide-seat-border/30">
            <Row label="Gross Revenue" value={data.income.gross_revenue} />
            <Row label="Tips Collected" value={data.income.tips_collected} indent />
            <Row label="Sales Tax Collected" value={data.income.sales_tax_collected} indent color="text-amber-400" />
            <Row label="Net Revenue" value={data.income.net_revenue} bold />
          </div>
        </div>

        {/* Deductions */}
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Deductions</h3>
          <div className="divide-y divide-seat-border/30">
            <Row label="Cost of Goods Sold" value={data.deductions.cost_of_goods} indent />
            <Row label="Labor" value={data.deductions.labor} indent />
            <Row label="Rent" value={data.deductions.rent} indent />
            <Row label="Utilities" value={data.deductions.utilities} indent />
            <Row label="Insurance" value={data.deductions.insurance} indent />
            <Row label="Marketing" value={data.deductions.marketing} indent />
            <Row label="Supplies" value={data.deductions.supplies} indent />
            <Row label="Depreciation" value={data.deductions.depreciation} indent />
            <Row label="Total Deductions" value={data.deductions.total} bold />
          </div>
        </div>
      </div>

      {/* Tax Calculation */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Tax Calculation</h3>
        <div className="divide-y divide-seat-border/30 max-w-md">
          <Row label="Taxable Income" value={data.tax.taxable_income} />
          <Row label={`Federal Tax (${data.tax.estimated_tax_rate}%)`} value={data.tax.estimated_tax} indent color="text-red-400" />
          <Row label="Sales Tax Owed" value={data.tax.sales_tax_owed} indent color="text-red-400" />
          <Row label="Total Tax Liability" value={data.tax.total_tax_liability} bold />
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Monthly Revenue vs Tax</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
            <XAxis dataKey="month" tick={{ fill: '#a1a1aa', fontSize: 11 }} stroke="#27272A" />
            <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} stroke="#27272A" />
            <Tooltip contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: '8px', color: '#fff' }} labelStyle={{ color: '#a1a1aa' }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [formatCurrency(Number(value)), '']} />
            <Bar dataKey="revenue" fill="#3B82F6" name="Revenue" radius={[4, 4, 0, 0]} />
            <Bar dataKey="tax_collected" fill="#E11D48" name="Tax" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
