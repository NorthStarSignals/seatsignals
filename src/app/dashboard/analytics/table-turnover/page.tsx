'use client';

import { useState, useEffect } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import {
  Clock,
  RotateCw,
  Gauge,
  Users,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ── Types ──

interface HourlyTurnover {
  hour: string;
  hour_num: number;
  avg_visits: number;
  turnover_rate: number;
  capacity_utilization: number;
  revenue: number;
}

interface WaitTimeDay {
  day: string;
  day_short: string;
  avg_wait_time: number;
  avg_dining_time: number;
  avg_daily_visits: number;
  revenue: number;
}

interface TurnoverData {
  summary: {
    avg_wait_time: number;
    avg_wait_trend: number;
    avg_turnover_rate: number;
    turnover_trend: number;
    peak_hour: string;
    peak_hour_capacity: number;
    tables_per_hour: number;
    overall_capacity: number;
    estimated_tables: number;
  };
  hourly_turnover: HourlyTurnover[];
  wait_time_by_day: WaitTimeDay[];
  peak_analysis: {
    peak_utilization: number;
    off_peak_utilization: number;
    peak_revenue: number;
    off_peak_revenue: number;
    utilization_gap: number;
  };
}

// ── Skeleton ──

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-seat-card rounded-lg ${className}`} />
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-seat-card border border-seat-border rounded-xl p-6">
      <Skeleton className="h-5 w-48 mb-4" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

// ── Capacity Gauge ──

function CapacityGauge({ value, label }: { value: number; label: string }) {
  const circumference = 2 * Math.PI * 54;
  const filled = (value / 100) * circumference;
  const color =
    value >= 80 ? '#e11d48' : value >= 50 ? '#f59e0b' : '#22c55e';

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="#27272A"
            strokeWidth="8"
          />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - filled}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{value}%</span>
        </div>
      </div>
      <span className="text-xs text-zinc-500 mt-2">{label}</span>
    </div>
  );
}

// ── Page Component ──

export default function TableTurnoverPage() {
  const [data, setData] = useState<TurnoverData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/table-turnover')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-seat-black p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <ChartSkeleton />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-seat-black flex items-center justify-center">
        <p className="text-zinc-500">Failed to load table turnover data.</p>
      </div>
    );
  }

  const { summary, hourly_turnover, wait_time_by_day, peak_analysis } = data;

  return (
    <div className="min-h-screen bg-seat-black p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Table Turnover</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Track seating efficiency, wait times, and capacity utilization across your restaurant
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Avg Wait Time"
          value={`${summary.avg_wait_time} min`}
          subtitle="Average across all days"
          trend={{
            value: Math.abs(summary.avg_wait_trend),
            positive: summary.avg_wait_trend < 0,
          }}
          icon={<Clock className="w-4 h-4" />}
        />
        <MetricCard
          title="Avg Turnover Rate"
          value={`${summary.avg_turnover_rate}x`}
          subtitle="Tables turned per hour"
          trend={{
            value: Math.abs(summary.turnover_trend),
            positive: summary.turnover_trend > 0,
          }}
          icon={<RotateCw className="w-4 h-4" />}
        />
        <MetricCard
          title="Peak Hour Capacity"
          value={`${summary.peak_hour_capacity}%`}
          subtitle={`Peak at ${summary.peak_hour}`}
          icon={<Gauge className="w-4 h-4" />}
        />
        <MetricCard
          title="Tables / Hour"
          value={summary.tables_per_hour}
          subtitle={`${summary.estimated_tables} tables estimated`}
          icon={<Users className="w-4 h-4" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Turnover Rate by Hour - Line Chart */}
        <div className="bg-seat-card border border-seat-border rounded-xl p-6">
          <h3 className="text-sm font-medium text-zinc-400 mb-4">
            Turnover Rate by Hour
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={hourly_turnover}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
              <XAxis
                dataKey="hour"
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={{ stroke: '#27272A' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={{ stroke: '#27272A' }}
                tickLine={false}
                domain={[0, 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1C1C21',
                  border: '1px solid #27272A',
                  borderRadius: '8px',
                  color: '#fff',
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [`${value}x`, 'Turnover Rate']}
              />
              <Line
                type="monotone"
                dataKey="turnover_rate"
                stroke="#E11D48"
                strokeWidth={2}
                dot={{ fill: '#E11D48', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Wait Time by Day - Bar Chart */}
        <div className="bg-seat-card border border-seat-border rounded-xl p-6">
          <h3 className="text-sm font-medium text-zinc-400 mb-4">
            Avg Wait Time by Day of Week
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={wait_time_by_day}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
              <XAxis
                dataKey="day_short"
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={{ stroke: '#27272A' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={{ stroke: '#27272A' }}
                tickLine={false}
                unit=" min"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1C1C21',
                  border: '1px solid #27272A',
                  borderRadius: '8px',
                  color: '#fff',
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => {
                  if (name === 'avg_wait_time') return [`${value} min`, 'Wait Time'];
                  if (name === 'avg_dining_time') return [`${value} min`, 'Dining Time'];
                  return [value, name];
                }}
              />
              <Bar
                dataKey="avg_wait_time"
                fill="#E11D48"
                radius={[4, 4, 0, 0]}
                name="avg_wait_time"
              />
              <Bar
                dataKey="avg_dining_time"
                fill="#E11D48"
                opacity={0.3}
                radius={[4, 4, 0, 0]}
                name="avg_dining_time"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Capacity Section */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-zinc-400 mb-6">
          Capacity Utilization
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {/* Overall Gauge */}
          <div className="flex justify-center">
            <CapacityGauge
              value={summary.overall_capacity}
              label="Overall Utilization"
            />
          </div>

          {/* Peak vs Off-Peak Gauges */}
          <div className="flex justify-center gap-8">
            <CapacityGauge
              value={peak_analysis.peak_utilization}
              label="Peak Hours"
            />
            <CapacityGauge
              value={peak_analysis.off_peak_utilization}
              label="Off-Peak"
            />
          </div>

          {/* Peak Analysis Stats */}
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-seat-border">
              <span className="text-xs text-zinc-500">Utilization Gap</span>
              <span className="text-sm font-medium text-white">
                {peak_analysis.utilization_gap}%
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-seat-border">
              <span className="text-xs text-zinc-500">Peak Revenue / hr</span>
              <span className="text-sm font-medium text-white">
                ${Math.round(peak_analysis.peak_revenue / 7)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-seat-border">
              <span className="text-xs text-zinc-500">Off-Peak Revenue / hr</span>
              <span className="text-sm font-medium text-white">
                ${Math.round(peak_analysis.off_peak_revenue / 6)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-xs text-zinc-500">Estimated Tables</span>
              <span className="text-sm font-medium text-white">
                {summary.estimated_tables}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hourly Capacity Heatstrip */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-zinc-400 mb-4">
          Hourly Capacity Overview
        </h3>
        <div className="flex gap-1">
          {hourly_turnover.map(h => {
            const intensity = h.capacity_utilization / 100;
            const bg =
              intensity >= 0.8
                ? 'bg-seat-red'
                : intensity >= 0.6
                ? 'bg-amber-500'
                : intensity >= 0.3
                ? 'bg-emerald-500'
                : 'bg-zinc-700';
            return (
              <div key={h.hour_num} className="flex-1 text-center group relative">
                <div
                  className={`${bg} rounded h-10 transition-all hover:opacity-80`}
                  style={{ opacity: Math.max(0.3, intensity) }}
                />
                <span className="text-[10px] text-zinc-600 mt-1 block">
                  {h.hour.replace(' AM', 'a').replace(' PM', 'p')}
                </span>
                {/* Tooltip on hover */}
                <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-zinc-900 border border-seat-border rounded-lg px-3 py-2 text-xs whitespace-nowrap z-10">
                  <div className="text-white font-medium">{h.hour}</div>
                  <div className="text-zinc-400">{h.capacity_utilization}% capacity</div>
                  <div className="text-zinc-400">{h.avg_visits} visits/hr</div>
                  <div className="text-zinc-400">${h.revenue} revenue</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-4 justify-end">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-zinc-700" />
            <span className="text-[10px] text-zinc-600">Low</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-500" />
            <span className="text-[10px] text-zinc-600">Moderate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-500" />
            <span className="text-[10px] text-zinc-600">High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-seat-red" />
            <span className="text-[10px] text-zinc-600">Peak</span>
          </div>
        </div>
      </div>
    </div>
  );
}
