'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Tag, Bug, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  description: string;
  type: string;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: typeof Sparkles; color: string; label: string }> = {
  feature: { icon: Sparkles, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', label: 'Feature' },
  improvement: { icon: Wrench, color: 'text-green-400 bg-green-500/10 border-green-500/20', label: 'Improvement' },
  fix: { icon: Bug, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'Fix' },
  release: { icon: Tag, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', label: 'Release' },
};

export default function ChangelogPage() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/changelog');
      if (res.ok) setEntries(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = filter === 'all' ? entries : entries.filter(e => e.type === filter);
  const types = Array.from(new Set(entries.map(e => e.type)));

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-800 rounded w-48" />
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-zinc-800/50 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">What&apos;s New</h1>
        <p className="text-sm text-zinc-500 mt-1">Latest updates and improvements to SeatSignals</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
            filter === 'all' ? 'bg-white text-black border-white' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
          )}
        >
          All
        </button>
        {types.map(t => {
          const config = TYPE_CONFIG[t] || TYPE_CONFIG.feature;
          return (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                filter === t ? 'bg-white text-black border-white' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              )}
            >
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {filtered.map((entry, i) => {
          const config = TYPE_CONFIG[entry.type] || TYPE_CONFIG.feature;
          const Icon = config.icon;
          return (
            <div key={entry.id} className="relative pl-8 pb-8">
              {/* Timeline line */}
              {i < filtered.length - 1 && (
                <div className="absolute left-3 top-8 w-px h-full bg-zinc-800" />
              )}
              {/* Dot */}
              <div className={cn('absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center border', config.color)}>
                <Icon size={12} />
              </div>

              <div className="bg-seat-card border border-seat-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium border', config.color)}>
                    {config.label}
                  </span>
                  <span className="text-[10px] text-zinc-600 font-mono">v{entry.version}</span>
                  <span className="text-[10px] text-zinc-600 ml-auto">
                    {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{entry.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{entry.description}</p>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <Sparkles size={48} className="mx-auto text-zinc-700 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-1">No Updates</h3>
            <p className="text-sm text-zinc-400">Check back soon for new features</p>
          </div>
        )}
      </div>
    </div>
  );
}
