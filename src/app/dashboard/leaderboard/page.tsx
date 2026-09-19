'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { useLocalStorageState } from '@/hooks/use-local-storage-state';
import toast from 'react-hot-toast';
import { Trophy, Users, Star, DollarSign, Award } from 'lucide-react';

type Range = 'week' | 'month' | 'quarter';

interface Entry {
  name: string;
  role: string;
  sales: number;
  covers: number;
  rating: number;
  tipsAvg: number;
}

const DATA: Record<Range, Entry[]> = {
  week: [
    { name: 'Marco Silva', role: 'Server', sales: 18420, covers: 142, rating: 4.9, tipsAvg: 22.4 },
    { name: 'Emma Wilson', role: 'Server', sales: 16840, covers: 128, rating: 4.8, tipsAvg: 20.1 },
    { name: 'Sarah Chen', role: 'Bartender', sales: 14320, covers: 218, rating: 4.7, tipsAvg: 19.8 },
    { name: 'David Kim', role: 'Server', sales: 13680, covers: 112, rating: 4.6, tipsAvg: 18.4 },
    { name: 'Lisa Rodriguez', role: 'Server', sales: 12440, covers: 98, rating: 4.5, tipsAvg: 17.2 },
  ],
  month: [
    { name: 'Marco Silva', role: 'Server', sales: 78200, covers: 604, rating: 4.9, tipsAvg: 22.1 },
    { name: 'Sarah Chen', role: 'Bartender', sales: 61400, covers: 892, rating: 4.8, tipsAvg: 20.3 },
    { name: 'Emma Wilson', role: 'Server', sales: 72100, covers: 548, rating: 4.8, tipsAvg: 19.8 },
    { name: 'David Kim', role: 'Server', sales: 58920, covers: 482, rating: 4.6, tipsAvg: 18.1 },
    { name: 'Lisa Rodriguez', role: 'Server', sales: 53200, covers: 420, rating: 4.5, tipsAvg: 17.4 },
  ],
  quarter: [
    { name: 'Marco Silva', role: 'Server', sales: 232400, covers: 1820, rating: 4.9, tipsAvg: 22.3 },
    { name: 'Emma Wilson', role: 'Server', sales: 210800, covers: 1604, rating: 4.8, tipsAvg: 20.0 },
    { name: 'Sarah Chen', role: 'Bartender', sales: 182400, covers: 2612, rating: 4.8, tipsAvg: 20.1 },
    { name: 'David Kim', role: 'Server', sales: 174200, covers: 1412, rating: 4.6, tipsAvg: 18.2 },
    { name: 'Lisa Rodriguez', role: 'Server', sales: 156000, covers: 1210, rating: 4.5, tipsAvg: 17.0 },
  ],
};

interface Targets {
  salesTarget: number;
  coversTarget: number;
  ratingTarget: number;
}

const DEFAULT_TARGETS: Targets = { salesTarget: 15000, coversTarget: 130, ratingTarget: 4.7 };

export default function LeaderboardPage() {
  const [range, setRange] = useState<Range>('week');
  const [targets, setTargets] = useLocalStorageState<Targets>('seatsignals_leaderboard_targets', DEFAULT_TARGETS);
  const [editMode, setEditMode] = useState(false);

  const entries = DATA[range];

  const saveTargets = () => { setEditMode(false); toast.success('Targets saved'); };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
            <p className="text-sm text-zinc-500">Who&apos;s crushing it on your floor</p>
          </div>
        </div>
        <div className="flex gap-2">
          {(['week', 'month', 'quarter'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                range === r ? 'bg-seat-red text-white' : 'bg-seat-card border border-seat-border text-zinc-400 hover:text-white'
              }`}
            >
              {r === 'week' ? 'This Week' : r === 'month' ? 'This Month' : 'Quarter'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Top Earner" value={entries[0].name.split(' ')[0]} subtitle={`$${entries[0].sales.toLocaleString()}`} icon={<Trophy size={18} />} />
        <MetricCard title="Most Covers" value={entries.reduce((a, b) => a.covers > b.covers ? a : b).name.split(' ')[0]} icon={<Users size={18} />} />
        <MetricCard title="Highest Rated" value={entries.reduce((a, b) => a.rating > b.rating ? a : b).rating.toFixed(1)} icon={<Star size={18} />} />
        <MetricCard title="Team Avg Tip" value={`${(entries.reduce((s, e) => s + e.tipsAvg, 0) / entries.length).toFixed(1)}%`} icon={<DollarSign size={18} />} />
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Targets</h3>
          <button
            onClick={() => editMode ? saveTargets() : setEditMode(true)}
            className="text-xs text-seat-red hover:underline"
          >
            {editMode ? 'Save' : 'Edit Targets'}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-zinc-500 mb-1">Sales / week</div>
            {editMode ? (
              <input
                type="number"
                value={targets.salesTarget}
                onChange={(e) => setTargets(t => ({ ...t, salesTarget: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-seat-black border border-seat-border rounded px-3 py-1.5 text-sm text-white"
              />
            ) : <div className="text-white font-semibold">${targets.salesTarget.toLocaleString()}</div>}
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-1">Covers / week</div>
            {editMode ? (
              <input
                type="number"
                value={targets.coversTarget}
                onChange={(e) => setTargets(t => ({ ...t, coversTarget: parseInt(e.target.value) || 0 }))}
                className="w-full bg-seat-black border border-seat-border rounded px-3 py-1.5 text-sm text-white"
              />
            ) : <div className="text-white font-semibold">{targets.coversTarget}</div>}
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-1">Rating target</div>
            {editMode ? (
              <input
                type="number"
                step="0.1"
                value={targets.ratingTarget}
                onChange={(e) => setTargets(t => ({ ...t, ratingTarget: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-seat-black border border-seat-border rounded px-3 py-1.5 text-sm text-white"
              />
            ) : <div className="text-white font-semibold">{targets.ratingTarget.toFixed(1)}★</div>}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {entries.map((e, i) => {
          const salesHitPct = Math.min(100, (e.sales / (range === 'week' ? targets.salesTarget : range === 'month' ? targets.salesTarget * 4 : targets.salesTarget * 13)) * 100);
          return (
            <div key={e.name} className="flex items-center gap-4 p-4 bg-seat-card border border-seat-border rounded-xl">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                i === 0 ? 'bg-amber-500/20 text-amber-400' :
                i === 1 ? 'bg-zinc-400/20 text-zinc-300' :
                i === 2 ? 'bg-orange-500/20 text-orange-400' :
                'bg-zinc-700 text-zinc-400'
              }`}>
                {i === 0 ? <Trophy size={18} /> : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold">{e.name}</span>
                  <span className="text-xs text-zinc-500">· {e.role}</span>
                  {e.rating >= targets.ratingTarget && <Award size={14} className="text-amber-400" />}
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-400 mt-1">
                  <span>Sales: <span className="text-white">${e.sales.toLocaleString()}</span></span>
                  <span>Covers: <span className="text-white">{e.covers}</span></span>
                  <span>Rating: <span className="text-white">{e.rating.toFixed(1)}★</span></span>
                  <span>Avg tip: <span className="text-white">{e.tipsAvg}%</span></span>
                </div>
                <div className="h-1.5 bg-seat-black rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-seat-red transition-all" style={{ width: `${salesHitPct}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
