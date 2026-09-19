'use client';

import { useState, useEffect, useCallback } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import {
  Bookmark,
  Plus,
  X,
  Trash2,
  Star,
  Eye,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface SavedView {
  id: string;
  name: string;
  page: string;
  filters: Record<string, string>;
  sort_by: string;
  sort_dir: 'asc' | 'desc';
  columns: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface ViewData {
  views: SavedView[];
  by_page: { page: string; count: number }[];
  stats: { total_views: number; pages_with_views: number; default_views: number };
}

export default function SavedViewsPage() {
  const [data, setData] = useState<ViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [pageFilter, setPageFilter] = useState('all');
  const [formName, setFormName] = useState('');
  const [formPage, setFormPage] = useState('customers');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/saved-views');
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createView = async () => {
    if (!formName) return;
    try {
      const res = await fetch('/api/saved-views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, page: formPage, filters: {}, sort_by: 'created_at', sort_dir: 'desc', columns: [] }),
      });
      if (res.ok) { toast.success('View saved'); setShowCreate(false); setFormName(''); fetchData(); }
    } catch { toast.error('Failed'); }
  };

  const deleteView = async (id: string) => {
    try {
      await fetch('/api/saved-views', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      toast.success('View deleted');
      if (data) setData({ ...data, views: data.views.filter(v => v.id !== id) });
    } catch { toast.error('Failed'); }
  };

  if (loading) {
    return (<div className="p-6 space-y-6"><div className="animate-pulse space-y-4"><div className="h-8 bg-zinc-800 rounded w-64" /><div className="grid grid-cols-3 gap-4">{[1,2,3].map(i=><div key={i} className="h-28 bg-zinc-800/50 rounded-xl" />)}</div></div></div>);
  }
  if (!data) return <div className="p-6"><p className="text-zinc-400">Failed to load.</p></div>;

  const filtered = pageFilter === 'all' ? data.views : data.views.filter(v => v.page === pageFilter);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Bookmark className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Saved Views</h1>
            <p className="text-sm text-zinc-500">Custom filtered views across your dashboard</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90">
          {showCreate ? <X size={16} /> : <Plus size={16} />}
          {showCreate ? 'Cancel' : 'New View'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <MetricCard title="Total Views" value={data.stats.total_views} icon={<Eye size={18} />} />
        <MetricCard title="Pages" value={data.stats.pages_with_views} icon={<Filter size={18} />} />
        <MetricCard title="Defaults" value={data.stats.default_views} icon={<Star size={18} />} />
      </div>

      {showCreate && (
        <div className="bg-seat-card border border-seat-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Create Saved View</h3>
          <div className="grid grid-cols-2 gap-4">
            <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="View name"
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-seat-red" />
            <select value={formPage} onChange={e => setFormPage(e.target.value)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-seat-red">
              <option value="customers">Customers</option>
              <option value="analytics">Analytics</option>
              <option value="reviews">Reviews</option>
              <option value="menu">Menu</option>
              <option value="staff">Staff</option>
            </select>
          </div>
          <button onClick={createView} disabled={!formName}
            className="px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 disabled:opacity-50">Save View</button>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => setPageFilter('all')}
          className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            pageFilter === 'all' ? 'bg-seat-red text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white')}>
          All
        </button>
        {data.by_page.map(p => (
          <button key={p.page} onClick={() => setPageFilter(p.page)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              pageFilter === p.page ? 'bg-seat-red text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white')}>
            {p.page} ({p.count})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(view => (
          <div key={view.id} className="bg-seat-card border border-seat-border rounded-xl p-4 flex items-center justify-between hover:border-zinc-600 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-seat-red/10 flex items-center justify-center">
                <Bookmark size={14} className="text-seat-red" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">{view.name}</h3>
                  {view.is_default && <Star size={12} className="text-amber-400 fill-amber-400" />}
                  <span className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full">{view.page}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-500">
                  <span>Sort: {view.sort_by} ({view.sort_dir})</span>
                  <span>Filters: {Object.keys(view.filters).length}</span>
                  <span>Updated: {new Date(view.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded-lg text-xs hover:text-white transition-colors">
                <Eye size={12} />
              </button>
              <button onClick={() => deleteView(view.id)}
                className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
