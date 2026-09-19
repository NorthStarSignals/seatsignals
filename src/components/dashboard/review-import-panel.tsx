'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Download, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

type Platform = 'yelp' | 'google';

interface ImportRow {
  id: string;
  platform: Platform;
  source_url: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  reviews_imported: number;
  reviews_duplicate: number;
  error_message?: string | null;
  started_at: string;
  completed_at?: string | null;
}

/**
 * Panel for kicking off Yelp / Google Maps review imports.
 * Shows URL inputs + progress. Polls the import endpoint until complete.
 */
export function ReviewImportPanel({ onComplete }: { onComplete?: () => void }) {
  const [yelpUrl, setYelpUrl] = useState('');
  const [googleUrl, setGoogleUrl] = useState('');
  const [active, setActive] = useState<ImportRow | null>(null);
  const [loading, setLoading] = useState<Platform | null>(null);

  // Load previously saved URLs from the restaurant record
  useEffect(() => {
    fetch('/api/restaurant')
      .then((r) => r.json())
      .then((data) => {
        if (data?.yelp_url) setYelpUrl(data.yelp_url);
        if (data?.google_maps_url) setGoogleUrl(data.google_maps_url);
      })
      .catch(() => {});
  }, []);

  // Poll while an import is running
  useEffect(() => {
    if (!active || active.status === 'completed' || active.status === 'failed') return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/reviews/import?id=${active.id}`);
        if (!res.ok) return;
        const updated: ImportRow = await res.json();
        setActive(updated);
        if (updated.status === 'completed') {
          toast.success(`Imported ${updated.reviews_imported} reviews`);
          clearInterval(interval);
          onComplete?.();
        } else if (updated.status === 'failed') {
          toast.error(`Import failed: ${updated.error_message || 'unknown error'}`);
          clearInterval(interval);
        }
      } catch {
        // keep polling
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [active, onComplete]);

  const kickoff = async (platform: Platform) => {
    const url = platform === 'yelp' ? yelpUrl : googleUrl;
    if (!url.trim()) {
      toast.error('Paste a URL first');
      return;
    }
    setLoading(platform);
    try {
      const res = await fetch('/api/reviews/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, url, maxReviews: 100 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || 'Import failed');
      }
      const data = await res.json();
      toast.success(`Started — this takes 1-3 min. Live updates below.`);
      setActive({
        id: data.importId,
        platform,
        source_url: url,
        status: 'running',
        reviews_imported: 0,
        reviews_duplicate: 0,
        started_at: new Date().toISOString(),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-seat-card border border-seat-border rounded-xl p-5 mb-5">
      <div className="flex items-center gap-2 mb-1">
        <Download className="w-4 h-4 text-seat-red" />
        <h3 className="text-sm font-semibold text-white">Import reviews</h3>
      </div>
      <p className="text-xs text-zinc-500 mb-4">
        Paste your restaurant&apos;s Yelp or Google Maps URL. We&apos;ll pull the last 100 reviews automatically.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Yelp */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5 block">
            Yelp business URL
          </label>
          <div className="flex gap-2">
            <input
              value={yelpUrl}
              onChange={(e) => setYelpUrl(e.target.value)}
              placeholder="https://www.yelp.com/biz/..."
              className="flex-1 bg-seat-black border border-seat-border rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-seat-red"
            />
            <button
              onClick={() => kickoff('yelp')}
              disabled={loading === 'yelp' || !yelpUrl.trim()}
              className="px-3 py-2 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg text-xs font-medium disabled:opacity-50 whitespace-nowrap"
            >
              {loading === 'yelp' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Import'}
            </button>
          </div>
        </div>

        {/* Google */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5 block">
            Google Maps URL
          </label>
          <div className="flex gap-2">
            <input
              value={googleUrl}
              onChange={(e) => setGoogleUrl(e.target.value)}
              placeholder="https://www.google.com/maps/place/..."
              className="flex-1 bg-seat-black border border-seat-border rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-seat-red"
            />
            <button
              onClick={() => kickoff('google')}
              disabled={loading === 'google' || !googleUrl.trim()}
              className="px-3 py-2 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg text-xs font-medium disabled:opacity-50 whitespace-nowrap"
            >
              {loading === 'google' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Import'}
            </button>
          </div>
        </div>
      </div>

      {active && (
        <div
          className={`mt-4 p-3 rounded-lg border text-xs flex items-center gap-2 ${
            active.status === 'completed'
              ? 'bg-green-500/5 border-green-500/30 text-green-400'
              : active.status === 'failed'
                ? 'bg-red-500/5 border-red-500/30 text-red-400'
                : 'bg-amber-500/5 border-amber-500/30 text-amber-400'
          }`}
        >
          {active.status === 'completed' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : active.status === 'failed' ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <RefreshCw className="w-4 h-4 animate-spin" />
          )}
          <span>
            {active.status === 'completed'
              ? `Done — imported ${active.reviews_imported} new reviews from ${active.platform}.`
              : active.status === 'failed'
                ? `${active.platform} import failed: ${active.error_message}`
                : `${active.platform} scrape in progress… (takes 1-3 min)`}
          </span>
        </div>
      )}

      <div className="text-[10px] text-zinc-600 mt-3">
        Powered by Apify. First import may take 2-3 minutes. Subsequent syncs are incremental.
      </div>
    </div>
  );
}
