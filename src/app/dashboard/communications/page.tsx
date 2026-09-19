'use client';

import { useState, useEffect } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { cn } from '@/lib/utils';
import {
  Inbox,
  Mail,
  MessageSquare,
  Bell,
  Globe,
  Star,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Communication {
  id: string;
  customer_name: string;
  customer_email: string;
  channel: 'email' | 'sms' | 'in_app' | 'social' | 'review';
  direction: 'inbound' | 'outbound';
  subject: string;
  preview_text: string;
  full_text: string;
  status: 'sent' | 'delivered' | 'read' | 'replied' | 'failed';
  created_at: string;
  tags: string[];
}

interface Stats {
  total_this_week: number;
  response_rate: number;
  avg_response_time_hrs: number;
  unread_count: number;
}

const CHANNEL_OPTIONS = [
  { value: '', label: 'All Channels' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'in_app', label: 'In-App' },
  { value: 'social', label: 'Social' },
  { value: 'review', label: 'Review' },
];

const DIRECTION_OPTIONS = [
  { value: '', label: 'All Directions' },
  { value: 'inbound', label: 'Inbound' },
  { value: 'outbound', label: 'Outbound' },
];

function getChannelIcon(channel: Communication['channel']) {
  switch (channel) {
    case 'email':
      return <Mail className="w-4 h-4" />;
    case 'sms':
      return <MessageSquare className="w-4 h-4" />;
    case 'in_app':
      return <Bell className="w-4 h-4" />;
    case 'social':
      return <Globe className="w-4 h-4" />;
    case 'review':
      return <Star className="w-4 h-4" />;
  }
}

function getChannelLabel(channel: Communication['channel']) {
  switch (channel) {
    case 'email':
      return 'Email';
    case 'sms':
      return 'SMS';
    case 'in_app':
      return 'In-App';
    case 'social':
      return 'Social';
    case 'review':
      return 'Review';
  }
}

function getStatusColor(status: Communication['status']) {
  switch (status) {
    case 'sent':
      return 'bg-blue-500/20 text-blue-300';
    case 'delivered':
      return 'bg-emerald-500/20 text-emerald-300';
    case 'read':
      return 'bg-zinc-500/20 text-zinc-300';
    case 'replied':
      return 'bg-purple-500/20 text-purple-300';
    case 'failed':
      return 'bg-red-500/20 text-red-300';
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-seat-card border border-seat-border rounded-xl p-5 h-28" />
        ))}
      </div>
      <div className="bg-seat-card border border-seat-border rounded-xl p-4 h-12" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-seat-card border border-seat-border rounded-xl p-5 h-24" />
        ))}
      </div>
    </div>
  );
}

export default function CommunicationsPage() {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const params = new URLSearchParams();
      if (channelFilter) params.set('channel', channelFilter);
      if (directionFilter) params.set('direction', directionFilter);

      const res = await fetch(`/api/communications?${params.toString()}`);
      const data = await res.json();
      setCommunications(data.communications || []);
      setStats(data.stats || null);
      setLoading(false);
    }
    fetchData();
  }, [channelFilter, directionFilter]);

  const filtered = communications.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.customer_name.toLowerCase().includes(q) ||
      c.preview_text.toLowerCase().includes(q) ||
      c.subject.toLowerCase().includes(q) ||
      c.full_text.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Communications</h1>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Inbox className="w-6 h-6 text-seat-red" />
        <h1 className="text-2xl font-bold text-white">Communications</h1>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="This Week"
          value={stats?.total_this_week ?? 0}
          icon={<Inbox className="w-4 h-4" />}
        />
        <MetricCard
          title="Response Rate"
          value={`${stats?.response_rate ?? 0}%`}
          icon={<ArrowUpRight className="w-4 h-4" />}
        />
        <MetricCard
          title="Avg Response Time"
          value={`${stats?.avg_response_time_hrs ?? 0}h`}
          icon={<Mail className="w-4 h-4" />}
        />
        <MetricCard
          title="Unread"
          value={stats?.unread_count ?? 0}
          icon={<Bell className="w-4 h-4" />}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by customer name or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-seat-card border border-seat-border rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-seat-red transition-colors"
          />
        </div>
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="px-3 py-2 bg-seat-card border border-seat-border rounded-lg text-white text-sm focus:outline-none focus:border-seat-red transition-colors"
        >
          {CHANNEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={directionFilter}
          onChange={(e) => setDirectionFilter(e.target.value)}
          className="px-3 py-2 bg-seat-card border border-seat-border rounded-lg text-white text-sm focus:outline-none focus:border-seat-red transition-colors"
        >
          {DIRECTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            No communications found.
          </div>
        )}
        {filtered.map((comm) => {
          const isExpanded = expandedId === comm.id;
          return (
            <button
              key={comm.id}
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : comm.id)}
              className={cn(
                'w-full text-left bg-seat-card border border-seat-border rounded-xl p-4 hover:border-zinc-600 transition-colors',
                isExpanded && 'border-seat-red/50'
              )}
            >
              <div className="flex items-start gap-3">
                {/* Direction Indicator */}
                <div
                  className={cn(
                    'mt-1 w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                    comm.direction === 'outbound'
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'bg-emerald-500/10 text-emerald-400'
                  )}
                >
                  {comm.direction === 'outbound' ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownLeft className="w-4 h-4" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-white text-sm">
                      {comm.customer_name}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-zinc-500">
                      {getChannelIcon(comm.channel)}
                      {getChannelLabel(comm.channel)}
                    </span>
                    <span
                      className={cn(
                        'text-xs px-1.5 py-0.5 rounded font-medium',
                        getStatusColor(comm.status)
                      )}
                    >
                      {comm.status}
                    </span>
                    <span className="text-xs text-zinc-600 ml-auto shrink-0">
                      {timeAgo(comm.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300 font-medium truncate">
                    {comm.subject}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5 truncate">
                    {comm.preview_text}
                  </p>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-seat-border">
                      <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        {comm.full_text}
                      </p>
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {comm.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-zinc-600 mt-2">
                        {comm.customer_email} &middot;{' '}
                        {new Date(comm.created_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Expand Icon */}
                <div className="mt-1 text-zinc-600 shrink-0">
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
