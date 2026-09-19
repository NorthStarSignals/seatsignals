'use client';

import { useState, useEffect, useCallback } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import {
  ThumbsUp,
  ThumbsDown,
  Minus,
  TrendingUp,
  MessageSquare,
  BarChart3,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { cn } from '@/lib/utils';

interface NPSData {
  nps_score: number;
  csat_score: number;
  total_responses: number;
  breakdown: {
    promoters: number;
    promoters_pct: number;
    passives: number;
    passives_pct: number;
    detractors: number;
    detractors_pct: number;
  };
  trend: Array<{ month: string; nps: number; responses: number }>;
  distribution: Array<{ score: number; count: number; category: string; color: string }>;
  detractor_feedback: Array<{ id: string; name: string; score: number; feedback: string; date: string }>;
  benchmarks: { industry_avg: number; excellent: number; good: number };
}

export default function NPSPage() {
  const [data, setData] = useState<NPSData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch('/api/analytics/nps')
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
          <div className="grid grid-cols-4 gap-4 mt-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-zinc-800/50 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-zinc-400">Failed to load NPS data.</p>
      </div>
    );
  }

  const npsColor = data.nps_score >= 50 ? 'text-green-400' : data.nps_score >= 0 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-seat-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">NPS & CSAT</h1>
          <p className="text-sm text-zinc-500">Net Promoter Score and Customer Satisfaction tracking</p>
        </div>
      </div>

      {/* NPS Score Hero */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-8 text-center">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Net Promoter Score</p>
        <div className={cn('text-6xl font-bold', npsColor)}>
          {data.nps_score > 0 ? '+' : ''}{data.nps_score}
        </div>
        <p className="text-sm text-zinc-400 mt-2">
          {data.nps_score >= 70 ? 'Excellent' : data.nps_score >= 50 ? 'Great' : data.nps_score >= 0 ? 'Good' : 'Needs Work'}
          {' · '}Industry avg: {data.benchmarks.industry_avg}
        </p>

        {/* NPS Bar */}
        <div className="mt-6 max-w-lg mx-auto">
          <div className="flex h-4 rounded-full overflow-hidden">
            <div className="bg-red-500" style={{ width: `${data.breakdown.detractors_pct}%` }} />
            <div className="bg-amber-500" style={{ width: `${data.breakdown.passives_pct}%` }} />
            <div className="bg-green-500" style={{ width: `${data.breakdown.promoters_pct}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-xs">
            <span className="text-red-400">Detractors {data.breakdown.detractors_pct}%</span>
            <span className="text-amber-400">Passives {data.breakdown.passives_pct}%</span>
            <span className="text-green-400">Promoters {data.breakdown.promoters_pct}%</span>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="CSAT Score"
          value={`${data.csat_score}%`}
          subtitle="Customer Satisfaction"
          icon={<ThumbsUp className="w-4 h-4" />}
        />
        <MetricCard
          title="Promoters"
          value={data.breakdown.promoters}
          subtitle={`${data.breakdown.promoters_pct}% of responses`}
          icon={<ThumbsUp className="w-4 h-4" />}
        />
        <MetricCard
          title="Detractors"
          value={data.breakdown.detractors}
          subtitle={`${data.breakdown.detractors_pct}% of responses`}
          icon={<ThumbsDown className="w-4 h-4" />}
        />
        <MetricCard
          title="Total Responses"
          value={data.total_responses}
          subtitle="All time"
          icon={<MessageSquare className="w-4 h-4" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* NPS Trend */}
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
            NPS Trend
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
              <XAxis dataKey="month" tick={{ fill: '#a1a1aa', fontSize: 12 }} stroke="#27272A" />
              <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} stroke="#27272A" domain={[-100, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1C1C21',
                  border: '1px solid #27272A',
                  borderRadius: '8px',
                  color: '#fff',
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [`${value}`, 'NPS']}
                labelStyle={{ color: '#a1a1aa' }}
              />
              <ReferenceLine y={0} stroke="#27272A" strokeDasharray="3 3" />
              <ReferenceLine y={data.benchmarks.industry_avg} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'Industry Avg', fill: '#f59e0b', fontSize: 10 }} />
              <Line type="monotone" dataKey="nps" stroke="#E11D48" strokeWidth={2} dot={{ fill: '#E11D48', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Score Distribution */}
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
            Score Distribution (0-10)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
              <XAxis dataKey="score" tick={{ fill: '#a1a1aa', fontSize: 12 }} stroke="#27272A" />
              <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} stroke="#27272A" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1C1C21',
                  border: '1px solid #27272A',
                  borderRadius: '8px',
                  color: '#fff',
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, _name: any, props: any) => [
                  `${value} responses`,
                  props?.payload?.category || 'Score',
                ]}
                labelStyle={{ color: '#a1a1aa' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.distribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-seat-card border border-green-500/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <ThumbsUp size={16} className="text-green-400" />
            <h3 className="text-sm font-medium text-green-400">Promoters (9-10)</h3>
          </div>
          <p className="text-3xl font-bold text-white">{data.breakdown.promoters}</p>
          <p className="text-xs text-zinc-500 mt-1">{data.breakdown.promoters_pct}% of all responses</p>
          <p className="text-[10px] text-zinc-600 mt-2">Loyal customers who recommend you</p>
        </div>
        <div className="bg-seat-card border border-amber-500/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Minus size={16} className="text-amber-400" />
            <h3 className="text-sm font-medium text-amber-400">Passives (7-8)</h3>
          </div>
          <p className="text-3xl font-bold text-white">{data.breakdown.passives}</p>
          <p className="text-xs text-zinc-500 mt-1">{data.breakdown.passives_pct}% of all responses</p>
          <p className="text-[10px] text-zinc-600 mt-2">Satisfied but at risk of switching</p>
        </div>
        <div className="bg-seat-card border border-red-500/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <ThumbsDown size={16} className="text-red-400" />
            <h3 className="text-sm font-medium text-red-400">Detractors (0-6)</h3>
          </div>
          <p className="text-3xl font-bold text-white">{data.breakdown.detractors}</p>
          <p className="text-xs text-zinc-500 mt-1">{data.breakdown.detractors_pct}% of all responses</p>
          <p className="text-[10px] text-zinc-600 mt-2">Unhappy customers who may discourage others</p>
        </div>
      </div>

      {/* Detractor Feedback */}
      {data.detractor_feedback.length > 0 && (
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
            Detractor Feedback — Action Required
          </h2>
          <div className="space-y-3">
            {data.detractor_feedback.map(item => (
              <div key={item.id} className="border border-red-500/10 bg-red-500/5 rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-white">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-400 font-bold">Score: {item.score}/10</span>
                    <span className="text-[10px] text-zinc-600">
                      {new Date(item.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-zinc-300">{item.feedback}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Benchmark Context */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
          <TrendingUp size={14} className="inline mr-1" />
          How You Compare
        </h2>
        <div className="space-y-4">
          {[
            { label: 'Your NPS', value: data.nps_score, color: npsColor },
            { label: 'Industry Average', value: data.benchmarks.industry_avg, color: 'text-amber-400' },
            { label: 'Good', value: data.benchmarks.good, color: 'text-blue-400' },
            { label: 'Excellent', value: data.benchmarks.excellent, color: 'text-green-400' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-4">
              <span className="text-xs text-zinc-400 w-32">{item.label}</span>
              <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-500 to-green-500"
                  style={{ width: `${Math.max(0, (item.value + 100) / 2)}%` }}
                />
              </div>
              <span className={cn('text-sm font-bold w-12 text-right', item.color)}>
                {item.value > 0 ? '+' : ''}{item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
