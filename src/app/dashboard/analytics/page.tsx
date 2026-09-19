'use client';

import { useState, useEffect } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Brain,
  TrendingUp,
  Users,
  Star,
  AlertTriangle,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface AnalyticsData {
  sentiment: {
    average: number;
    total_reviews: number;
    distribution: { label: string; count: number }[];
    recent: Array<{
      author: string;
      rating: number;
      sentiment_score: number;
      sentiment_label: string;
      summary: string;
      platform: string;
    }>;
  };
  segments: {
    total_customers: number;
    distribution: { segment: string; count: number }[];
    top_vips: Array<{
      customer_name: string;
      visit_count: number;
      total_spend: number;
      ai_summary: string;
    }>;
    at_risk: Array<{
      customer_name: string;
      days_since_last_visit: number;
      churn_risk_score: number;
      ai_summary: string;
    }>;
  };
  digest: {
    digest_type: string;
    period_start: string;
    period_end: string;
    total_revenue: number;
    total_visits: number;
    new_customers: number;
    avg_sentiment: number;
    ai_digest: string;
    recommendations: string;
    analyzed_at: string;
  } | null;
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#22c55e',
  neutral: '#eab308',
  negative: '#ef4444',
};

const SEGMENT_COLORS: Record<string, string> = {
  VIP: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Regular: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  New: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'At-Risk': 'bg-red-500/20 text-red-400 border-red-500/30',
  Churned: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

function sentimentColor(score: number): string {
  if (score >= 0.6) return 'text-emerald-400';
  if (score >= 0.4) return 'text-yellow-400';
  return 'text-red-400';
}

function sentimentBadge(score: number): string {
  if (score >= 0.6) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  if (score >= 0.4) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  return 'bg-red-500/20 text-red-400 border-red-500/30';
}

function riskBadge(score: number): string {
  if (score >= 0.7) return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (score >= 0.4) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
}

function renderStars(rating: number) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={12}
          className={i < rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'}
        />
      ))}
    </span>
  );
}

