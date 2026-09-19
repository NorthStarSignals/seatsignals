'use client';

import { useState, useEffect, useCallback } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import {
  FileText,
  Plus,
  X,
  Trash2,
  Clock,
  Mail,
  ToggleLeft,
  ToggleRight,
  Calendar,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ReportSchedule {
  id: string;
  name: string;
  type: string;
  frequency: string;
  recipients: string[];
  last_sent: string | null;
  next_send: string;
  enabled: boolean;
  format: string;
  created_at: string;
}

interface ReportStats {
  total_schedules: number;
  active: number;
  sent_this_week: number;
  report_types: number;
}

const REPORT_TYPES = [
  { value: 'revenue', label: 'Revenue Summary' },
  { value: 'customers', label: 'Customer Insights' },
  { value: 'reviews', label: 'Review Digest' },
  { value: 'performance', label: 'Performance Report' },
  { value: 'inventory', label: 'Inventory Alert' },
  { value: 'staff', label: 'Staff Performance' },
  { value: 'marketing', label: 'Marketing ROI' },
];

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function AutomatedReportsPage() {
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState('revenue');
  const [frequency, setFrequency] = useState('weekly');
  const [recipients, setRecipients] = useState('');
  const [format, setFormat] = useState('pdf');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/reports/automated');
      if (res.ok) {
        const d = await res.json();
        setSchedules(d.schedules);
        setStats(d.stats);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createSchedule = async () => {
    if (!name) return;
    try {
      const res = await fetch('/api/reports/automated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type,
          frequency,
          recipients: recipients.split(',').map(r => r.trim()).filter(Boolean),
          format,
        }),
      });
      if (res.ok) {
        const newSchedule = await res.json();
        setSchedules(prev => [...prev, newSchedule]);
        toast.success('Report schedule created');
        setName(''); setRecipients('');
        setShowCreate(false);
      }
    } catch {
      toast.error('Failed to create schedule');
    }
  };

  const toggleSchedule = async (schedule: ReportSchedule) => {
    try {
      await fetch('/api/reports/automated', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: schedule.id, enabled: !schedule.enabled }),
      });
      setSchedules(prev =>
        prev.map(s => s.id === schedule.id ? { ...s, enabled: !s.enabled } : s)
      );
    } catch {
      toast.error('Failed to update');
    }
  };

  const deleteSchedule = async (id: string) => {
    try {
      await fetch('/api/reports/automated', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setSchedules(prev => prev.filter(s => s.id !== id));
      toast.success('Schedule removed');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const getTypeLabel = (t: string) => REPORT_TYPES.find(rt => rt.value === t)?.label || t;
  const getFreqColor = (f: string) => {
    switch (f) {
      case 'daily': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'weekly': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'monthly': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-64 bg-zinc-800 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-zinc-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Automated Reports</h1>
            <p className="text-sm text-zinc-500">Schedule recurring reports delivered to your inbox</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 transition-colors"
        >
          {showCreate ? <X size={16} /> : <Plus size={16} />}
          {showCreate ? 'Cancel' : 'New Schedule'}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard title="Total Schedules" value={stats.total_schedules} icon={<FileText size={18} />} />
          <MetricCard title="Active" value={stats.active} subtitle={`${stats.total_schedules - stats.active} paused`} icon={<Clock size={18} />} />
          <MetricCard title="Sent This Week" value={stats.sent_this_week} icon={<Send size={18} />} />
          <MetricCard title="Report Types" value={stats.report_types} icon={<Mail size={18} />} />
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="bg-seat-card border border-seat-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Create Report Schedule</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Report Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., Weekly Revenue Summary"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-seat-red"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Report Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-seat-red"
              >
                {REPORT_TYPES.map(rt => (
                  <option key={rt.value} value={rt.value}>{rt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Frequency</label>
              <select
                value={frequency}
                onChange={e => setFrequency(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-seat-red"
              >
                {FREQUENCIES.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Recipients (comma-separated)</label>
              <input
                value={recipients}
                onChange={e => setRecipients(e.target.value)}
                placeholder="owner@restaurant.com, manager@restaurant.com"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-seat-red"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Format</label>
              <select
                value={format}
                onChange={e => setFormat(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-seat-red"
              >
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
                <option value="email">Email (inline)</option>
              </select>
            </div>
          </div>
          <button
            onClick={createSchedule}
            disabled={!name}
            className="px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 disabled:opacity-50 transition-colors"
          >
            Create Schedule
          </button>
        </div>
      )}

      {/* Schedules List */}
      <div className="space-y-3">
        {schedules.map(schedule => (
          <div
            key={schedule.id}
            className={cn(
              'bg-seat-card border rounded-xl p-5 transition-colors',
              schedule.enabled ? 'border-seat-border' : 'border-zinc-800 opacity-60'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                  <FileText size={18} className="text-zinc-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{schedule.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-zinc-500">{getTypeLabel(schedule.type)}</span>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium', getFreqColor(schedule.frequency))}>
                      {schedule.frequency}
                    </span>
                    <span className="text-[10px] text-zinc-600 px-2 py-0.5 bg-zinc-800 rounded">
                      {schedule.format.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {/* Schedule info */}
                <div className="text-right hidden md:block">
                  <div className="flex items-center gap-1 text-xs text-zinc-400">
                    <Calendar size={12} />
                    <span>Next: {new Date(schedule.next_send).toLocaleDateString()}</span>
                  </div>
                  {schedule.last_sent && (
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      Last sent: {new Date(schedule.last_sent).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Recipients */}
                <div className="hidden lg:flex items-center gap-1">
                  <Mail size={12} className="text-zinc-500" />
                  <span className="text-xs text-zinc-400">{schedule.recipients.length} recipient{schedule.recipients.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => toggleSchedule(schedule)}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  {schedule.enabled ? (
                    <ToggleRight size={24} className="text-green-400" />
                  ) : (
                    <ToggleLeft size={24} />
                  )}
                </button>

                {/* Delete */}
                <button
                  onClick={() => deleteSchedule(schedule.id)}
                  className="text-zinc-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Recipients detail */}
            {schedule.recipients.length > 0 && (
              <div className="mt-3 pt-3 border-t border-seat-border/50">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Recipients:</span>
                  {schedule.recipients.map(email => (
                    <span key={email} className="text-[11px] text-zinc-400 px-2 py-0.5 bg-zinc-800 rounded">
                      {email}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {schedules.length === 0 && (
          <div className="text-center py-20">
            <FileText size={48} className="mx-auto text-zinc-700 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-1">No Report Schedules</h3>
            <p className="text-zinc-400 text-sm mb-4">Set up automated reports delivered to your inbox</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 transition-colors"
            >
              Create Your First Schedule
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
