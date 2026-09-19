'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import {
  FileBarChart,
  Calendar,
  Mail,
  Clock,
  Download,
  Plus,
  Trash2,
  Send,
  Check,
  X,
  Edit,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────

interface Schedule {
  id: string;
  restaurant_id: string;
  report_type: string;
  frequency: string;
  day_of_week: number | null;
  recipients: string[];
  include_pdf: boolean;
  include_ai_digest: boolean;
  active: boolean;
  last_sent: string | null;
  next_send: string | null;
  created_at: string;
}

interface ScheduleForm {
  report_type: string;
  frequency: string;
  day_of_week: number;
  recipients: string[];
  include_pdf: boolean;
  include_ai_digest: boolean;
}

// ── Constants ───────────────────────────────────────────────────────

const REPORT_TYPES: Record<string, string> = {
  weekly: 'Weekly Summary',
  monthly: 'Monthly Summary',
  daily: 'Daily Snapshot',
};

const FREQUENCIES: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const EMPTY_FORM: ScheduleForm = {
  report_type: 'weekly',
  frequency: 'weekly',
  day_of_week: 1,
  recipients: [],
  include_pdf: true,
  include_ai_digest: true,
};

// ── Mock report history (would come from a report_logs table) ───────

function generateMockHistory(): Array<{
  id: string;
  date: string;
  recipients: string[];
  status: 'sent' | 'failed';
  report_type: string;
}> {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (i + 1) * 7);
    return {
      id: `hist-${i}`,
      date: d.toISOString(),
      recipients: ['owner@restaurant.com'],
      status: (i === 3 ? 'failed' : 'sent') as 'sent' | 'failed',
      report_type: 'weekly',
    };
  });
}