export default function CortexAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then(res => (res.ok ? res.json() : null))
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  /* ─── Loading Skeleton ─── */
  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <Brain size={24} className="text-seat-red" />
            <h1 className="text-2xl font-semibold text-white tracking-tight">AI Analytics</h1>
          </div>
          <p className="text-sm text-zinc-500 mt-1">Intelligent insights, automatically generated</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-seat-card border border-seat-border rounded-xl p-5 animate-pulse">
              <div className="h-3 bg-zinc-800 rounded w-24 mb-3" />
              <div className="h-7 bg-zinc-800 rounded w-16" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-seat-card border border-seat-border rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-zinc-800 rounded w-40 mb-4" />
              <div className="space-y-3">
                <div className="h-3 bg-zinc-800 rounded w-full" />
                <div className="h-3 bg-zinc-800 rounded w-3/4" />
                <div className="h-3 bg-zinc-800 rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ─── Empty State ─── */
  if (!data) {
    return (
      <div>
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <Brain size={24} className="text-seat-red" />
            <h1 className="text-2xl font-semibold text-white tracking-tight">AI Analytics</h1>
          </div>
          <p className="text-sm text-zinc-500 mt-1">Intelligent insights, automatically generated</p>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
            <BarChart3 size={24} className="text-zinc-500" />
          </div>
          <h2 className="text-lg font-medium text-white mb-2">No analytics data yet</h2>
          <p className="text-zinc-500 text-sm max-w-md">
            Once your data is analyzed, AI-powered insights will appear here automatically.
          </p>
        </div>
      </div>
    );
  }

  const { sentiment, segments, digest } = data;

  const sentimentAvgDisplay = (sentiment.average * 100).toFixed(0);
  const pieData = sentiment.distribution.map(d => ({
    name: d.label,
    value: d.count,
  }));
  const totalSentimentCount = sentiment.distribution.reduce((s, d) => s + d.count, 0);

  return (
    <div>
      {/* ─── Header ─── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Brain size={24} className="text-seat-red" />
          <h1 className="text-2xl font-semibold text-white tracking-tight">AI Analytics</h1>
        </div>
        <p className="text-sm text-zinc-500 mt-1">Intelligent insights, automatically generated</p>
      </div>

      {/* ─── Metric Cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Avg Sentiment"
          value={`${sentimentAvgDisplay}%`}
          subtitle={sentiment.average >= 0.6 ? 'Positive' : sentiment.average >= 0.4 ? 'Neutral' : 'Negative'}
          icon={<TrendingUp size={16} />}
        />
        <MetricCard
          title="Reviews Analyzed"
          value={sentiment.total_reviews}
          icon={<Star size={16} />}
        />
        <MetricCard
          title="Customer Segments"
          value={segments.total_customers}
          subtitle={`${segments.distribution.length} segments`}
          icon={<Users size={16} />}
        />
        <MetricCard
          title="Latest Digest"
          value={digest ? formatDate(digest.period_end) : 'N/A'}
          subtitle={digest ? digest.digest_type : 'No digest yet'}
          icon={<Sparkles size={16} />}
        />
      </div>

      {/* ─── Sentiment Overview ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Sentiment Distribution */}
        <div className="bg-seat-card border border-seat-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 size={16} className="text-seat-red" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Sentiment Distribution</h2>
          </div>

          {/* Pie Chart */}
          <div className="flex items-center gap-6">
            <div className="w-36 h-36 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={SENTIMENT_COLORS[entry.name.toLowerCase()] || '#71717a'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1C1C21',
                      border: '1px solid #27272A',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 flex-1">
              {sentiment.distribution.map(d => {
                const pct = totalSentimentCount > 0 ? ((d.count / totalSentimentCount) * 100).toFixed(1) : '0';
                const color = SENTIMENT_COLORS[d.label.toLowerCase()] || '#71717a';
                return (
                  <div key={d.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-sm text-zinc-300 capitalize">{d.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-white font-medium tabular-nums">{d.count}</span>
                      <span className="text-xs text-zinc-500 tabular-nums w-12 text-right">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sentiment Bar */}
          <div className="mt-5">
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden flex">
              {sentiment.distribution.map(d => {
                const pct = totalSentimentCount > 0 ? (d.count / totalSentimentCount) * 100 : 0;
                const color = SENTIMENT_COLORS[d.label.toLowerCase()] || '#71717a';
                return (
                  <div
                    key={d.label}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="bg-seat-card border border-seat-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Star size={16} className="text-seat-red" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Recent Reviews</h2>
          </div>
          {sentiment.recent.length === 0 ? (
            <p className="text-zinc-500 text-sm py-8 text-center">No reviews analyzed yet.</p>
          ) : (
            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {sentiment.recent.map((review, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-zinc-800/40 border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{review.author}</span>
                      <span className="text-xs text-zinc-600">{review.platform}</span>
                    </div>
                    <span
                      className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${sentimentBadge(review.sentiment_score)}`}
                    >
                      {(review.sentiment_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="mb-1.5">{renderStars(review.rating)}</div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{review.summary}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Customer Segments ─── */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-6 mb-8">
        <div className="flex items-center gap-2 mb-5">
          <Users size={16} className="text-seat-red" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Customer Segments</h2>
        </div>

        {/* Segment Distribution Badges */}
        <div className="flex flex-wrap gap-3 mb-6">
          {segments.distribution.map(d => (
            <div
              key={d.segment}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${SEGMENT_COLORS[d.segment] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'}`}
            >
              <span className="text-sm font-medium">{d.segment}</span>
              <span className="text-lg font-bold">{d.count}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top VIPs */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Top VIPs</h3>
            {segments.top_vips.length === 0 ? (
              <p className="text-zinc-500 text-sm py-4 text-center">No VIP data available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left text-xs text-zinc-500 font-medium pb-2 pr-3">Name</th>
                      <th className="text-right text-xs text-zinc-500 font-medium pb-2 px-3">Visits</th>
                      <th className="text-right text-xs text-zinc-500 font-medium pb-2 px-3">Spend</th>
                      <th className="text-left text-xs text-zinc-500 font-medium pb-2 pl-3">AI Insight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {segments.top_vips.map((vip, i) => (
                      <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="py-2.5 pr-3 text-white font-medium">{vip.customer_name}</td>
                        <td className="py-2.5 px-3 text-zinc-300 text-right tabular-nums">{vip.visit_count}</td>
                        <td className="py-2.5 px-3 text-emerald-400 text-right tabular-nums font-medium">
                          {formatCurrency(vip.total_spend)}
                        </td>
                        <td className="py-2.5 pl-3 text-zinc-400 text-xs max-w-[200px] truncate">
                          {vip.ai_summary}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* At-Risk Customers */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <AlertTriangle size={12} className="text-red-400" />
              At-Risk Customers
            </h3>
            {segments.at_risk.length === 0 ? (
              <p className="text-zinc-500 text-sm py-4 text-center">No at-risk customers detected.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left text-xs text-zinc-500 font-medium pb-2 pr-3">Name</th>
                      <th className="text-right text-xs text-zinc-500 font-medium pb-2 px-3">Days Inactive</th>
                      <th className="text-right text-xs text-zinc-500 font-medium pb-2 px-3">Churn Risk</th>
                      <th className="text-left text-xs text-zinc-500 font-medium pb-2 pl-3">AI Insight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {segments.at_risk.map((customer, i) => (
                      <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="py-2.5 pr-3 text-white font-medium">{customer.customer_name}</td>
                        <td className="py-2.5 px-3 text-zinc-300 text-right tabular-nums">
                          {customer.days_since_last_visit}d
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${riskBadge(customer.churn_risk_score)}`}
                          >
                            {(customer.churn_risk_score * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-2.5 pl-3 text-zinc-400 text-xs max-w-[200px] truncate">
                          {customer.ai_summary}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── AI Digest ─── */}
      {digest ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Weekly Digest */}
          <div className="bg-seat-card border border-seat-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={16} className="text-seat-red" />
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">AI Weekly Digest</h2>
            </div>
            <p className="text-xs text-zinc-500 mb-4">
              {formatDate(digest.period_start)} &mdash; {formatDate(digest.period_end)}
            </p>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-xs text-zinc-500 mb-0.5">Revenue</p>
                <p className="text-lg font-bold text-seat-red tabular-nums">{formatCurrency(digest.total_revenue)}</p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-xs text-zinc-500 mb-0.5">Visits</p>
                <p className="text-lg font-bold text-white tabular-nums">{digest.total_visits.toLocaleString()}</p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-xs text-zinc-500 mb-0.5">New Customers</p>
                <p className="text-lg font-bold text-white tabular-nums">{digest.new_customers}</p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-xs text-zinc-500 mb-0.5">Avg Sentiment</p>
                <p className={`text-lg font-bold tabular-nums ${sentimentColor(digest.avg_sentiment)}`}>
                  {(digest.avg_sentiment * 100).toFixed(0)}%
                </p>
              </div>
            </div>

            <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">{digest.ai_digest}</div>
            <p className="text-xs text-zinc-600 mt-4">Analyzed {formatDate(digest.analyzed_at)}</p>
          </div>

          {/* Recommendations */}
          <div className="bg-seat-card border border-seat-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={16} className="text-seat-red" />
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">AI Recommendations</h2>
            </div>
            <div className="space-y-2">
              {digest.recommendations
                .split('\n')
                .filter(line => line.trim())
                .map((rec, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-zinc-800/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-seat-red mt-1.5 flex-shrink-0" />
                    <p className="text-sm text-zinc-300 leading-relaxed">{rec.replace(/^[-*]\s*/, '')}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-seat-card border border-seat-border rounded-xl p-6 mb-8">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
              <Sparkles size={18} className="text-zinc-500" />
            </div>
            <p className="text-zinc-500 text-sm">No AI digest generated yet. Check back after the weekly analysis runs.</p>
          </div>
        </div>
      )}
    </div>
  );
}
