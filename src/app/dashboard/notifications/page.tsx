'use client';

import { useState } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Star,
  Users,
  Gift,
  AlertTriangle,
  MessageSquare,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useLocalStorageState } from '@/hooks/use-local-storage-state';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string }> = {
  review: { icon: Star, color: 'text-amber-400 bg-amber-500/10' },
  customer: { icon: Users, color: 'text-blue-400 bg-blue-500/10' },
  referral: { icon: Gift, color: 'text-green-400 bg-green-500/10' },
  alert: { icon: AlertTriangle, color: 'text-red-400 bg-red-500/10' },
  survey: { icon: MessageSquare, color: 'text-purple-400 bg-purple-500/10' },
  revenue: { icon: DollarSign, color: 'text-emerald-400 bg-emerald-500/10' },
};

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'review', title: 'New 5-star review', message: 'Sarah K. left a 5-star review on Google: "Amazing food and service!"', read: false, created_at: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: 'n2', type: 'alert', title: 'Negative review needs response', message: 'Mike D. left a 2-star review on Yelp. Requires priority response.', read: false, created_at: new Date(Date.now() - 5 * 3600000).toISOString() },
  { id: 'n3', type: 'customer', title: 'VIP customer birthday', message: "Priya Shah's birthday is tomorrow. Send a greeting!", read: false, created_at: new Date(Date.now() - 10 * 3600000).toISOString() },
  { id: 'n4', type: 'revenue', title: 'Revenue milestone', message: 'You hit $50K in monthly revenue - great work!', read: true, created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 'n5', type: 'survey', title: 'New survey response', message: 'Diego A. completed the post-dine survey with 4.5/5 overall.', read: true, created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: 'n6', type: 'referral', title: 'Referral converted', message: 'Marcus Chen referred 3 new customers this week.', read: true, created_at: new Date(Date.now() - 4 * 86400000).toISOString() },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useLocalStorageState<Notification[]>(
    'seatsignals_notifications',
    INITIAL_NOTIFICATIONS
  );
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    toast.success('Marked as read');
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success('All marked as read');
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast.success('Notification removed');
  };

  const filtered = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center relative">
            <Bell className="w-5 h-5 text-seat-red" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-seat-red rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Notifications</h1>
            <p className="text-sm text-zinc-500">{unreadCount} unread</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white border border-zinc-700 rounded-lg transition-colors"
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
            filter === 'all' ? 'bg-white text-black border-white' : 'bg-zinc-800 text-zinc-400 border-zinc-700')}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
            filter === 'unread' ? 'bg-white text-black border-white' : 'bg-zinc-800 text-zinc-400 border-zinc-700')}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {filtered.map(n => {
          const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.alert;
          const Icon = config.icon;
          return (
            <div
              key={n.id}
              className={cn(
                'bg-seat-card border rounded-xl p-4 flex items-start gap-3 transition-colors',
                n.read ? 'border-seat-border opacity-60' : 'border-zinc-600'
              )}
            >
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', config.color)}>
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={cn('text-sm font-medium', n.read ? 'text-zinc-400' : 'text-white')}>
                    {n.title}
                  </h3>
                  {!n.read && <span className="w-2 h-2 bg-seat-red rounded-full flex-shrink-0" />}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{n.message}</p>
                <p className="text-[10px] text-zinc-600 mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!n.read && (
                  <button onClick={() => markRead(n.id)} className="p-1.5 text-zinc-600 hover:text-green-400 transition-colors">
                    <Check size={14} />
                  </button>
                )}
                <button onClick={() => deleteNotification(n.id)} className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <Bell size={48} className="mx-auto text-zinc-700 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-1">
              {filter === 'unread' ? 'All caught up!' : 'No notifications'}
            </h3>
            <p className="text-sm text-zinc-400">
              {filter === 'unread' ? 'You have no unread notifications' : 'Notifications will appear here'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