// ── Page ────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ScheduleForm>({ ...EMPTY_FORM });
  const [emailInput, setEmailInput] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [history] = useState(generateMockHistory);

  // ── Fetch schedules ─────────────────────────────────────────────

  async function fetchSchedules() {
    try {
      const res = await fetch('/api/reports/schedule');
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setSchedules(json.schedules || []);
    } catch {
      toast.error('Failed to load report schedules');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSchedules();
  }, []);

  // ── PDF Download ────────────────────────────────────────────────

  async function downloadPDF(period: string) {
    setDownloading(period);
    try {
      const res = await fetch(`/api/reports/export?period=${period}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SeatSignals_${period}_report.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${period} report downloaded`);
    } catch {
      toast.error('Failed to download report');
    } finally {
      setDownloading(null);
    }
  }

  // ── CRUD ────────────────────────────────────────────────────────

  async function saveSchedule() {
    if (form.recipients.length === 0) {
      toast.error('Add at least one recipient');
      return;
    }

    try {
      if (editingId) {
        const res = await fetch('/api/reports/schedule', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...form }),
        });
        if (!res.ok) throw new Error('Update failed');
        toast.success('Schedule updated');
      } else {
        const res = await fetch('/api/reports/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error('Create failed');
        toast.success('Schedule created');
      }
      setShowModal(false);
      setEditingId(null);
      setForm({ ...EMPTY_FORM });
      fetchSchedules();
    } catch {
      toast.error('Failed to save schedule');
    }
  }

  async function deleteSchedule(id: string) {
    if (!confirm('Delete this schedule?')) return;
    try {
      const res = await fetch('/api/reports/schedule', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Schedule deleted');
      fetchSchedules();
    } catch {
      toast.error('Failed to delete schedule');
    }
  }

  async function toggleActive(schedule: Schedule) {
    try {
      const res = await fetch('/api/reports/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: schedule.id, active: !schedule.active }),
      });
      if (!res.ok) throw new Error('Toggle failed');
      fetchSchedules();
    } catch {
      toast.error('Failed to update schedule');
    }
  }

  function openEdit(schedule: Schedule) {
    setEditingId(schedule.id);
    setForm({
      report_type: schedule.report_type,
      frequency: schedule.frequency,
      day_of_week: schedule.day_of_week ?? 1,
      recipients: [...schedule.recipients],
      include_pdf: schedule.include_pdf,
      include_ai_digest: schedule.include_ai_digest,
    });
    setEmailInput('');
    setShowModal(true);
  }

  function openNew() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setEmailInput('');
    setShowModal(true);
  }

  // ── Email tag helpers ───────────────────────────────────────────

  function addEmail() {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Invalid email');
      return;
    }
    if (form.recipients.includes(email)) {
      toast.error('Email already added');
      return;
    }
    setForm((f) => ({ ...f, recipients: [...f.recipients, email] }));
    setEmailInput('');
  }

  function removeEmail(email: string) {
    setForm((f) => ({
      ...f,
      recipients: f.recipients.filter((e) => e !== email),
    }));
  }

  // ── Format helpers ──────────────────────────────────────────────

  function formatDate(iso: string | null) {
    if (!iso) return '--';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-seat-black text-white p-6 md:p-10 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <FileBarChart className="w-7 h-7 text-seat-red" />
          <h1 className="text-2xl font-bold">Reports</h1>
        </div>
        <p className="text-zinc-400 text-sm">
          Automated performance reports delivered to your inbox
        </p>
      </div>

      {/* ── Quick Export ──────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Quick Export
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Weekly card */}
          <div className="bg-seat-card border border-seat-border rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-seat-red/15 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-seat-red" />
              </div>
              <div>
                <p className="font-medium text-sm">Weekly Report</p>
                <p className="text-xs text-zinc-500">Current week performance</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => downloadPDF('weekly')}
              disabled={downloading === 'weekly'}
            >
              <Download className="w-3.5 h-3.5" />
              {downloading === 'weekly' ? 'Exporting...' : 'Download PDF'}
            </Button>
          </div>

          {/* Monthly card */}
          <div className="bg-seat-card border border-seat-border rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center">
                <FileBarChart className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Monthly Report</p>
                <p className="text-xs text-zinc-500">Full month summary</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => downloadPDF('monthly')}
              disabled={downloading === 'monthly'}
            >
              <Download className="w-3.5 h-3.5" />
              {downloading === 'monthly' ? 'Exporting...' : 'Download PDF'}
            </Button>
          </div>
        </div>
      </section>

      {/* ── Scheduled Reports ────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
            Scheduled Reports
          </h2>
          <Button size="sm" onClick={openNew}>
            <Plus className="w-3.5 h-3.5" />
            Schedule New Report
          </Button>
        </div>

        {loading ? (
          <div className="bg-seat-card border border-seat-border rounded-xl p-10 text-center text-zinc-500">
            Loading schedules...
          </div>
        ) : schedules.length === 0 ? (
          <div className="bg-seat-card border border-seat-border rounded-xl p-10 text-center text-zinc-500">
            <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No scheduled reports yet</p>
            <p className="text-xs mt-1">
              Click &quot;Schedule New Report&quot; to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((s) => (
              <div
                key={s.id}
                className="bg-seat-card border border-seat-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {REPORT_TYPES[s.report_type] || s.report_type}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                      {FREQUENCIES[s.frequency] || s.frequency}
                    </span>
                    {s.frequency === 'weekly' && s.day_of_week !== null && (
                      <span className="text-xs text-zinc-500">
                        {DAYS_OF_WEEK[s.day_of_week]}s
                      </span>
                    )}
                  </div>

                  {/* Recipients pills */}
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {s.recipients.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      >
                        <Mail className="w-3 h-3" />
                        {email}
                      </span>
                    ))}
                  </div>

                  {/* Next send */}
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Next: {formatDate(s.next_send)}
                    </span>
                    {s.include_pdf && (
                      <span className="text-emerald-500">PDF</span>
                    )}
                    {s.include_ai_digest && (
                      <span className="text-purple-400">AI Digest</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleActive(s)}
                    className="text-zinc-400 hover:text-white transition-colors"
                    title={s.active ? 'Pause schedule' : 'Activate schedule'}
                  >
                    {s.active ? (
                      <ToggleRight className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-zinc-600" />
                    )}
                  </button>
                  <button
                    onClick={() => openEdit(s)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteSchedule(s.id)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Report History ───────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Report History
        </h2>
        <div className="bg-seat-card border border-seat-border rounded-xl divide-y divide-seat-border">
          {history.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">
              No reports sent yet
            </div>
          ) : (
            history.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center ${
                      h.status === 'sent'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-red-500/15 text-red-400'
                    }`}
                  >
                    {h.status === 'sent' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <X className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {REPORT_TYPES[h.report_type] || h.report_type}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatDate(h.date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    <Send className="w-3 h-3" />
                    {h.recipients.length} recipient
                    {h.recipients.length !== 1 ? 's' : ''}
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      h.status === 'sent'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-red-500/15 text-red-400'
                    }`}
                  >
                    {h.status === 'sent' ? 'Sent' : 'Failed'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── Modal ────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-seat-card border border-seat-border rounded-2xl w-full max-w-lg mx-4 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">
                {editingId ? 'Edit Schedule' : 'Schedule New Report'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingId(null);
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Report Type */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Report Type
                </label>
                <select
                  value={form.report_type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, report_type: e.target.value }))
                  }
                  className="w-full h-9 px-3 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-seat-red"
                >
                  {Object.entries(REPORT_TYPES).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Frequency
                </label>
                <div className="flex gap-2">
                  {Object.entries(FREQUENCIES).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() =>
                        setForm((f) => ({ ...f, frequency: val }))
                      }
                      className={`flex-1 h-9 rounded-lg text-sm font-medium transition-all ${
                        form.frequency === val
                          ? 'bg-seat-red text-white'
                          : 'bg-zinc-900 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day of Week (only for weekly) */}
              {form.frequency === 'weekly' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Day of Week
                  </label>
                  <select
                    value={form.day_of_week}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        day_of_week: parseInt(e.target.value),
                      }))
                    }
                    className="w-full h-9 px-3 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-seat-red"
                  >
                    {DAYS_OF_WEEK.map((day, i) => (
                      <option key={i} value={i}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Recipients */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Recipients
                </label>
                {form.recipients.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {form.recipients.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      >
                        {email}
                        <button
                          onClick={() => removeEmail(email)}
                          className="hover:text-white ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addEmail();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button size="sm" variant="secondary" onClick={addEmail}>
                    Add
                  </Button>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <button
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        include_pdf: !f.include_pdf,
                      }))
                    }
                    className="relative"
                  >
                    {form.include_pdf ? (
                      <ToggleRight className="w-8 h-8 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-zinc-600" />
                    )}
                  </button>
                  <span className="text-sm text-zinc-300">
                    Include PDF attachment
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <button
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        include_ai_digest: !f.include_ai_digest,
                      }))
                    }
                    className="relative"
                  >
                    {form.include_ai_digest ? (
                      <ToggleRight className="w-8 h-8 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-zinc-600" />
                    )}
                  </button>
                  <span className="text-sm text-zinc-300">
                    Include AI digest
                  </span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-seat-border">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowModal(false);
                  setEditingId(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={saveSchedule}>
                {editingId ? 'Update Schedule' : 'Create Schedule'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
