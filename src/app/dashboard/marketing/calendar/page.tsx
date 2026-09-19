'use client';

import { useState, useEffect } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Mail,
  MessageSquare,
  Share2,
  PartyPopper,
  Tag,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface MarketingEvent {
  id: string;
  title: string;
  type: 'email' | 'sms' | 'social' | 'event' | 'promo' | 'holiday';
  date: string;
  time: string;
  channel: string;
  description: string;
  status: 'scheduled' | 'draft' | 'sent' | 'live';
  audience_size: number;
  created_by: string;
}

interface Stats {
  scheduled_this_month: number;
  sent_this_month: number;
  engagement_rate: number;
  upcoming_count: number;
}

const EVENT_COLORS: Record<MarketingEvent['type'], string> = {
  email: 'bg-blue-500/80 text-white',
  sms: 'bg-green-500/80 text-white',
  social: 'bg-purple-500/80 text-white',
  event: 'bg-amber-500/80 text-white',
  promo: 'bg-red-500/80 text-white',
  holiday: 'bg-pink-500/80 text-white',
};

const EVENT_ICONS: Record<MarketingEvent['type'], React.ReactNode> = {
  email: <Mail className="w-3 h-3" />,
  sms: <MessageSquare className="w-3 h-3" />,
  social: <Share2 className="w-3 h-3" />,
  event: <PartyPopper className="w-3 h-3" />,
  promo: <Tag className="w-3 h-3" />,
  holiday: <PartyPopper className="w-3 h-3" />,
};

