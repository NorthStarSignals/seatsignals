'use client';

import { useState, useEffect, useCallback } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import {
  HeartPulse,
  Users,
  UserPlus,
  UserMinus,
  Activity,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

interface RetentionPoint {
  day: number;
  label: string;
  rate: number;
  count: number;
  total: number;
}

interface Segment {
  name: string;
  count: number;
  pct: number;
  color: string;
}

interface HealthData {
  total_customers: number;
  active_count: number;
  active_rate: number;
  churned_count: number;
  churn_rate: number;
  new_this_month: number;
  growth_rate: number;
  avg_visits: number;
  avg_spend: number;
  avg_lifetime_days: number;
  avg_sentiment: number | null;
  retention_curve: RetentionPoint[];
  health_score: number;
  segments: Segment[];
}

function HealthGauge({ score }: { score: number }) {
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444';
  const label = score >= 70 ? 'Healthy' : score >= 40 ? 'Needs Attention' : 'Critical';
  const circumference = 2 * Math.PI * 60;

  return (
    <div className="flex flex-col items-center">
      <svg width="160" height="140" viewBox="0 0 160 140">
        {/* Background arc */}
        <circle
          cx="80" cy="80" r="60" fill="none" stroke="#27272A" strokeWidth="12"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeLinecap="round"
          transform="rotate(135, 80, 80)"
        />
        {/* Value arc */}
        <circle
          cx="80" cy="80" r="60" fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={`${circumference * 0.75 * (score / 100)} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(135, 80, 80)"
          className="transition-all duration-1000"
        />
        <text x="80" y="72" textAnchor="middle" className="fill-white text-3xl font-bold" fontSize="32">{score}</text>
        <text x="80" y="95" textAnchor="middle" className="fill-zinc-400 text-xs" fontSize="12">{label}</text>
      </svg>
    </div>
  );
}

export default function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/customers/health');
      if (res.ok) setData(await res.json());
    } catch {
      console.error('Failed to fetch health data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-64 bg-zinc-800 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-zinc-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-80 bg-zinc-800/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return <div className="p-6 text-zinc-400">Failed to load health data.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <HeartPulse size={24} className="text-seat-red" />
          Customer Health
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          Real-time health metrics for your customer base
        </p>
      </div>

      {/* Top Row: Health Score + Key Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Health Gauge */}
        <div className="lg:col-span-1 bg-seat-card border border-seat-border rounded-xl p-5 flex flex-col items-center justify-center">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">Health Score</p>
          <HealthGauge score={data.health_score} />
        </div>

        {/* Stats */}
        <div className="lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Total Customers"
            value={data.total_customers.toLocaleString()}
            icon={<Users size={18} />}
          />
          <MetricCard
            title="Active (30d)"
            value={data.active_count.toLocaleString()}
            subtitle={`${data.active_rate}% of total`}
            icon={<Activity size={18} />}
          />
          <MetricCard
            title="New This Month"
            value={data.new_this_month}
            subtitle={`${data.growth_rate >= 0 ? '+' : ''}${data.growth_rate}% growth`}
            icon={<UserPlus size={18} />}
          />
          <MetricCard
            title="Churn Rate"
            value={`${data.churn_rate}%`}
            icon={<UserMinus size={18} />}
          />
        </div>
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Segment Donut */}
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Customer Segments</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data.segments}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="count"
              >
                {data.segments.map((seg, i) => (
                  <Cell key={i} fill={seg.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1C1C21', border: '1px solid #27272A', borderRadius: 8, color: '#fff' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(val: any, _name: any, props: any) => {
                  const p = props?.payload as Segment;
                  return [`${val} (${p?.pct || 0}%)`, p?.name || ''];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {data.segments.map(seg => (
              <div key={seg.name} className="flex items-center gap-1.5 text-xs text-zinc-400">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                {seg.name} ({seg.count})
              </div>
            ))}
          </div>
        </div>

        {/* Retention Curve */}
        <div className="lg:col-span-2 bg-seat-card border border-seat-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Retention Curve</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.retention_curve}>
              <XAxis dataKey="label" tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <Tooltip
                contentStyle={{ background: '#1C1C21', border: '1px solid #27272A', borderRadius: 8, color: '#fff' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(val: any) => [`${val}%`, 'Retention']}
              />
              <defs>
                <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E11D48" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#E11D48" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="rate" stroke="#E11D48" fill="url(#retGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row: Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-seat-card border border-seat-border rounded-xl p-4">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Avg Visits</p>
          <p className="text-xl font-bold text-white mt-1">{data.avg_visits}</p>
          <p className="text-[10px] text-zinc-600">per customer</p>
        </div>
        <div className="bg-seat-card border border-seat-border rounded-xl p-4">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Avg Spend</p>
          <p className="text-xl font-bold text-white mt-1">${data.avg_spend}</p>
          <p className="text-[10px] text-zinc-600">lifetime per customer</p>
        </div>
        <div className="bg-seat-card border border-seat-border rounded-xl p-4">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Avg Lifetime</p>
          <p className="text-xl font-bold text-white mt-1">{data.avg_lifetime_days}d</p>
          <p className="text-[10px] text-zinc-600">since first visit</p>
        </div>
        <div className="bg-seat-card border border-seat-border rounded-xl p-4">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Sentiment</p>
          <p className="text-xl font-bold text-white mt-1">
            {data.avg_sentiment !== null ? data.avg_sentiment.toFixed(2) : 'N/A'}
          </p>
          <p className="text-[10px] text-zinc-600">avg review score</p>
        </div>
        <div className="bg-seat-card border border-seat-border rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Shield size={12} className="text-green-400" />
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Growth</p>
          </div>
          <p className={cn('text-xl font-bold', data.growth_rate >= 0 ? 'text-green-400' : 'text-red-400')}>
            {data.growth_rate >= 0 ? '+' : ''}{data.growth_rate}%
          </p>
          <p className="text-[10px] text-zinc-600">vs last month</p>
        </div>
      </div>
    </div>
  );
}
