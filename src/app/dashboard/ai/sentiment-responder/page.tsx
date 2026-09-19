'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { MetricCard } from '@/components/ui/metric-card';
import { Sparkles, MessageSquare, ThumbsUp, ThumbsDown, Copy, RefreshCw, Loader2 } from 'lucide-react';

interface Review {
  review_id: string;
  platform: string;
  author: string;
  rating: number;
  text: string;
  response_text?: string | null;
  response_status?: string;
  review_date?: string | null;
  created_at: string;
}

const tones = ['Warm', 'Professional', 'Apologetic', 'Grateful', 'Casual'];

function classifySentiment(rating: number): 'positive' | 'negative' | 'mixed' {
  if (rating >= 4) return 'positive';
  if (rating <= 2) return 'negative';
  return 'mixed';
}

export default function SentimentResponderPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selected, setSelected] = useState<Review | null>(null);
  const [tone, setTone] = useState('Warm');
  const [generated, setGenerated] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetch('/api/reviews')
      .then((r) => r.json())
      .then((data) => {
        const list: Review[] = (data?.reviews || []).slice(0, 20);
        setReviews(list);
        if (list.length > 0) setSelected(list[0]);
      })
      .catch(() => toast.error('Failed to load reviews'))
      .finally(() => setFetching(false));
  }, []);

  const stats = (() => {
    const total = reviews.length;
    const responded = reviews.filter((r) => r.response_status === 'posted' || r.response_status === 'pending_approval').length;
    const avg = total > 0 ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / total).toFixed(1) : '—';
    const negatives = reviews.filter((r) => r.rating <= 2).length;
    return { total, responded, avg, negatives };
  })();

  const generateResponse = async () => {
    if (!selected) return;
    setLoading(true);
    setGenerated('');
    try {
      const res = await fetch('/api/reviews/generate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_id: selected.review_id, tone }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || 'Failed to generate');
      }
      const data = await res.json();
      setGenerated(data.response_text || '');
      toast.success('Response generated');
      setReviews((prev) =>
        prev.map((r) =>
          r.review_id === selected.review_id
            ? { ...r, response_text: data.response_text, response_status: 'pending_approval' }
            : r
        )
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Generate failed');
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    if (!generated) return;
    navigator.clipboard.writeText(generated);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">AI Sentiment Responder</h1>
        <p className="text-seat-muted mt-1">Generate tone-perfect responses to any review in seconds, powered by Claude + your brand voice</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Loaded Reviews" value={stats.total} />
        <MetricCard title="Avg Rating" value={stats.avg} subtitle="out of 5" />
        <MetricCard title="Already Responded" value={stats.responded} />
        <MetricCard title="Needs Attention" value={stats.negatives} subtitle="rated ≤ 2" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-seat-card border border-seat-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-seat-red" />
            Your Recent Reviews
          </h3>
          {fetching ? (
            <div className="text-sm text-zinc-500 flex items-center gap-2 py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading reviews from the database…
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-sm text-zinc-500 text-center py-8">
              No reviews yet. <a href="/dashboard/reviews" className="text-seat-red hover:underline">Import from Yelp or Google →</a>
            </div>
          ) : (
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {reviews.map((r) => {
                const sentiment = classifySentiment(r.rating);
                return (
                  <button
                    key={r.review_id}
                    onClick={() => { setSelected(r); setGenerated(''); }}
                    className={`w-full text-left p-4 rounded-lg border transition ${
                      selected?.review_id === r.review_id
                        ? 'bg-seat-red/10 border-seat-red'
                        : 'bg-seat-black border-seat-border hover:border-seat-red/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{r.author}</span>
                        <span className="text-seat-muted text-xs uppercase">{r.platform}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {sentiment === 'positive' && <ThumbsUp className="w-4 h-4 text-green-500" />}
                        {sentiment === 'negative' && <ThumbsDown className="w-4 h-4 text-red-500" />}
                        <span className="text-yellow-500 text-sm">{'★'.repeat(r.rating)}</span>
                      </div>
                    </div>
                    <p className="text-sm text-seat-muted line-clamp-2">{r.text}</p>
                    {r.response_text && (
                      <div className="mt-2 text-[11px] text-green-400">✓ already has a response</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-seat-card border border-seat-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-seat-red" />
            AI Response Generator
          </h3>

          {!selected ? (
            <p className="text-sm text-zinc-500">Select a review on the left to generate a response.</p>
          ) : (
            <>
              <div className="mb-4">
                <label className="text-sm text-seat-muted mb-2 block">Selected Review</label>
                <div className="bg-seat-black border border-seat-border rounded-lg p-3 text-sm text-white">
                  <div className="text-xs text-zinc-500 mb-1">
                    {selected.author} · {selected.rating}★ · {selected.platform}
                  </div>
                  {selected.text}
                </div>
              </div>

              <div className="mb-4">
                <label className="text-sm text-seat-muted mb-2 block">Response Tone</label>
                <div className="flex flex-wrap gap-2">
                  {tones.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                        tone === t
                          ? 'bg-seat-red border-seat-red text-white'
                          : 'bg-seat-black border-seat-border text-seat-muted hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={generateResponse}
                disabled={loading}
                className="w-full bg-seat-red hover:bg-seat-red/90 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {loading ? 'Generating with Claude…' : 'Generate Response'}
              </button>

              {generated && (
                <div className="mt-4">
                  <label className="text-sm text-seat-muted mb-2 block">Generated Response</label>
                  <div className="bg-seat-black border border-seat-border rounded-lg p-4 text-sm text-white whitespace-pre-wrap">
                    {generated}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={copy}
                      className="flex-1 bg-seat-black border border-seat-border hover:border-seat-red text-white py-2 rounded-lg text-sm flex items-center justify-center gap-2"
                    >
                      <Copy className="w-4 h-4" /> Copy
                    </button>
                    <button
                      onClick={generateResponse}
                      className="flex-1 bg-seat-black border border-seat-border hover:border-seat-red text-white py-2 rounded-lg text-sm flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" /> Regenerate
                    </button>
                  </div>
                </div>
              )}

              {selected.response_text && !generated && (
                <div className="mt-4 bg-zinc-900/50 border border-seat-border/50 rounded-lg p-3">
                  <div className="text-xs text-zinc-500 mb-1">Previously saved response</div>
                  <div className="text-xs text-zinc-400 whitespace-pre-wrap">{selected.response_text}</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
