'use client';

import { MetricCard } from '@/components/ui/metric-card';
import { CheckCircle2, AlertCircle, FileText, DollarSign, Users } from 'lucide-react';

const closingChecklist = [
  { id: 1, task: 'Cash drawer reconciled', complete: true, by: 'Marco S.' },
  { id: 2, task: 'Credit card batch closed', complete: true, by: 'POS' },
  { id: 3, task: 'Tips distributed', complete: true, by: 'Marco S.' },
  { id: 4, task: 'Walk-in temperatures logged', complete: true, by: 'James P.' },
  { id: 5, task: 'Line broken down & sanitized', complete: true, by: 'Kitchen team' },
  { id: 6, task: 'Floor swept & mopped', complete: true, by: 'David K.' },
  { id: 7, task: 'Trash to dumpster', complete: false, by: '—' },
  { id: 8, task: 'Alarm set & doors locked', complete: false, by: '—' },
  { id: 9, task: 'Manager log entry submitted', complete: false, by: '—' },
];

export default function DailyClosingPage() {
  const completed = closingChecklist.filter(t => t.complete).length;
  const progress = (completed / closingChecklist.length) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Daily Closing Report</h1>
          <p className="text-seat-muted mt-1">Wednesday, April 11, 2026</p>
        </div>
        <button className="px-4 py-2 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg font-medium">Email Report</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Today's Revenue" value="$18,420" trend={{ value: 12, positive: true }} subtitle="vs avg Wednesday" />
        <MetricCard title="Covers" value="187" subtitle="vs 165 avg" trend={{ value: 13, positive: true }} />
        <MetricCard title="Avg Check" value="$98.50" trend={{ value: 4, positive: true }} />
        <MetricCard title="Labor %" value="27.8%" subtitle="$5,121" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-seat-card border border-seat-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-seat-red" />
            Sales Summary
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-seat-border/50">
              <span className="text-seat-muted">Food Sales</span>
              <span className="text-white font-medium">$13,820</span>
            </div>
            <div className="flex justify-between py-2 border-b border-seat-border/50">
              <span className="text-seat-muted">Beverage Sales</span>
              <span className="text-white font-medium">$3,840</span>
            </div>
            <div className="flex justify-between py-2 border-b border-seat-border/50">
              <span className="text-seat-muted">Bar Sales</span>
              <span className="text-white font-medium">$760</span>
            </div>
            <div className="flex justify-between py-2 border-b border-seat-border/50">
              <span className="text-seat-muted">Tax Collected</span>
              <span className="text-white font-medium">$1,565</span>
            </div>
            <div className="flex justify-between py-2 border-b border-seat-border/50">
              <span className="text-seat-muted">Tips</span>
              <span className="text-white font-medium">$3,118</span>
            </div>
            <div className="flex justify-between py-2 border-b border-seat-border/50">
              <span className="text-seat-muted">Discounts/Comps</span>
              <span className="text-red-500 font-medium">($340)</span>
            </div>
            <div className="flex justify-between py-3 border-t-2 border-seat-border">
              <span className="text-white font-bold">Net Revenue</span>
              <span className="text-white font-bold text-lg">$18,420</span>
            </div>
          </div>
        </div>

        <div className="bg-seat-card border border-seat-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-seat-red" />
            Closing Checklist
          </h3>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-seat-muted">Progress</span>
              <span className="text-white">{completed}/{closingChecklist.length}</span>
            </div>
            <div className="h-2 bg-seat-black rounded-full overflow-hidden">
              <div className="h-full bg-seat-red transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="space-y-2">
            {closingChecklist.map(t => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-seat-border/30">
                <div className="flex items-center gap-2">
                  {t.complete ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-seat-muted" />
                  )}
                  <span className={t.complete ? 'text-white' : 'text-seat-muted'}>{t.task}</span>
                </div>
                <span className="text-xs text-seat-muted">{t.by}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-seat-red" />
          Shift Summary
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-seat-border text-seat-muted">
                <th className="text-left py-3 px-2">Employee</th>
                <th className="text-left py-3 px-2">Role</th>
                <th className="text-right py-3 px-2">Hours</th>
                <th className="text-right py-3 px-2">Sales</th>
                <th className="text-right py-3 px-2">Tips</th>
                <th className="text-right py-3 px-2">Avg Check</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Marco Silva', role: 'Server', hours: 8.5, sales: 4820, tips: 824, avg: 112 },
                { name: 'Emma Wilson', role: 'Server', hours: 8.0, sales: 4120, tips: 728, avg: 108 },
                { name: 'Sarah Chen', role: 'Bartender', hours: 7.5, sales: 3640, tips: 642, avg: 0 },
                { name: 'Lisa Rodriguez', role: 'Host', hours: 8.0, sales: 0, tips: 320, avg: 0 },
              ].map((s, i) => (
                <tr key={i} className="border-b border-seat-border/50">
                  <td className="py-3 px-2 text-white">{s.name}</td>
                  <td className="py-3 px-2 text-seat-muted">{s.role}</td>
                  <td className="py-3 px-2 text-right text-white">{s.hours}</td>
                  <td className="py-3 px-2 text-right text-white">${s.sales.toLocaleString()}</td>
                  <td className="py-3 px-2 text-right text-white">${s.tips}</td>
                  <td className="py-3 px-2 text-right text-white">{s.avg ? `$${s.avg}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
