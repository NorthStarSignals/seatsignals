'use client';

import { useState } from 'react';
import Link from 'next/link';

const PREVIEW_URL = 'https://foundry-worker.fly.dev/demo/seatsignals-preview';

// Foundry ingest token for the SeatSignals demo capture sheet
// (sheet_id 39cbcab3-13e9-4a67-bd02-6b77b5543a40).
const CAPTURE_TOKEN = '7ac0c35ae2d54ab78135e600f68134fc';

type Review = {
  id: string;
  author_name: string;
  author_image_url: string;
  rating: number;
  text: string;
  published_at: string;
  owner_response: string | null;
  owner_responded_at: string | null;
};

type Place = {
  name: string;
  address: string;
  total_score: number | null;
  reviews_count: number | null;
  url: string;
  category: string | null;
};

type HeadlineSignal = {
  kind: 'good' | 'warn';
  headline: string;
  detail: string;
};

type Analysis = {
  review_count_analyzed: number;
  avg_rating: number;
  by_rating: Record<string, number>;
  owner_response_rate_pct: number;
  low_rating_count: number;
  low_rating_pct: number;
  headline_signals: HeadlineSignal[];
};

type PreviewResponse = {
  ok: boolean;
  place?: Place;
  reviews?: Review[];
  analysis?: Analysis;
  error?: string;
  hint?: string;
};

