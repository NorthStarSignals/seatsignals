'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  UserPlus,
  Star,
  AlertCircle,
  MessageSquare,
  Gift,
  ClipboardList,
  Bell,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  customer_name?: string;
  metadata?: Record<string, unknown>;
}

const ICON_MAP: Record<string, typeof Star> = {
  'user-plus': UserPlus,
  star: Star,
  'alert-circle': AlertCircle,
  'message-square': MessageSquare,
  gift: Gift,
  'clipboard-list': ClipboardList,
  bell: Bell,
};

const TYPE_COLORS: Record<string, string> = {
  new_customer: 'text-green-400 bg-green-500/10 border-green-500/20',
  review: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  referral: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  survey: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  notification: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function ActivityFeed({ limit = 15 }: { limit?: number }) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch('/api/activity');
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities.slice(0, limit));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, 120000); // refresh every 2 min
    return () => clearInterval(interval);
  }, [fetchActivity]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-zinc-800" />
            <div className="flex-1">
              <div className="h-3 w-32 bg-zinc-800 rounded mb-1.5" />
              <div className="h-2.5 w-48 bg-zinc-800/50 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity size={24} className="mx-auto text-zinc-700 mb-2" />
        <p className="text-sm text-zinc-500">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((item) => {
        const IconComponent = ICON_MAP[item.icon] || Bell;
        const colorClass = TYPE_COLORS[item.type] || TYPE_COLORS.notification;

        return (
          <div key={item.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-zinc-800/30 transition-colors">
            <div className={cn('w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0', colorClass)}>
              <IconComponent size={13} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-white">
                <span className="font-medium">{item.title}</span>
              </p>
              <p className="text-[11px] text-zinc-500 truncate">{item.description}</p>
            </div>
            <span className="text-[10px] text-zinc-600 flex-shrink-0 mt-0.5">{timeAgo(item.timestamp)}</span>
          </div>
        );
      })}
    </div>
  );
}
