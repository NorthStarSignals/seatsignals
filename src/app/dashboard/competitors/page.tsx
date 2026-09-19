'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import {
  Eye,
  Plus,
  Trash2,
  Star,
  TrendingUp,
  Brain,
  Sparkles,
  X,
  Loader2,
} from 'lucide-react';

interface Competitor {
  id: string;
  name: string;
  address: string | null;
  cuisine_type: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  yelp_rating: number | null;
  yelp_review_count: number | null;
  price_level: string | null;
  notes: string | null;
  created_at: string;
}

interface RestaurantData {
  name: string;
  cuisine_type: string | null;
  google_rating: number | null;
  google_review_count: number;
  yelp_rating: number | null;
  yelp_review_count: number;
  avg_rating: number | null;
  total_reviews: number;
}

const PRICE_LEVELS = ['$', '$$', '$$$', '$$$$'];

function StarRating({ rating, count, platform }: { rating: number | null; count: number | null; platform: string }) {
  if (rating === null && !count) return <span className="text-zinc-600 text-sm">No data</span>;
  return (
    <div className="flex items-center gap-1.5">
      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
      <span className="text-white text-sm font-medium">{rating ?? '--'}</span>
      <span className="text-zinc-500 text-xs">({count ?? 0})</span>
      <span className="text-zinc-600 text-xs">{platform}</span>
    </div>
  );
}