const TYPE_OPTIONS: { value: MarketingEvent['type']; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'social', label: 'Social' },
  { value: 'event', label: 'Event' },
  { value: 'promo', label: 'Promo' },
  { value: 'holiday', label: 'Holiday' },
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function MarketingCalendarPage() {
  const [events, setEvents] = useState<MarketingEvent[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<MarketingEvent['type'] | 'all'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    type: 'email' as MarketingEvent['type'],
    date: '',
    time: '09:00',
    channel: '',
    description: '',
    audience_size: 0,
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      const res = await fetch('/api/marketing/calendar');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setEvents(data.events);
      setStats(data.stats);
    } catch {
      toast.error('Failed to load marketing calendar');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateEvent() {
    if (!newEvent.title || !newEvent.date) {
      toast.error('Title and date are required');
      return;
    }
    try {
      const res = await fetch('/api/marketing/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent),
      });
      if (!res.ok) throw new Error('Failed to create');
      const data = await res.json();
      setEvents(prev => [...prev, data.event]);
      setShowCreateForm(false);
      setNewEvent({ title: '', type: 'email', date: '', time: '09:00', channel: '', description: '', audience_size: 0 });
      toast.success('Event created');
    } catch {
      toast.error('Failed to create event');
    }
  }

  async function handleDeleteEvent(id: string) {
    try {
      const res = await fetch(`/api/marketing/calendar?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setEvents(prev => prev.filter(e => e.id !== id));
      toast.success('Event deleted');
    } catch {
      toast.error('Failed to delete event');
    }
  }

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  }

  const filteredEvents = filterType === 'all' ? events : events.filter(e => e.type === filterType);

  function getEventsForDay(day: number): MarketingEvent[] {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return filteredEvents.filter(e => e.date === dateStr);
  }

  const selectedDayEvents = selectedDate
    ? filteredEvents.filter(e => e.date === selectedDate)
    : [];

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-64 bg-seat-card rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-seat-card rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-[500px] bg-seat-card rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Marketing Calendar</h1>
          <p className="text-sm text-zinc-400 mt-1">Plan and track all marketing activities</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg hover:bg-seat-red/90 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Event
        </button>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard title="Scheduled" value={stats.scheduled_this_month} icon={<Clock className="w-4 h-4" />} />
          <MetricCard title="Sent This Month" value={stats.sent_this_month} icon={<Mail className="w-4 h-4" />} />
          <MetricCard title="Engagement Rate" value={`${stats.engagement_rate}%`} icon={<Share2 className="w-4 h-4" />} />
          <MetricCard title="Upcoming" value={stats.upcoming_count} icon={<Calendar className="w-4 h-4" />} />
        </div>
      )}

      {/* Filter + Month Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 uppercase tracking-wider mr-1">Filter:</span>
          <button
            onClick={() => setFilterType('all')}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              filterType === 'all' ? 'bg-zinc-600 text-white' : 'bg-seat-card text-zinc-400 hover:text-white'
            )}
          >
            All
          </button>
          {TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilterType(opt.value)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                filterType === opt.value
                  ? EVENT_COLORS[opt.value]
                  : 'bg-seat-card text-zinc-400 hover:text-white'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-1.5 rounded-lg bg-seat-card border border-seat-border hover:border-zinc-600 text-zinc-400 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-white min-w-[160px] text-center">{monthName}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg bg-seat-card border border-seat-border hover:border-zinc-600 text-zinc-400 hover:text-white transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Calendar Grid */}
        <div className="flex-1 bg-seat-card border border-seat-border rounded-xl overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-seat-border">
            {DAY_NAMES.map(day => (
              <div key={day} className="px-2 py-2.5 text-center text-xs font-medium text-zinc-500 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>
          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {/* Empty cells before first day */}
            {[...Array(firstDay)].map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-seat-border bg-seat-black/30" />
            ))}
            {/* Actual days */}
            {[...Array(daysInMonth)].map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = getEventsForDay(day);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDate(dateStr)}
                  className={cn(
                    'min-h-[100px] border-b border-r border-seat-border p-1.5 cursor-pointer transition-colors',
                    isToday && 'bg-seat-red/5',
                    isSelected && 'bg-zinc-800/60',
                    !isToday && !isSelected && 'hover:bg-zinc-800/30'
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium mb-1',
                      isToday ? 'bg-seat-red text-white' : 'text-zinc-400'
                    )}
                  >
                    {day}
                  </span>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map(evt => (
                      <div
                        key={evt.id}
                        className={cn(
                          'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium truncate',
                          EVENT_COLORS[evt.type]
                        )}
                        title={evt.title}
                      >
                        {EVENT_ICONS[evt.type]}
                        <span className="truncate">{evt.title}</span>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-zinc-500 pl-1">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
            {/* Trailing empty cells */}
            {(() => {
              const totalCells = firstDay + daysInMonth;
              const remainder = totalCells % 7;
              if (remainder === 0) return null;
              return [...Array(7 - remainder)].map((_, i) => (
                <div key={`trail-${i}`} className="min-h-[100px] border-b border-r border-seat-border bg-seat-black/30" />
              ));
            })()}
          </div>
        </div>

        {/* Sidebar: Selected Day Events */}
        {selectedDate && (
          <div className="w-80 bg-seat-card border border-seat-border rounded-xl p-4 space-y-3 h-fit">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </h3>
              <button onClick={() => setSelectedDate(null)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            {selectedDayEvents.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">No events on this day</p>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents.map(evt => (
                  <div key={evt.id} className="bg-seat-black/40 border border-seat-border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium', EVENT_COLORS[evt.type])}>
                          {EVENT_ICONS[evt.type]}
                          {evt.type}
                        </span>
                        <span className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] font-medium',
                          evt.status === 'sent' ? 'bg-green-500/20 text-green-400' :
                          evt.status === 'live' ? 'bg-blue-500/20 text-blue-400' :
                          evt.status === 'scheduled' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-zinc-700 text-zinc-400'
                        )}>
                          {evt.status}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteEvent(evt.id)}
                        className="text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-sm font-medium text-white">{evt.title}</p>
                    <p className="text-xs text-zinc-500">{evt.description}</p>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{evt.time}</span>
                      <span>{evt.channel}</span>
                      <span>{evt.audience_size.toLocaleString()} recipients</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-seat-card border border-seat-border rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Create Marketing Event</h3>
              <button onClick={() => setShowCreateForm(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Title</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={e => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-seat-black border border-seat-border rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-seat-red"
                  placeholder="Event title"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Type</label>
                  <select
                    value={newEvent.type}
                    onChange={e => setNewEvent(prev => ({ ...prev, type: e.target.value as MarketingEvent['type'] }))}
                    className="w-full px-3 py-2 bg-seat-black border border-seat-border rounded-lg text-sm text-white focus:outline-none focus:border-seat-red"
                  >
                    {TYPE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Channel</label>
                  <input
                    type="text"
                    value={newEvent.channel}
                    onChange={e => setNewEvent(prev => ({ ...prev, channel: e.target.value }))}
                    className="w-full px-3 py-2 bg-seat-black border border-seat-border rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-seat-red"
                    placeholder="e.g. Instagram"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={newEvent.date}
                    onChange={e => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 bg-seat-black border border-seat-border rounded-lg text-sm text-white focus:outline-none focus:border-seat-red"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Time</label>
                  <input
                    type="time"
                    value={newEvent.time}
                    onChange={e => setNewEvent(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full px-3 py-2 bg-seat-black border border-seat-border rounded-lg text-sm text-white focus:outline-none focus:border-seat-red"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Description</label>
                <textarea
                  value={newEvent.description}
                  onChange={e => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-seat-black border border-seat-border rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-seat-red resize-none"
                  rows={3}
                  placeholder="What is this event about?"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Audience Size</label>
                <input
                  type="number"
                  value={newEvent.audience_size}
                  onChange={e => setNewEvent(prev => ({ ...prev, audience_size: Number(e.target.value) }))}
                  className="w-full px-3 py-2 bg-seat-black border border-seat-border rounded-lg text-sm text-white focus:outline-none focus:border-seat-red"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEvent}
                className="px-4 py-2 bg-seat-red text-white rounded-lg hover:bg-seat-red/90 transition-colors text-sm font-medium"
              >
                Create Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
