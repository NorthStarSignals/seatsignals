import Link from 'next/link';
import { Sparkles, Tag, Bug, Wrench } from 'lucide-react';
import { createServerSupabase } from '@/lib/supabase';

export const metadata = {
  title: 'What\'s new · SeatSignals',
  description: 'Recent releases, features, and improvements.',
};

// Fully dynamic so new entries show immediately without a redeploy.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Entry {
  id: string;
  version: string;
  title: string;
  description: string;
  category: string;
  published_at: string;
}

const CATEGORY_CONFIG: Record<string, { icon: typeof Sparkles; color: string; label: string }> = {
  feature: { icon: Sparkles, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', label: 'Feature' },
  improvement: { icon: Wrench, color: 'text-green-400 bg-green-500/10 border-green-500/20', label: 'Improvement' },
  fix: { icon: Bug, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'Fix' },
  release: { icon: Tag, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', label: 'Release' },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default async function ChangelogPage() {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from('changelog_entries')
    .select('*')
    .order('published_at', { ascending: false });

  const entries = (data || []) as Entry[];

  return (
    <div className="min-h-screen bg-seat-black text-white">
      <nav className="border-b border-zinc-800 py-4 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Seat<span className="text-seat-red">Signals</span>
          </Link>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/pricing" className="text-zinc-400 hover:text-white transition">Pricing</Link>
            <Link href="/sign-up" className="px-3 py-1.5 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg">
              Start free
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-seat-red/10 border border-seat-red/30 rounded-full text-xs text-seat-red mb-4">
            <Sparkles className="w-3 h-3" />
            <span>What&apos;s new</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Shipping weekly
          </h1>
          <p className="text-lg text-zinc-400">
            Every release, every fix, every new integration. No marketing fluff.
          </p>
        </div>

        {entries.length === 0 ? (
          <p className="text-zinc-500 py-12 text-center">No entries yet.</p>
        ) : (
          <div className="space-y-8">
            {entries.map((e) => {
              const cfg = CATEGORY_CONFIG[e.category] || CATEGORY_CONFIG.feature;
              const Icon = cfg.icon;
              return (
                <article
                  key={e.id}
                  className="relative pl-6 border-l border-zinc-800 pb-2"
                >
                  <div className="absolute -left-[7px] top-1 w-[13px] h-[13px] rounded-full bg-seat-black border-2 border-seat-red" />
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.color}`}>
                      <Icon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                    <span className="text-xs text-zinc-500">v{e.version}</span>
                    <span className="text-xs text-zinc-600">·</span>
                    <span className="text-xs text-zinc-500">{formatDate(e.published_at)}</span>
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-2">{e.title}</h2>
                  <p className="text-zinc-400 leading-relaxed">{e.description}</p>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-900 py-8 mt-16">
        <div className="max-w-3xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
          <div>© 2026 SeatSignals. All rights reserved.</div>
          <div className="flex items-center gap-5">
            <Link href="/pricing" className="hover:text-white transition">Pricing</Link>
            <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
