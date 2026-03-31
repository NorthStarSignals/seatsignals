'use client';

import { useState, useEffect } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Star, Check, Edit3 } from 'lucide-react';

interface Review {
  review_id: string;
  platform: string;
  author: string;
  rating: number;
  text: string;
  response_text?: string;
  response_status: string;
  responded_at?: string;
  created_at: string;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState({ avg_rating: '--', total: 0, response_rate: 0, this_month: 0 });
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const fetchReviews = async () => {
    const res = await fetch('/api/reviews');
    if (res.ok) {
      const data = await res.json();
      setReviews(data.reviews);
      setStats(data.stats);
    }
    setLoading(false);
  };

  useEffect(() => { fetchReviews(); }, []);

  const [generating, setGenerating] = useState(false);

  const generateTestReviews = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/reviews/generate', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Generated ${data.count} test reviews with AI responses`);
        fetchReviews();
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.error === 'No restaurant') {
          toast.error('Complete onboarding first — set up your restaurant profile in Settings.');
        } else {
          toast.error('Failed to generate reviews');
        }
      }
    } catch {
      toast.error('Failed to generate reviews');
    } finally {
      setGenerating(false);
    }
  };

  const approveResponse = async (reviewId: string, text: string) => {
    const res = await fetch('/api/reviews/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ review_id: reviewId, response_text: text }),
    });
    if (res.ok) {
      toast.success('Response posted');
      setEditingId(null);
      fetchReviews();
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        size={14}
        className={i < rating ? 'text-accent-amber fill-accent-amber' : 'text-slate-600'}
      />
    ));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Reviews</h1>
        <Button variant="secondary" size="sm" onClick={generateTestReviews} disabled={generating}>
          {generating ? 'Generating...' : 'Generate Test Reviews'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Average Rating" value={stats.avg_rating} />
        <MetricCard title="Total Reviews" value={stats.total} />
        <MetricCard title="Response Rate" value={`${stats.response_rate}%`} />
        <MetricCard title="This Month" value={stats.this_month} />
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-8 text-center text-slate-400">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-8 text-center text-slate-400">
            No reviews yet. Click &quot;Generate Test Reviews&quot; to simulate reviews, or connect your Google Business Profile in Settings.
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.review_id} className="bg-navy-800 border border-navy-700 rounded-xl p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium">{review.author}</span>
                    <div className="flex gap-0.5">{renderStars(review.rating)}</div>
                  </div>
                  <p className="text-xs text-slate-500">{formatDate(review.created_at)} via {review.platform}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  review.response_status === 'posted'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : review.response_status === 'pending_approval'
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-slate-500/10 text-slate-400'
                }`}>
                  {review.response_status === 'posted' ? 'Responded' : review.response_status === 'pending_approval' ? 'Pending Approval' : 'No Response'}
                </span>
              </div>

              <p className="text-slate-300 text-sm mb-4">{review.text}</p>

              {review.response_text && (
                <div className="border-t border-navy-700 pt-3">
                  <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">AI Response</p>
                  {editingId === review.review_id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        className="w-full bg-navy-700 border border-navy-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="cta" onClick={() => approveResponse(review.review_id, editText)}>
                          <Check size={14} className="mr-1" /> Post Response
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-slate-300 text-sm">{review.response_text}</p>
                      {review.response_status === 'pending_approval' && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="cta"
                            onClick={() => approveResponse(review.review_id, review.response_text!)}
                          >
                            <Check size={14} className="mr-1" /> Approve & Post
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => { setEditingId(review.review_id); setEditText(review.response_text || ''); }}
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
