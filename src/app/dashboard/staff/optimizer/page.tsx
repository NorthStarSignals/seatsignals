'use client';

import { useState, useMemo } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { formatCurrency, cn } from '@/lib/utils';
import {
  Brain, Users, DollarSign, TrendingUp, AlertTriangle, Play, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useLocalStorageState } from '@/hooks/use-local-storage-state';

interface ShiftRec {
  day: string;
  shift: 'lunch' | 'dinner';
  current_staff: number;
  recommended_staff: number;
  predicted_covers: number;
  reason: string;
  savings: number;
}

const BASE_RECS: ShiftRec[] = [
  { day: 'Monday', shift: 'lunch', current_staff: 6, recommended_staff: 4, predicted_covers: 45, reason: 'Historical data shows Mon lunch averages 45 covers, 4 staff is optimal', savings: 180 },
  { day: 'Monday', shift: 'dinner', current_staff: 8, recommended_staff: 7, predicted_covers: 65, reason: 'Monday dinners trend 15% below Tue-Thu average', savings: 120 },
  { day: 'Tuesday', shift: 'lunch', current_staff: 5, recommended_staff: 5, predicted_covers: 55, reason: 'Staffing is optimal for predicted volume', savings: 0 },
  { day: 'Tuesday', shift: 'dinner', current_staff: 8, recommended_staff: 8, predicted_covers: 78, reason: 'Taco Tuesday promotion drives higher volume', savings: 0 },
  { day: 'Wednesday', shift: 'lunch', current_staff: 6, recommended_staff: 5, predicted_covers: 52, reason: 'Mid-week lunches stable at ~50 covers', savings: 90 },
  { day: 'Wednesday', shift: 'dinner', current_staff: 8, recommended_staff: 8, predicted_covers: 82, reason: 'Happy hour drives dinner traffic', savings: 0 },
  { day: 'Thursday', shift: 'lunch', current_staff: 5, recommended_staff: 5, predicted_covers: 58, reason: 'Optimal for volume', savings: 0 },
  { day: 'Thursday', shift: 'dinner', current_staff: 8, recommended_staff: 9, predicted_covers: 92, reason: 'Thursday dinners trending up 12%, consider adding 1 server', savings: -120 },
  { day: 'Friday', shift: 'lunch', current_staff: 6, recommended_staff: 6, predicted_covers: 72, reason: 'Friday lunch is peak weekday lunch', savings: 0 },
  { day: 'Friday', shift: 'dinner', current_staff: 10, recommended_staff: 10, predicted_covers: 110, reason: 'Peak dinner, all hands needed', savings: 0 },
  { day: 'Saturday', shift: 'lunch', current_staff: 7, recommended_staff: 8, predicted_covers: 88, reason: 'Weekend brunch volume up 20%, add 1 server', savings: -120 },
  { day: 'Saturday', shift: 'dinner', current_staff: 10, recommended_staff: 10, predicted_covers: 115, reason: 'Highest volume shift, fully staffed', savings: 0 },
  { day: 'Sunday', shift: 'lunch', current_staff: 8, recommended_staff: 9, predicted_covers: 95, reason: 'Sunday brunch is top performer, add 1', savings: -120 },
  { day: 'Sunday', shift: 'dinner', current_staff: 8, recommended_staff: 6, predicted_covers: 55, reason: 'Sunday dinners are quiet, reduce by 2 servers', savings: 240 },
];

function jitter(recs: ShiftRec[]): ShiftRec[] {
  return recs.map((r) => {
    // Simulate re-run adjusts predictions and rec staff slightly
    const newCovers = Math.max(20, Math.round(r.predicted_covers * (0.9 + Math.random() * 0.2)));
    const target = Math.max(3, Math.round(newCovers / 11));
    const savings = (r.current_staff - target) * 60;
    return {
      ...r,
      predicted_covers: newCovers,
      recommended_staff: target,
      savings,
    };
  });
}

