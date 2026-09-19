'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { RefreshCw, Database, Trash2, Sparkles, CheckCircle2 } from 'lucide-react';

/**
 * Demo / admin utilities. Not linked from the sidebar — reach it at
 * /dashboard/admin/demo when you need to populate or scrub a demo workspace.
 *
 * Runs against the AUTHENTICATED user's own tenant. No cross-tenant access.
 */
export default function AdminDemoPage() {
  const [seeding, setSeeding] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null);

  const seed = async (reset: boolean) => {
    const setter = reset ? setResetting : setSeeding;
    setter(true);
    try {
      const res = await fetch(
        reset ? '/api/demo/seed-full?reset=true' : '/api/demo/seed-full',
        { method: 'POST' }
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Seed failed');
      toast.success(reset ? 'Reset + reseeded' : 'Seeded');
      setLastResult(body);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setter(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-seat-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Demo data utilities</h1>
          <p className="text-sm text-zinc-500">Populate or scrub your workspace for Gunner&apos;s demos.</p>
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs text-amber-200">
        <strong className="text-amber-100">Heads up:</strong> these actions only affect your own tenant. Clicking Reset wipes all customers, visits, reviews, loyalty data, catering leads, corporate accounts, birthdays, dead hours, and any <code>provider=&apos;demo&apos;</code> POS orders. Real Square-synced orders are left alone.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <Database className="w-5 h-5 text-seat-red mb-3" />
          <h3 className="text-sm font-semibold text-white mb-1">Top up demo data</h3>
          <p className="text-xs text-zinc-500 mb-4">
            Adds 50 customers, 200 visits, 30 reviews, 60 POS orders, loyalty rewards, catering leads, and more. Additive — run multiple times to pile it on.
          </p>
          <Button onClick={() => seed(false)} disabled={seeding} size="sm">
            {seeding ? <><RefreshCw size={14} className="mr-1.5 animate-spin" /> Seeding…</> : 'Add demo data'}
          </Button>
        </div>

        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <Trash2 className="w-5 h-5 text-seat-red mb-3" />
          <h3 className="text-sm font-semibold text-white mb-1">Reset + reseed</h3>
          <p className="text-xs text-zinc-500 mb-4">
            Wipes everything tenant-scoped and seeds a fresh demo workspace. Use between prospect calls.
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              if (confirm('Wipe all tenant data and reseed? This cannot be undone.')) seed(true);
            }}
            disabled={resetting}
            size="sm"
          >
            {resetting ? <><RefreshCw size={14} className="mr-1.5 animate-spin" /> Resetting…</> : 'Reset & reseed'}
          </Button>
        </div>

        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <CheckCircle2 className="w-5 h-5 text-green-400 mb-3" />
          <h3 className="text-sm font-semibold text-white mb-1">What gets seeded</h3>
          <ul className="text-xs text-zinc-400 space-y-1 mt-2">
            <li>• 50 customers + 200 visits</li>
            <li>• 30 reviews (realistic rating curve)</li>
            <li>• 60 POS orders across 21 days</li>
            <li>• 6 loyalty rewards · 20 birthdays</li>
            <li>• 10 catering leads · 5 corporate accts</li>
            <li>• 4 dead-hour slots</li>
          </ul>
        </div>
      </div>

      {lastResult && (
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Last run</h3>
          <pre className="text-[11px] text-zinc-300 overflow-x-auto font-mono bg-seat-black p-3 rounded">
            {JSON.stringify(lastResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
