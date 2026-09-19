'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { MetricCard } from '@/components/ui/metric-card';
import toast from 'react-hot-toast';
import {
  Share2,
  Plus,
  Trash2,
  Sparkles,
  X,
  Loader2,
  Calendar,
  Clock,
  Send,
  Edit3,
  Heart,
  MessageCircle,
  Repeat2,
  Eye,
  Camera,
  Globe,
  AtSign,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

type Platform = 'instagram' | 'facebook' | 'twitter' | 'tiktok';
type PostStatus = 'draft' | 'scheduled' | 'published';

interface SocialPost {
  id: string;
  platform: Platform;
  content: string;
  image_url: string | null;
  hashtags: string[];
  status: PostStatus;
  scheduled_at: string | null;
  published_at: string | null;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  created_at: string;
}

interface PlatformStat {
  engagement: number;
  reach: number;
  count: number;
}

interface SocialStats {
  totalPosts: number;
  publishedPosts: number;
  scheduledPosts: number;
  avgEngagementRate: number;
  bestPlatform: string;
  platformStats: Record<string, PlatformStat>;
}

const PLATFORMS: { value: Platform | 'all'; label: string }[] = [
  { value: 'all', label: 'All Platforms' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'tiktok', label: 'TikTok' },
];

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E4405F',
  facebook: '#1877F2',
  twitter: '#1DA1F2',
  tiktok: '#00F2EA',
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  twitter: 'Twitter/X',
  tiktok: 'TikTok',
};

function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  switch (platform) {
    case 'instagram':
      return <Camera className={className} />;
    case 'facebook':
      return <Globe className={className} />;
    case 'twitter':
      return <AtSign className={className} />;
    case 'tiktok':
      return <TrendingUp className={className} />;
    default:
      return <Share2 className={className} />;
  }
}

