'use client';

import { useState, useMemo, useEffect } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { Button } from '@/components/ui/button';
import { formatDate, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Star, Check, Edit3, Trash2, Sparkles } from 'lucide-react';
import { ReviewImportPanel } from '@/components/dashboard/review-import-panel';

interface Review {
  id: string;
  platform: string;
  author: string;
  rating: number;
  text: string;
  response_text?: string;
  response_status: 'posted' | 'pending_approval' | 'none';
  responded_at?: string;
  created_at: string;
}

const INITIAL_REVIEWS: Review[] = [
  {
    id: 'r1',
    platform: 'Google',
    author: 'Sarah K.',
    rating: 5,
    text: 'Amazing food and service! The filet mignon was perfectly cooked. Will definitely be back.',
    response_text: "Thank you, Sarah! We can't wait to welcome you back.",
    response_status: 'posted',
    responded_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'r2',
    platform: 'Yelp',
    author: 'Mike D.',
    rating: 4,
    text: 'Great food but service was a bit slow on Saturday night. Still a great experience overall.',
    response_status: 'none',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'r3',
    platform: 'Google',
    author: 'Priya S.',
    rating: 2,
    text: 'Disappointed with the portion sizes for the price. Food was okay but not worth it.',
    response_text: "We're so sorry to hear this, Priya. We'd love to make it right — please reach out to us directly.",
    response_status: 'pending_approval',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'r4',
    platform: 'TripAdvisor',
    author: 'Carlos R.',
    rating: 5,
    text: 'Best dining experience in the neighborhood. The chef came out to say hi, loved every minute.',
    response_status: 'none',
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
];

export default function ReviewsPage() {
  // Source of truth = the `reviews` table in Supabase (populated by Yelp/Google imports + responses).
  // Seed with demo rows so the page doesn't flash empty on first load.
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/reviews')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.reviews) return;
        if (data.reviews.length === 0) return; // keep seed data if the table is truly empty
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: Review[] = data.reviews.map((r: any) => ({
          id: r.review_id || r.id,
          platform: r.platform || 'google',
          author: r.author || 'Anonymous',
          rating: r.rating || 0,
          text: r.text || '',
          response_text: r.response_text || undefined,
          response_status:
            r.response_status === 'posted' ? 'posted'
            : r.response_status === 'pending_approval' ? 'pending_approval'
            : 'none',
          responded_at: r.responded_at || undefined,
          created_at: r.review_date || r.created_at,
        }));
        setReviews(mapped);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const update = (id: string, patch: Partial<Review>) => {
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  const remove = (id: string) => {
    setReviews((prev) => prev.filter((r) => r.id !== id));
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');

  const stats = useMemo(() => {
    const total = reviews.length;
    const avg = total > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1) : '--';
    const responded = reviews.filter((r) => r.response_status === 'posted').length;
    const rate = total > 0 ? Math.round((responded / total) * 100) : 0;
    const now = new Date();
    const thisMonth = reviews.filter((r) => {
      const d = new Date(r.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return { avg_rating: avg, total, response_rate: rate, this_month: thisMonth };
  }, [reviews]);

  const filtered = useMemo(() => {
    let list = reviews;
    if (filter !== 'all') list = list.filter((r) => r.response_status === filter);
    if (ratingFilter !== 'all') list = list.filter((r) => r.rating === parseInt(ratingFilter));
    return list;
  }, [reviews, filter, ratingFilter]);

  function generateAIResponse(r: Review) {
    const sentiment = r.rating >= 4 ? 'positive' : r.rating === 3 ? 'neutral' : 'negative';
    const templates: Record<string, string> = {
      positive: `Thank you so much, ${r.author.split(' ')[0]}! We're thrilled you enjoyed your visit and we can't wait to see you again.`,
      neutral: `Hi ${r.author.split(' ')[0]}, thanks for the feedback. We're always working to improve and we'd love to hear more about your experience.`,
      negative: `Hi ${r.author.split(' ')[0]}, we're sorry your experience didn't meet expectations. Please reach out to us directly so we can make it right.`,
    };
    const response = templates[sentiment];
    update(r.id, { response_text: response, response_status: 'pending_approval' });
    setEditingId(r.id);
    setEditText(response);
    toast.success('AI response generated');
  }

  function markResponded(id: string, text: string) {
    update(id, { response_text: text, response_status: 'posted', responded_at: new Date().toISOString() });
    setEditingId(null);
    toast.success('Response posted');
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this review?')) return;
    remove(id);
    toast.success('Review deleted');
  }

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} size={14} className={i < rating ? 'text-red-500 fill-red-500' : 'text-zinc-600'} />
    ));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Reviews</h1>
      </div>

      <ReviewImportPanel onComplete={() => window.location.reload()} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Average Rating" value={stats.avg_rating} />
        <MetricCard title="Total Reviews" value={stats.total} />
        <MetricCard title="Response Rate" value={`${stats.response_rate}%`} />
        <MetricCard title="This Month" value={stats.this_month} />
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-6">
        <span className="text-xs text-zinc-500 mr-1">Status:</span>
        {[
          { v: 'all', l: 'All' },
          { v: 'none', l: 'Not Responded' },
          { v: 'pending_approval', l: 'Pending' },
          { v: 'posted', l: 'Responded' },
        ].map((f) => (
          <button
            key={f.v}
            onClick={() => setFilter(f.v)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', filter === f.v ? 'bg-seat-red text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white')}
          >
            {f.l}
          </button>
        ))}
        <span className="text-xs text-zinc-500 mx-2">Rating:</span>
        {['all', '5', '4', '3', '2', '1'].map((r) => (
          <button
            key={r}
            onClick={() => setRatingFilter(r)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', ratingFilter === r ? 'bg-seat-red text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white')}
          >
            {r === 'all' ? 'All' : `${r}★`}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-400">
            No reviews match this filter.
          </div>
        ) : (
          filtered.map((review) => (
            <div key={review.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium">{review.author}</span>
                    <div className="flex gap-0.5">{renderStars(review.rating)}</div>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {formatDate(review.created_at)} via {review.platform}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      review.response_status === 'posted'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : review.response_status === 'pending_approval'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-zinc-500/10 text-zinc-400'
                    }`}
                  >
                    {review.response_status === 'posted'
                      ? 'Responded'
                      : review.response_status === 'pending_approval'
                        ? 'Pending'
                        : 'No Response'}
                  </span>
                  <button onClick={() => handleDelete(review.id)} className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <p className="text-zinc-300 text-sm mb-4">{review.text}</p>

              {review.response_status === 'none' && (
                <div className="border-t border-zinc-800 pt-3">
                  <Button size="sm" variant="cta" onClick={() => generateAIResponse(review)}>
                    <Sparkles size={14} className="mr-1" />
                    Generate Response
                  </Button>
                </div>
              )}

              {review.response_text && (
                <div className="border-t border-zinc-800 pt-3">
                  <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">Response</p>
                  {editingId === review.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="cta" onClick={() => markResponded(review.id, editText)}>
                          <Check size={14} className="mr-1" /> Post Response
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-zinc-300 text-sm">{review.response_text}</p>
                      {review.response_status === 'pending_approval' && (
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="cta" onClick={() => markResponded(review.id, review.response_text!)}>
                            <Check size={14} className="mr-1" /> Mark Responded
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEditingId(review.id);
                              setEditText(review.response_text || '');
                            }}
                          >
                            <Edit3 size={14} className="mr-1" /> Edit
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