function PriceBadge({ level }: { level: string | null }) {
  if (!level) return null;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-seat-red/10 text-seat-red">
      {level}
    </span>
  );
}

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: '',
    address: '',
    cuisine_type: '',
    google_rating: '',
    google_review_count: '',
    yelp_rating: '',
    yelp_review_count: '',
    price_level: '',
    notes: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/competitors');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCompetitors(data.competitors);
      setRestaurant(data.restaurant);
    } catch {
      toast.error('Failed to load competitors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          address: form.address || undefined,
          cuisine_type: form.cuisine_type || undefined,
          google_rating: form.google_rating ? parseFloat(form.google_rating) : undefined,
          google_review_count: form.google_review_count ? parseInt(form.google_review_count) : undefined,
          yelp_rating: form.yelp_rating ? parseFloat(form.yelp_rating) : undefined,
          yelp_review_count: form.yelp_review_count ? parseInt(form.yelp_review_count) : undefined,
          price_level: form.price_level || undefined,
          notes: form.notes || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to add');
      toast.success('Competitor added');
      setShowModal(false);
      setForm({ name: '', address: '', cuisine_type: '', google_rating: '', google_review_count: '', yelp_rating: '', yelp_review_count: '', price_level: '', notes: '' });
      fetchData();
    } catch {
      toast.error('Failed to add competitor');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this competitor?')) return;
    setDeleting(id);
    try {
      const res = await fetch('/api/competitors', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Competitor removed');
      fetchData();
    } catch {
      toast.error('Failed to remove competitor');
    } finally {
      setDeleting(null);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const res = await fetch('/api/competitors/analyze', {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to analyze');
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch {
      toast.error('Failed to generate analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  const ratingColor = (yours: number | null, theirs: number | null) => {
    if (yours === null || theirs === null) return 'text-zinc-400';
    if (yours > theirs) return 'text-green-400';
    if (yours < theirs) return 'text-red-400';
    return 'text-zinc-400';
  };

  const countColor = (yours: number, theirs: number | null) => {
    if (theirs === null) return 'text-zinc-400';
    if (yours > theirs) return 'text-green-400';
    if (yours < theirs) return 'text-red-400';
    return 'text-zinc-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-seat-red animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Eye className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Competitive Intelligence</h1>
            <p className="text-sm text-zinc-500">Know your market, stay ahead</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="bg-zinc-800 hover:bg-zinc-700 text-white border border-seat-border"
          >
            {analyzing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Brain className="w-4 h-4 mr-2" />
            )}
            AI Analysis
          </Button>
          <Button
            onClick={() => setShowModal(true)}
            className="bg-seat-red hover:bg-seat-red-dark text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Competitor
          </Button>
        </div>
      </div>

      {/* AI Analysis Card */}
      {(analyzing || analysis) && (
        <div className="bg-seat-card border border-seat-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-seat-red" />
            <h2 className="text-lg font-semibold text-white">AI Competitive Analysis</h2>
          </div>
          {analyzing ? (
            <div className="flex items-center gap-3 text-zinc-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing competitive landscape...</span>
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <div className="text-zinc-300 whitespace-pre-wrap leading-relaxed">{analysis}</div>
            </div>
          )}
        </div>
      )}

      {/* Competitor Cards */}
      {competitors.length === 0 ? (
        <div className="bg-seat-card border border-seat-border rounded-xl p-12 text-center">
          <TrendingUp className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No competitors tracked yet</h3>
          <p className="text-zinc-500 mb-6">Add your local competitors to start tracking and comparing performance.</p>
          <Button onClick={() => setShowModal(true)} className="bg-seat-red hover:bg-seat-red-dark text-white">
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Competitor
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {competitors.map((c) => (
              <div key={c.id} className="bg-seat-card border border-seat-border rounded-xl p-5 hover:border-zinc-600 transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-white font-semibold">{c.name}</h3>
                    {c.cuisine_type && (
                      <p className="text-zinc-500 text-xs mt-0.5">{c.cuisine_type}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <PriceBadge level={c.price_level} />
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={deleting === c.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/10 text-zinc-500 hover:text-red-400"
                    >
                      {deleting === c.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                {c.address && (
                  <p className="text-zinc-600 text-xs mb-3">{c.address}</p>
                )}
                <div className="space-y-1.5">
                  <StarRating rating={c.google_rating} count={c.google_review_count} platform="Google" />
                  <StarRating rating={c.yelp_rating} count={c.yelp_review_count} platform="Yelp" />
                </div>
                {c.notes && (
                  <p className="text-zinc-500 text-xs mt-3 border-t border-seat-border pt-3">{c.notes}</p>
                )}
              </div>
            ))}
          </div>

          {/* Comparison Table */}
          <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-seat-border">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-seat-red" />
                Side-by-Side Comparison
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-seat-border">
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-3">Name</th>
                    <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Google Rating</th>
                    <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Google Reviews</th>
                    <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Yelp Rating</th>
                    <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Yelp Reviews</th>
                    <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Price Level</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Your restaurant row */}
                  {restaurant && (
                    <tr className="border-b border-seat-border border-l-2 border-l-seat-red bg-seat-red/5">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold">{restaurant.name}</span>
                          <span className="text-[10px] font-medium bg-seat-red/20 text-seat-red px-1.5 py-0.5 rounded">YOU</span>
                        </div>
                      </td>
                      <td className="text-center px-4 py-3 text-white font-medium">{restaurant.google_rating ?? '--'}</td>
                      <td className="text-center px-4 py-3 text-white font-medium">{restaurant.google_review_count}</td>
                      <td className="text-center px-4 py-3 text-white font-medium">{restaurant.yelp_rating ?? '--'}</td>
                      <td className="text-center px-4 py-3 text-white font-medium">{restaurant.yelp_review_count}</td>
                      <td className="text-center px-4 py-3 text-zinc-500">--</td>
                    </tr>
                  )}
                  {/* Competitor rows */}
                  {competitors.map((c) => (
                    <tr key={c.id} className="border-b border-seat-border hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-3">
                        <span className="text-zinc-300">{c.name}</span>
                      </td>
                      <td className={`text-center px-4 py-3 font-medium ${ratingColor(restaurant?.google_rating ?? null, c.google_rating)}`}>
                        {c.google_rating ?? '--'}
                      </td>
                      <td className={`text-center px-4 py-3 font-medium ${countColor(restaurant?.google_review_count ?? 0, c.google_review_count)}`}>
                        {c.google_review_count ?? '--'}
                      </td>
                      <td className={`text-center px-4 py-3 font-medium ${ratingColor(restaurant?.yelp_rating ?? null, c.yelp_rating)}`}>
                        {c.yelp_rating ?? '--'}
                      </td>
                      <td className={`text-center px-4 py-3 font-medium ${countColor(restaurant?.yelp_review_count ?? 0, c.yelp_review_count)}`}>
                        {c.yelp_review_count ?? '--'}
                      </td>
                      <td className="text-center px-4 py-3">
                        <PriceBadge level={c.price_level} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add Competitor Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-seat-dark border border-seat-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-seat-border">
              <h2 className="text-lg font-semibold text-white">Add Competitor</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Competitor restaurant name"
                  className="w-full bg-seat-black border border-seat-border rounded-lg px-3 py-2 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-seat-red"
                />
              </div>
              {/* Address */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="123 Main St, City, State"
                  className="w-full bg-seat-black border border-seat-border rounded-lg px-3 py-2 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-seat-red"
                />
              </div>
              {/* Cuisine Type */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Cuisine Type</label>
                <input
                  type="text"
                  value={form.cuisine_type}
                  onChange={(e) => setForm({ ...form, cuisine_type: e.target.value })}
                  placeholder="Italian, Mexican, etc."
                  className="w-full bg-seat-black border border-seat-border rounded-lg px-3 py-2 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-seat-red"
                />
              </div>
              {/* Ratings Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Google Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={form.google_rating}
                    onChange={(e) => setForm({ ...form, google_rating: e.target.value })}
                    placeholder="4.5"
                    className="w-full bg-seat-black border border-seat-border rounded-lg px-3 py-2 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-seat-red"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Google Reviews</label>
                  <input
                    type="number"
                    min="0"
                    value={form.google_review_count}
                    onChange={(e) => setForm({ ...form, google_review_count: e.target.value })}
                    placeholder="250"
                    className="w-full bg-seat-black border border-seat-border rounded-lg px-3 py-2 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-seat-red"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Yelp Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={form.yelp_rating}
                    onChange={(e) => setForm({ ...form, yelp_rating: e.target.value })}
                    placeholder="4.0"
                    className="w-full bg-seat-black border border-seat-border rounded-lg px-3 py-2 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-seat-red"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Yelp Reviews</label>
                  <input
                    type="number"
                    min="0"
                    value={form.yelp_review_count}
                    onChange={(e) => setForm({ ...form, yelp_review_count: e.target.value })}
                    placeholder="180"
                    className="w-full bg-seat-black border border-seat-border rounded-lg px-3 py-2 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-seat-red"
                  />
                </div>
              </div>
              {/* Price Level */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Price Level</label>
                <div className="flex gap-2">
                  {PRICE_LEVELS.map((level) => (
                    <button
                      key={level}
                      onClick={() => setForm({ ...form, price_level: form.price_level === level ? '' : level })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        form.price_level === level
                          ? 'bg-seat-red text-white'
                          : 'bg-seat-black border border-seat-border text-zinc-400 hover:border-zinc-500'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any observations about this competitor..."
                  rows={3}
                  className="w-full bg-seat-black border border-seat-border rounded-lg px-3 py-2 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-seat-red resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-seat-border">
              <Button
                onClick={() => setShowModal(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white border border-seat-border"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAdd}
                disabled={saving}
                className="bg-seat-red hover:bg-seat-red-dark text-white"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Add Competitor
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
