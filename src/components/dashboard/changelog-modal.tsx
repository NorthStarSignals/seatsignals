'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Tag, Calendar, Check, X } from 'lucide-react';

interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  description: string;
  category: string;
  published_at: string;
}

const LAST_SEEN_KEY = 'seatsignals_changelog_last_seen';

const categoryStyles: Record<string, string> = {
  feature: 'bg-emerald-500/20 text-emerald-400',
  improvement: 'bg-blue-500/20 text-blue-400',
  fix: 'bg-amber-500/20 text-amber-400',
};

export function ChangelogModal() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [hasNew, setHasNew] = useState(false);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/changelog');
      if (res.ok) {
        const data = await res.json();
        setEntries(data);

        const lastSeen = localStorage.getItem(LAST_SEEN_KEY);
        if (data.length > 0) {
          const latestDate = data[0].published_at;
          if (!lastSeen || new Date(latestDate) > new Date(lastSeen)) {
            setHasNew(true);
          }
        }
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleOpen = () => {
    setOpen(true);
    setHasNew(false);
    if (entries.length > 0) {
      localStorage.setItem(LAST_SEEN_KEY, entries[0].published_at);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-seat-card transition-colors"
        title="What's New"
      >
        <Sparkles className="w-5 h-5" />
        {hasNew && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-seat-red rounded-full" />
        )}
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-lg max-h-[80vh] flex flex-col bg-seat-card border border-seat-border rounded-xl shadow-2xl mx-4">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-seat-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-seat-red" />
                <h2 className="text-lg font-semibold text-white">What&apos;s New</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-seat-dark transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable entries */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {entries.map((entry) => (
                <div key={entry.id} className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-seat-red/20 text-seat-red text-xs font-medium">
                      <Tag className="w-3 h-3" />
                      {entry.version}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        categoryStyles[entry.category] || categoryStyles.feature
                      }`}
                    >
                      {entry.category}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                      <Calendar className="w-3 h-3" />
                      {formatDate(entry.published_at)}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-white">{entry.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {entry.description}
                  </p>
                </div>
              ))}
              {entries.length === 0 && (
                <p className="text-sm text-zinc-500 text-center py-8">
                  No changelog entries yet.
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-seat-border">
              <button
                onClick={() => setOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-seat-dark text-white text-sm font-medium hover:bg-seat-border transition-colors"
              >
                <Check className="w-4 h-4" />
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