export default function StaffOptimizerPage() {
  const [recs, setRecs] = useLocalStorageState<ShiftRec[]>('seatsignals_staff_optimizer', BASE_RECS);
  const [showOnlyChanges, setShowOnlyChanges] = useState(false);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useLocalStorageState<string | null>('seatsignals_staff_optimizer_lastrun', null);

  const filtered = useMemo(() => showOnlyChanges ? recs.filter((r) => r.current_staff !== r.recommended_staff) : recs, [recs, showOnlyChanges]);

  const totals = useMemo(() => ({
    totalSavings: recs.reduce((s, r) => s + r.savings, 0),
    overstaffed: recs.filter((r) => r.recommended_staff < r.current_staff).length,
    understaffed: recs.filter((r) => r.recommended_staff > r.current_staff).length,
    optimal: recs.filter((r) => r.savings === 0).length,
  }), [recs]);

  const run = async () => {
    setRunning(true);
    const tid = toast.loading('Running optimizer...');
    await new Promise((r) => setTimeout(r, 900));
    setRecs(jitter(recs));
    setLastRun(new Date().toISOString());
    toast.dismiss(tid);
    toast.success('Optimizer complete');
    setRunning(false);
  };

  const reset = () => {
    setRecs(BASE_RECS);
    toast.success('Reset to baseline');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Schedule Optimizer</h1>
            <p className="text-sm text-zinc-500">AI-powered staffing recommendations</p>
            {lastRun && <p className="text-[11px] text-zinc-600 mt-0.5">Last run {new Date(lastRun).toLocaleString()}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={reset} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white rounded-lg text-sm font-medium hover:bg-zinc-700 transition">
            <RefreshCw size={16} /> Reset
          </button>
          <button onClick={run} disabled={running} className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 transition disabled:opacity-50">
            <Play size={16} /> {running ? 'Running...' : 'Run Optimizer'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Weekly Savings" value={formatCurrency(totals.totalSavings)} icon={<DollarSign size={18} />} />
        <MetricCard title="Overstaffed Shifts" value={totals.overstaffed} icon={<TrendingUp size={18} />} />
        <MetricCard title="Understaffed Shifts" value={totals.understaffed} icon={<AlertTriangle size={18} />} />
        <MetricCard title="Optimal Shifts" value={totals.optimal} icon={<Users size={18} />} />
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={showOnlyChanges} onChange={() => setShowOnlyChanges(!showOnlyChanges)} className="rounded border-zinc-600 bg-zinc-800 text-seat-red focus:ring-seat-red" />
          <span className="text-sm text-zinc-400">Show only recommended changes</span>
        </label>
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-zinc-500 uppercase border-b border-seat-border bg-zinc-800/30">
              <th className="text-left py-3 px-4">Day</th>
              <th className="text-left py-3 px-4">Shift</th>
              <th className="text-right py-3 px-4">Predicted Covers</th>
              <th className="text-right py-3 px-4">Current Staff</th>
              <th className="text-right py-3 px-4">Recommended</th>
              <th className="text-right py-3 px-4">Savings</th>
              <th className="text-left py-3 px-4">Reason</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const isChange = r.current_staff !== r.recommended_staff;
              const isReduce = r.recommended_staff < r.current_staff;
              return (
                <tr key={`${r.day}-${r.shift}-${i}`} className={cn('border-b border-seat-border/30', isChange && 'bg-zinc-800/20')}>
                  <td className="py-3 px-4 text-white font-medium">{r.day}</td>
                  <td className="py-3 px-4">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full', r.shift === 'lunch' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400')}>{r.shift}</span>
                  </td>
                  <td className="py-3 px-4 text-right text-zinc-300">{r.predicted_covers}</td>
                  <td className="py-3 px-4 text-right text-zinc-300">{r.current_staff}</td>
                  <td className={cn('py-3 px-4 text-right font-bold', !isChange ? 'text-zinc-400' : isReduce ? 'text-green-400' : 'text-amber-400')}>
                    {r.recommended_staff}
                    {isChange && <span className="text-[10px] ml-1">({isReduce ? '' : '+'}{r.recommended_staff - r.current_staff})</span>}
                  </td>
                  <td className={cn('py-3 px-4 text-right font-medium', r.savings > 0 ? 'text-green-400' : r.savings < 0 ? 'text-amber-400' : 'text-zinc-500')}>
                    {r.savings > 0 ? `+${formatCurrency(r.savings)}` : r.savings < 0 ? formatCurrency(r.savings) : '-'}
                  </td>
                  <td className="py-3 px-4 text-xs text-zinc-400 max-w-xs">{r.reason}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-seat-border font-semibold">
              <td colSpan={5} className="py-3 px-4 text-right text-white">Total Weekly Impact</td>
              <td className={cn('py-3 px-4 text-right', totals.totalSavings >= 0 ? 'text-green-400' : 'text-amber-400')}>
                {totals.totalSavings >= 0 ? '+' : ''}{formatCurrency(totals.totalSavings)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