function StatusBadge({ status }: { status: PostStatus }) {
  const styles: Record<PostStatus, string> = {
    draft: 'bg-zinc-700/50 text-zinc-400',
    scheduled: 'bg-blue-500/10 text-blue-400',
    published: 'bg-green-500/10 text-green-400',
  };
  const labels: Record<PostStatus, string> = {
    draft: 'Draft',
    scheduled: 'Scheduled',
    published: 'Published',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function SocialMediaPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [stats, setStats] = useState<SocialStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePlatform, setActivePlatform] = useState<Platform | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Create form state
  const [form, setForm] = useState({
    content: '',
    platform: 'instagram' as Platform,
    image_url: '',
    scheduled_at: '',
    hashtags: '',
    status: 'draft' as 'draft' | 'scheduled',
    purpose: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activePlatform !== 'all') {
        params.set('platform', activePlatform);
      }
      const res = await fetch(`/api/social?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setPosts(data.posts);
      setStats(data.stats);
    } catch {
      toast.error('Failed to load social media data');
    } finally {
      setLoading(false);
    }
  }, [activePlatform]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!form.content.trim()) {
      toast.error('Content is required');
      return;
    }
    if (form.status === 'scheduled' && !form.scheduled_at) {
      toast.error('Schedule date is required for scheduled posts');
      return;
    }
    setSaving(true);
    try {
      const hashtagArray = form.hashtags
        .split(',')
        .map(h => h.trim())
        .filter(h => h.length > 0)
        .map(h => (h.startsWith('#') ? h : `#${h}`));

      const res = await fetch('/api/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: form.content,
          platform: form.platform,
          image_url: form.image_url || undefined,
          scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : undefined,
          hashtags: hashtagArray,
          status: form.status,
        }),
      });
      if (!res.ok) throw new Error('Failed to create');
      toast.success('Post created');
      setShowCreateModal(false);
      setForm({ content: '', platform: 'instagram', image_url: '', scheduled_at: '', hashtags: '', status: 'draft', purpose: '' });
      fetchData();
    } catch {
      toast.error('Failed to create post');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this post?')) return;
    setDeleting(id);
    try {
      const res = await fetch('/api/social', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      toast.success('Post deleted');
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete post';
      toast.error(message);
    } finally {
      setDeleting(null);
    }
  };

  const handleGenerate = async () => {
    if (!form.purpose.trim()) {
      toast.error('Enter a topic/purpose for AI generation');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/social/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: form.purpose,
          platform: form.platform,
        }),
      });
      if (!res.ok) throw new Error('Failed to generate');
      const data = await res.json();
      setForm(prev => ({
        ...prev,
        content: data.content || '',
        hashtags: (data.hashtags || []).join(', '),
      }));
      toast.success('Content generated');
    } catch {
      toast.error('Failed to generate content');
    } finally {
      setGenerating(false);
    }
  };

  // Build engagement chart data
  const chartData = stats
    ? Object.keys(stats.platformStats).map(platform => {
        const s = stats.platformStats[platform];
        const engagementRate = s.reach > 0 ? +((s.engagement / s.reach) * 100).toFixed(1) : 0;
        return {
          platform: PLATFORM_LABELS[platform] || platform,
          Likes: Math.round(s.engagement * 0.6),
          Comments: Math.round(s.engagement * 0.2),
          Shares: Math.round(s.engagement * 0.2),
          'Eng. Rate': engagementRate,
          fill: PLATFORM_COLORS[platform] || '#888',
        };
      })
    : [];

  const scheduledPosts = posts.filter(p => p.status === 'scheduled');
  const publishedPosts = posts.filter(p => p.status === 'published');
  const draftPosts = posts.filter(p => p.status === 'draft');

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
            <Share2 className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Social Media</h1>
            <p className="text-sm text-zinc-500">Schedule, publish, and track your social posts</p>
          </div>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-seat-red hover:bg-seat-red-dark text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Post
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Posts"
          value={stats?.totalPosts ?? 0}
          subtitle={`${stats?.publishedPosts ?? 0} published`}
          icon={<Share2 className="w-4 h-4" />}
        />
        <MetricCard
          title="Avg Engagement Rate"
          value={`${stats?.avgEngagementRate ?? 0}%`}
          subtitle="Likes + comments + shares / reach"
          icon={<Heart className="w-4 h-4" />}
        />
        <MetricCard
          title="Best Platform"
          value={PLATFORM_LABELS[stats?.bestPlatform ?? ''] ?? 'N/A'}
          subtitle="Highest engagement rate"
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <MetricCard
          title="Scheduled Posts"
          value={stats?.scheduledPosts ?? 0}
          subtitle="Ready to publish"
          icon={<Calendar className="w-4 h-4" />}
        />
      </div>

      {/* Platform Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PLATFORMS.map(p => (
          <button
            key={p.value}
            onClick={() => setActivePlatform(p.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activePlatform === p.value
                ? 'bg-seat-red text-white'
                : 'bg-seat-card border border-seat-border text-zinc-400 hover:text-white hover:border-zinc-500'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Scheduled Posts */}
      {scheduledPosts.length > 0 && (
        <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-seat-border">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Upcoming Scheduled Posts
            </h2>
          </div>
          <div className="divide-y divide-seat-border">
            {scheduledPosts.map(post => (
              <div key={post.id} className="px-6 py-4 flex items-start gap-4 hover:bg-zinc-800/30 transition-colors group">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${PLATFORM_COLORS[post.platform]}15` }}
                >
                  <PlatformIcon
                    platform={post.platform}
                    className="w-5 h-5"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium" style={{ color: PLATFORM_COLORS[post.platform] }}>
                      {PLATFORM_LABELS[post.platform]}
                    </span>
                    <StatusBadge status={post.status} />
                    <span className="text-xs text-zinc-500">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {formatDateTime(post.scheduled_at)}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300 line-clamp-2">{post.content}</p>
                  {post.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {post.hashtags.slice(0, 4).map((tag, i) => (
                        <span key={i} className="text-xs text-seat-red bg-seat-red/10 px-1.5 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                      {post.hashtags.length > 4 && (
                        <span className="text-xs text-zinc-500">+{post.hashtags.length - 4} more</span>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(post.id)}
                  disabled={deleting === post.id}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-red-500/10 text-zinc-500 hover:text-red-400 flex-shrink-0"
                >
                  {deleting === post.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Draft Posts */}
      {draftPosts.length > 0 && (
        <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-seat-border">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-zinc-400" />
              Drafts
            </h2>
          </div>
          <div className="divide-y divide-seat-border">
            {draftPosts.map(post => (
              <div key={post.id} className="px-6 py-4 flex items-start gap-4 hover:bg-zinc-800/30 transition-colors group">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${PLATFORM_COLORS[post.platform]}15` }}
                >
                  <PlatformIcon
                    platform={post.platform}
                    className="w-5 h-5"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium" style={{ color: PLATFORM_COLORS[post.platform] }}>
                      {PLATFORM_LABELS[post.platform]}
                    </span>
                    <StatusBadge status={post.status} />
                  </div>
                  <p className="text-sm text-zinc-300 line-clamp-2">{post.content}</p>
                </div>
                <button
                  onClick={() => handleDelete(post.id)}
                  disabled={deleting === post.id}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-red-500/10 text-zinc-500 hover:text-red-400 flex-shrink-0"
                >
                  {deleting === post.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Engagement Chart */}
      {chartData.length > 0 && (
        <div className="bg-seat-card border border-seat-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-seat-red" />
            Engagement by Platform
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                <XAxis
                  dataKey="platform"
                  tick={{ fill: '#71717A', fontSize: 12 }}
                  axisLine={{ stroke: '#27272A' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#71717A', fontSize: 12 }}
                  axisLine={{ stroke: '#27272A' }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1C1C21',
                    border: '1px solid #27272A',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: '#fff', fontWeight: 600 }}
                  itemStyle={{ color: '#a1a1aa' }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [value, undefined]}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => (
                    <span className="text-xs text-zinc-400">{value}</span>
                  )}
                />
                <Bar dataKey="Likes" fill="#E11D48" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Comments" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Shares" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Published Post History */}
      {publishedPosts.length > 0 && (
        <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-seat-border">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-green-400" />
              Published Posts
            </h2>
          </div>
          <div className="divide-y divide-seat-border">
            {publishedPosts.map(post => (
              <div key={post.id} className="px-6 py-4 hover:bg-zinc-800/30 transition-colors">
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${PLATFORM_COLORS[post.platform]}15` }}
                  >
                    <PlatformIcon
                      platform={post.platform}
                      className="w-5 h-5"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium" style={{ color: PLATFORM_COLORS[post.platform] }}>
                        {PLATFORM_LABELS[post.platform]}
                      </span>
                      <StatusBadge status={post.status} />
                      <span className="text-xs text-zinc-500">
                        {formatDate(post.published_at)}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-300 line-clamp-2 mb-3">{post.content}</p>
                    {post.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {post.hashtags.map((tag, i) => (
                          <span key={i} className="text-xs text-seat-red bg-seat-red/10 px-1.5 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Engagement Stats */}
                    <div className="flex items-center gap-5">
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <Heart className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">{post.likes.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">{post.comments.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <Repeat2 className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">{post.shares.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <Eye className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">{post.reach.toLocaleString()} reach</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {posts.length === 0 && (
        <div className="bg-seat-card border border-seat-border rounded-xl p-12 text-center">
          <Share2 className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No social posts yet</h3>
          <p className="text-zinc-500 mb-6">Create your first post to start managing your social media presence.</p>
          <Button onClick={() => setShowCreateModal(true)} className="bg-seat-red hover:bg-seat-red-dark text-white">
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Post
          </Button>
        </div>
      )}

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-seat-dark border border-seat-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-seat-border">
              <h2 className="text-lg font-semibold text-white">Create Social Post</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Platform Selector */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Platform</label>
                <div className="flex gap-2">
                  {(['instagram', 'facebook', 'twitter', 'tiktok'] as Platform[]).map(p => (
                    <button
                      key={p}
                      onClick={() => setForm({ ...form, platform: p })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        form.platform === p
                          ? 'text-white'
                          : 'bg-seat-black border border-seat-border text-zinc-400 hover:border-zinc-500'
                      }`}
                      style={form.platform === p ? { backgroundColor: PLATFORM_COLORS[p] } : {}}
                    >
                      <PlatformIcon platform={p} className="w-3.5 h-3.5" />
                      {PLATFORM_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Generate Section */}
              <div className="bg-seat-black border border-seat-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-seat-red" />
                  <span className="text-sm font-medium text-white">AI Content Generator</span>
                </div>
                <input
                  type="text"
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  placeholder="e.g., Weekend brunch special, New menu launch, Happy hour promo..."
                  className="w-full bg-seat-card border border-seat-border rounded-lg px-3 py-2 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-seat-red mb-2"
                />
                <Button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full bg-seat-red/10 hover:bg-seat-red/20 text-seat-red border border-seat-red/20 text-sm"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Generate Content
                </Button>
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Content</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Write your post content..."
                  rows={4}
                  className="w-full bg-seat-black border border-seat-border rounded-lg px-3 py-2 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-seat-red resize-none"
                />
                {form.platform === 'twitter' && (
                  <p className={`text-xs mt-1 ${form.content.length > 280 ? 'text-red-400' : 'text-zinc-500'}`}>
                    {form.content.length}/280 characters
                  </p>
                )}
              </div>

              {/* Hashtags */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Hashtags</label>
                <input
                  type="text"
                  value={form.hashtags}
                  onChange={(e) => setForm({ ...form, hashtags: e.target.value })}
                  placeholder="#foodie, #restaurant, #localfood (comma separated)"
                  className="w-full bg-seat-black border border-seat-border rounded-lg px-3 py-2 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-seat-red"
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Image URL (optional)</label>
                <input
                  type="text"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-seat-black border border-seat-border rounded-lg px-3 py-2 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-seat-red"
                />
              </div>

              {/* Status & Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Status</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setForm({ ...form, status: 'draft' })}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        form.status === 'draft'
                          ? 'bg-zinc-700 text-white'
                          : 'bg-seat-black border border-seat-border text-zinc-400 hover:border-zinc-500'
                      }`}
                    >
                      Draft
                    </button>
                    <button
                      onClick={() => setForm({ ...form, status: 'scheduled' })}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        form.status === 'scheduled'
                          ? 'bg-blue-600 text-white'
                          : 'bg-seat-black border border-seat-border text-zinc-400 hover:border-zinc-500'
                      }`}
                    >
                      Schedule
                    </button>
                  </div>
                </div>
                {form.status === 'scheduled' && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Schedule Date</label>
                    <input
                      type="datetime-local"
                      value={form.scheduled_at}
                      onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                      className="w-full bg-seat-black border border-seat-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-seat-red"
                    />
                  </div>
                )}
              </div>

              {/* Post Preview */}
              {form.content && (
                <div className="border border-seat-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <PlatformIcon platform={form.platform} className="w-4 h-4" />
                    <span className="text-xs font-medium text-zinc-400">Preview - {PLATFORM_LABELS[form.platform]}</span>
                  </div>
                  <p className="text-sm text-white leading-relaxed">{form.content}</p>
                  {form.hashtags && (
                    <p className="text-xs text-seat-red mt-2">
                      {form.hashtags.split(',').map(h => h.trim()).filter(h => h).map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-seat-border">
              <Button
                onClick={() => setShowCreateModal(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white border border-seat-border"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={saving}
                className="bg-seat-red hover:bg-seat-red-dark text-white"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {form.status === 'scheduled' ? 'Schedule Post' : 'Save Draft'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