export default function DemoPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showGate, setShowGate] = useState(false);
  const [captureForm, setCaptureForm] = useState({
    name: '',
    email: '',
    company: '',
    title: '',
  });
  const [captureSubmitting, setCaptureSubmitting] = useState(false);
  const [captureDone, setCaptureDone] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  async function runPreview(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setShowGate(false);
    setCaptureDone(false);
    try {
      const r = await fetch(PREVIEW_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, max_reviews: 30 }),
      });
      const j: PreviewResponse = await r.json();
      if (!j.ok) {
        setError(j.hint || j.error || "We couldn't pull reviews for that one.");
      } else {
        setResult(j);
        setCaptureForm((f) => ({ ...f, company: j.place?.name || query }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function submitCapture(e: React.FormEvent) {
    e.preventDefault();
    setCaptureSubmitting(true);
    setCaptureError(null);
    try {
      const r = await fetch(`https://foundry-worker.fly.dev/ingest/${CAPTURE_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...captureForm,
          offering: 'SeatSignals',
          source_demo: 'seatsignals-preview',
          looked_up_restaurant: result?.place?.name || query,
          avg_rating: result?.analysis?.avg_rating,
          submitted_at: new Date().toISOString(),
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setCaptureDone(true);
    } catch {
      setCaptureError('Something went wrong. Email hello@seatsignals.app directly.');
    } finally {
      setCaptureSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-seat-black text-white">
      <nav className="border-b border-zinc-800 backdrop-blur-sm bg-seat-black/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Seat<span className="text-seat-red">Signals</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <Link href="/#features" className="text-zinc-400 hover:text-white transition">Features</Link>
            <Link href="/#pillars" className="text-zinc-400 hover:text-white transition">Platform</Link>
            <Link href="/#integrations" className="text-zinc-400 hover:text-white transition">Integrations</Link>
            <Link href="/pricing" className="text-zinc-400 hover:text-white transition">Pricing</Link>
            <Link href="/changelog" className="text-zinc-400 hover:text-white transition">Changelog</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-sm text-zinc-400 hover:text-white transition">Sign in</Link>
            <Link href="/sign-up" className="px-4 py-2 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg text-sm font-medium">Start free</Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <header className="mb-10">
          <div className="text-xs uppercase tracking-[0.2em] text-seat-red mb-3">
            Live preview
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            See your restaurant on SeatSignals
          </h1>
          <p className="text-lg text-zinc-300 leading-relaxed">
            Drop in your restaurant. We pull your real Google reviews and show you what
            SeatSignals would surface to your team — what to respond to, what to celebrate,
            what&apos;s slipping. 60 seconds, no signup.
          </p>
        </header>

        <form
          onSubmit={runPreview}
          className="rounded-xl border border-zinc-800 bg-seat-card p-6 mb-10"
        >
          <label htmlFor="restaurant" className="block text-sm font-semibold mb-2 text-white">
            Restaurant name + city (or paste a Google Maps URL)
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="restaurant"
              type="text"
              placeholder="e.g. Joe's Pizza Brooklyn NY"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              required
              minLength={3}
              disabled={loading}
              className="flex-1 rounded-lg border border-zinc-800 bg-seat-dark px-4 py-3 text-white placeholder:text-zinc-500 focus:border-seat-red focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || query.length < 3}
              className="rounded-lg bg-seat-red hover:bg-seat-red/90 px-6 py-3 font-semibold text-white transition disabled:opacity-40"
            >
              {loading ? 'Pulling reviews…' : 'Show me'}
            </button>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Reviews are pulled from your public Google Business Profile. Takes about 60
            seconds the first time.
          </p>
        </form>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-zinc-300 mb-8">
            {error}
          </div>
        )}

        {result?.place && result?.analysis && result?.reviews && (
          <Dashboard
            place={result.place}
            analysis={result.analysis}
            reviews={result.reviews}
            showGate={showGate}
            onSeeMore={() => setShowGate(true)}
            captureForm={captureForm}
            setCaptureForm={setCaptureForm}
            submitCapture={submitCapture}
            captureSubmitting={captureSubmitting}
            captureDone={captureDone}
            captureError={captureError}
          />
        )}

        <footer className="mt-20 pt-8 border-t border-zinc-800 text-sm text-zinc-500 flex flex-wrap gap-4 justify-between">
          <Link href="/" className="hover:text-white transition">
            seatsignals.app
          </Link>
          <a href="mailto:hello@seatsignals.app" className="hover:text-white transition">
            hello@seatsignals.app
          </a>
        </footer>
      </main>
    </div>
  );
}

function Dashboard({
  place,
  analysis,
  reviews,
  showGate,
  onSeeMore,
  captureForm,
  setCaptureForm,
  submitCapture,
  captureSubmitting,
  captureDone,
  captureError,
}: {
  place: Place;
  analysis: Analysis;
  reviews: Review[];
  showGate: boolean;
  onSeeMore: () => void;
  captureForm: { name: string; email: string; company: string; title: string };
  setCaptureForm: React.Dispatch<
    React.SetStateAction<{ name: string; email: string; company: string; title: string }>
  >;
  submitCapture: (e: React.FormEvent) => void;
  captureSubmitting: boolean;
  captureDone: boolean;
  captureError: string | null;
}) {
  return (
    <section>
      {/* Place header */}
      <div className="rounded-xl border border-zinc-800 bg-seat-card p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-2">
              Live preview for
            </div>
            <h2 className="text-2xl font-bold mb-1">{place.name}</h2>
            <p className="text-sm text-zinc-500">
              {place.address}
              {place.category ? ` · ${place.category}` : ''}
            </p>
          </div>
          <div className="sm:text-right">
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-2">
              Google rating
            </div>
            <div className="flex items-baseline sm:justify-end gap-2">
              <span className="text-4xl font-bold text-white">
                {(place.total_score ?? analysis.avg_rating).toFixed(1)}
              </span>
              <span className="text-sm text-zinc-500">/ 5</span>
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {(place.reviews_count ?? analysis.review_count_analyzed).toLocaleString()} reviews on Google
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">
              analyzed the {analysis.review_count_analyzed} most recent
            </div>
          </div>
        </div>
      </div>

      {/* Headline signals */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        {analysis.headline_signals.map((s, i) => (
          <SignalCard key={i} signal={s} />
        ))}
      </div>

      {/* Rating distribution */}
      <div className="rounded-xl border border-zinc-800 bg-seat-card p-6 mb-6">
        <div className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-4">
          Recent rating mix
        </div>
        <RatingBars by_rating={analysis.by_rating} />
      </div>

      {/* Reviews list — first 5 visible, rest behind email gate */}
      <div className="rounded-xl border border-zinc-800 bg-seat-card p-6 mb-6">
        <div className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-4">
          Recent reviews
        </div>
        <div className="space-y-4">
          {reviews.slice(0, 5).map((r) => (
            <ReviewRow key={r.id} review={r} />
          ))}
        </div>

        {reviews.length > 5 && !captureDone && (
          <div className="mt-6 pt-6 border-t border-zinc-800">
            {!showGate ? (
              <div className="text-center">
                <p className="text-sm text-zinc-300 mb-4">
                  +{reviews.length - 5} more reviews. Plus auto-drafted responses, sentiment
                  trends, repeat-customer detection, and the rest of the SeatSignals dashboard.
                </p>
                <button
                  onClick={onSeeMore}
                  className="rounded-lg bg-seat-red hover:bg-seat-red/90 px-6 py-3 font-semibold text-white transition"
                >
                  See the full SeatSignals dashboard →
                </button>
              </div>
            ) : (
              <CaptureForm
                form={captureForm}
                setForm={setCaptureForm}
                onSubmit={submitCapture}
                submitting={captureSubmitting}
                error={captureError}
              />
            )}
          </div>
        )}

        {captureDone && (
          <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
            <div className="text-xs uppercase tracking-[0.2em] text-emerald-400 mb-2">
              On its way
            </div>
            <h3 className="text-xl font-bold mb-2">
              Walkthrough inbound within one business day.
            </h3>
            <p className="text-sm text-zinc-300">
              We&apos;ll set up a 30-minute live demo on your real data and walk through what
              your team would see every morning.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function SignalCard({ signal }: { signal: HeadlineSignal }) {
  const colors =
    signal.kind === 'good'
      ? 'border-emerald-500/30 bg-emerald-500/5'
      : 'border-amber-500/30 bg-amber-500/5';
  const titleColor = signal.kind === 'good' ? 'text-emerald-400' : 'text-amber-400';
  return (
    <div className={`rounded-xl border ${colors} p-5`}>
      <div className={`font-bold mb-2 ${titleColor}`}>{signal.headline}</div>
      <p className="text-sm text-zinc-300 leading-relaxed">{signal.detail}</p>
    </div>
  );
}

function RatingBars({ by_rating }: { by_rating: Record<string, number> }) {
  const max = Math.max(...Object.values(by_rating), 1);
  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = by_rating[star.toString()] || 0;
        const pct = (count / max) * 100;
        return (
          <div key={star} className="flex items-center gap-3">
            <span className="w-6 text-xs text-zinc-500 font-mono">{star}★</span>
            <div className="flex-1 h-3 rounded-full bg-seat-dark overflow-hidden">
              <div
                className="h-full bg-seat-red rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-8 text-right text-xs text-zinc-500 font-mono">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function ReviewRow({ review }: { review: Review }) {
  const stars = '★★★★★'.substring(0, Math.max(0, Math.min(5, review.rating)));
  const dim = '★★★★★'.substring(stars.length);
  return (
    <div className="rounded-lg border border-zinc-800 bg-seat-dark p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{review.author_name}</span>
          <span className="text-xs text-zinc-500">
            <span className="text-seat-red">{stars}</span>
            <span className="opacity-30">{dim}</span>
          </span>
        </div>
        {review.owner_response ? (
          <span className="text-xs px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 font-semibold">
            Replied
          </span>
        ) : (
          <span className="text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-400 font-semibold">
            Needs reply
          </span>
        )}
      </div>
      <p className="text-sm text-zinc-300 leading-relaxed line-clamp-3">{review.text}</p>
    </div>
  );
}

function CaptureForm({
  form,
  setForm,
  onSubmit,
  submitting,
  error,
}: {
  form: { name: string; email: string; company: string; title: string };
  setForm: React.Dispatch<
    React.SetStateAction<{ name: string; email: string; company: string; title: string }>
  >;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  error: string | null;
}) {
  const F = (
    label: string,
    key: keyof typeof form,
    type = 'text',
    autoComplete?: string
  ) => (
    <div>
      <label htmlFor={key} className="block text-xs font-semibold mb-1.5 text-zinc-300">
        {label}
      </label>
      <input
        id={key}
        type={type}
        required
        autoComplete={autoComplete}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        disabled={submitting}
        className="w-full rounded-lg border border-zinc-800 bg-seat-dark px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-seat-red focus:outline-none"
      />
    </div>
  );
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {F('Your name', 'name', 'text', 'name')}
        {F('Work email', 'email', 'email', 'email')}
        {F('Restaurant', 'company', 'text', 'organization')}
        {F('Your role', 'title', 'text', 'organization-title')}
      </div>
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-zinc-300">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-seat-red hover:bg-seat-red/90 px-6 py-3 font-semibold text-white transition disabled:opacity-40"
      >
        {submitting ? 'Sending…' : 'Show me the full dashboard'}
      </button>
    </form>
  );
}
