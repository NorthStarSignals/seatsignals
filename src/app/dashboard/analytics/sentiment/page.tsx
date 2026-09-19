'use client';

import { useState, useEffect, useCallback } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import {
  Smile,
  Meh,
  Frown,
  Star,
  TrendingUp,
  MessageSquare,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';

interface SentimentData {
  sentiment_score: number;
  avg_rating: number;
  total_reviews: number;
  breakdown: {
    positive: number;
    neutral: number;
    negative: number;
    positive_pct: number;
    neutral_pct: number;
    negative_pct: number;
  };
  trend: Array<{
    month: string;
    positive: number;
    neutral: number;
    negative: number;
    total: number;
  }>;
  by_source: Array<{
    source: string;
    positive_pct: number;
    negative_pct: number;
    total: number;
  }>;
  rating_distribution: Array<{
    rating: number;
    count: number;
    pct: number;
  }>;
  top_keywords: Array<{
    word: string;
    count: number;
    sentiment: string;
  }>;
  negative_reviews: Array<{
    id: string;
    customer_name: string;
    rating: number;
    text: string;
    source: string;
    created_at: string;
  }>;
}

const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

export default function SentimentAnalyticsPage() {
  const [data, setData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch('/api/analytics/sentiment')
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
          <div className="grid grid-cols-2 gap-6 mt-6">
            <div className="h-80 bg-zinc-800/30 rounded-xl" />
            <div className="h-80 bg-zinc-800/30 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-zinc-400">Failed to load sentiment data.</p>
      </div>
    );
  }

  const pieData = [
    { name: 'Positive', value: data.breakdown.positive_pct },
    { name: 'Neutral', value: data.breakdown.neutral_pct },
    { name: 'Negative', value: data.breakdown.negative_pct },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-seat-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Sentiment Analysis</h1>
          <p className="text-sm text-zinc-500">Deep dive into customer feedback sentiment</p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Sentiment Score"
          value={`${data.sentiment_score}/100`}
          subtitle={data.sentiment_score >= 70 ? 'Healthy' : data.sentiment_score >= 40 ? 'Needs attention' : 'Critical'}
          icon={data.sentiment_score >= 70 ? <Smile className="w-4 h-4" /> : data.sentiment_score >= 40 ? <Meh className="w-4 h-4" /> : <Frown className="w-4 h-4" />}
        />
        <MetricCard
          title="Avg Rating"
          value={`${data.avg_rating}`}
          subtitle={`${data.total_reviews} total reviews`}
          icon={<Star className="w-4 h-4" />}
        />
        <MetricCard
          title="Positive Rate"
          value={`${data.breakdown.positive_pct}%`}
          subtitle={`${data.breakdown.positive} positive reviews`}
          icon={<Smile className="w-4 h-4" />}
        />
        <MetricCard
          title="Negative Rate"
          value={`${data.breakdown.negative_pct}%`}
          subtitle={`${data.breakdown.negative} need attention`}
          trend={{ value: data.breakdown.negative_pct, positive: false }}
          icon={<TrendingUp className="w-4 h-4" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment Distribution Pie */}
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
            Sentiment Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
                nameKey="name"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                label={({ name, value }: any) => `${name}: ${value}%`}
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
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
                formatter={(value: any, name: any) => [`${value}%`, name]}
              />
              <Legend wrapperStyle={{ color: '#a1a1aa', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Rating Distribution Bar */}
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
            Rating Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.rating_distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
              <XAxis
                dataKey="rating"
                tick={{ fill: '#a1a1aa', fontSize: 12 }}
                stroke="#27272A"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                tickFormatter={(v: any) => `${v}★`}
              />
              <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} stroke="#27272A" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1C1C21',
                  border: '1px solid #27272A',
                  borderRadius: '8px',
                  color: '#fff',
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [`${value} reviews`, 'Count']}
                labelStyle={{ color: '#a1a1aa' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.rating_distribution.map((entry, index) => (
                  <Cell
                    key={`bar-${index}`}
                    fill={entry.rating >= 4 ? '#22c55e' : entry.rating === 3 ? '#f59e0b' : '#ef4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sentiment Trend */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
          Sentiment Trend Over Time
        </h2>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data.trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
            <XAxis dataKey="month" tick={{ fill: '#a1a1aa', fontSize: 12 }} stroke="#27272A" />
            <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} stroke="#27272A" domain={[0, 100]} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1C1C21',
                border: '1px solid #27272A',
                borderRadius: '8px',
                color: '#fff',
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [`${value}%`, name]}
              labelStyle={{ color: '#a1a1aa' }}
            />
            <Legend wrapperStyle={{ color: '#a1a1aa', fontSize: '12px' }} />
            <Area type="monotone" dataKey="positive" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} name="Positive" />
            <Area type="monotone" dataKey="neutral" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} name="Neutral" />
            <Area type="monotone" dataKey="negative" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.4} name="Negative" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Row: Keywords + By Source */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Keywords */}
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
            Top Keywords in Reviews
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.top_keywords.map(kw => (
              <span
                key={kw.word}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border',
                  kw.sentiment === 'positive'
                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                    : kw.sentiment === 'negative'
                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                )}
              >
                {kw.word} ({kw.count})
              </span>
            ))}
            {data.top_keywords.length === 0 && (
              <p className="text-sm text-zinc-500">No keyword data available</p>
            )}
          </div>
        </div>

        {/* Sentiment by Source */}
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
            Sentiment by Source
          </h2>
          <div className="space-y-3">
            {data.by_source.map(src => (
              <div key={src.source} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-white font-medium">{src.source}</span>
                  <span className="text-zinc-400">{src.total} reviews</span>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden bg-zinc-800">
                  <div
                    className="bg-green-500 transition-all"
                    style={{ width: `${src.positive_pct}%` }}
                  />
                  <div
                    className="bg-zinc-600 transition-all"
                    style={{ width: `${100 - src.positive_pct - src.negative_pct}%` }}
                  />
                  <div
                    className="bg-red-500 transition-all"
                    style={{ width: `${src.negative_pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-500">
                  <span>{src.positive_pct}% positive</span>
                  <span>{src.negative_pct}% negative</span>
                </div>
              </div>
            ))}
            {data.by_source.length === 0 && (
              <p className="text-sm text-zinc-500">No source data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Negative Reviews Needing Attention */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
          Reviews Needing Attention
        </h2>
        <div className="space-y-3">
          {data.negative_reviews.map(review => (
            <div key={review.id} className="border border-red-500/20 bg-red-500/5 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Frown size={14} className="text-red-400" />
                  <span className="text-sm font-medium text-white">{review.customer_name}</span>
                  <span className="text-xs text-zinc-500 px-2 py-0.5 bg-zinc-800 rounded">{review.source}</span>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={12}
                      className={i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'}
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm text-zinc-300 line-clamp-2">{review.text}</p>
              <p className="text-[10px] text-zinc-600 mt-2">
                {new Date(review.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
          {data.negative_reviews.length === 0 && (
            <div className="text-center py-8">
              <Smile size={32} className="mx-auto text-green-400 mb-2" />
              <p className="text-sm text-zinc-400">No negative reviews — great job!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
