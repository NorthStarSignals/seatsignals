'use client';

import { useState, useMemo } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal,
  FieldLabel,
  TextInput,
  TextArea,
  Select,
  PrimaryButton,
  GhostButton,
} from '@/components/dashboard/edit-modal';
import {
  Share2,
  Calendar,
  TrendingUp,
  Clock,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';

interface SocialPost {
  id: string;
  platform: 'Instagram' | 'Facebook' | 'TikTok' | 'X';
  content: string;
  date: string;
  time: string;
  status: 'scheduled' | 'published' | 'draft';
  engagement?: number;
  type: 'photo' | 'video' | 'story' | 'reel';
}

const INITIAL_POSTS: SocialPost[] = [
  { id: 'P1', platform: 'Instagram', content: 'New spring menu launch! Fresh seasonal dishes...', date: 'Apr 10', time: '12:00 PM', status: 'scheduled', type: 'reel' },
  { id: 'P2', platform: 'Facebook', content: 'Easter brunch special - reserve your table now!', date: 'Apr 10', time: '10:00 AM', status: 'scheduled', type: 'photo' },
  { id: 'P3', platform: 'TikTok', content: 'Behind the scenes: Chef Mike makes our Chocolate Lava Cake', date: 'Apr 11', time: '6:00 PM', status: 'scheduled', type: 'video' },
  { id: 'P4', platform: 'Instagram', content: 'Happy Hour starts at 4! $8 craft cocktails...', date: 'Apr 11', time: '3:30 PM', status: 'draft', type: 'story' },
  { id: 'P5', platform: 'X', content: 'Packed house tonight! Thank you for an amazing Friday', date: 'Apr 9', time: '10:30 PM', status: 'published', engagement: 142, type: 'photo' },
  { id: 'P6', platform: 'Instagram', content: 'Our Filet Mignon - aged 28 days, seared to perfection', date: 'Apr 9', time: '5:00 PM', status: 'published', engagement: 385, type: 'photo' },
  { id: 'P7', platform: 'Facebook', content: "Mother's Day reservations now open! Book your table...", date: 'Apr 12', time: '11:00 AM', status: 'scheduled', type: 'photo' },
  { id: 'P8', platform: 'TikTok', content: 'POV: You just sat at the best table in the house', date: 'Apr 12', time: '7:00 PM', status: 'draft', type: 'video' },
];

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: 'bg-pink-500/10 text-pink-400',
  Facebook: 'bg-blue-500/10 text-blue-400',
  TikTok: 'bg-cyan-500/10 text-cyan-400',
  X: 'bg-zinc-600/10 text-zinc-300',
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-amber-500/10 text-amber-400',
  published: 'bg-green-500/10 text-green-400',
  draft: 'bg-zinc-800 text-zinc-400',
};

export default function SocialCalendarPage() {
  const { items: posts, add, update, remove } = useCrudList<SocialPost>(
    'seatsignals_social_posts',
    INITIAL_POSTS
  );

  const [filter, setFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [platform, setPlatform] = useState<SocialPost['platform']>('Instagram');
  const [content, setContent] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState<SocialPost['type']>('photo');
  const [status, setStatus] = useState<SocialPost['status']>('draft');

  function resetForm() {
    setPlatform('Instagram');
    setContent('');
    setDate('');
    setTime('');
    setType('photo');
    setStatus('draft');
    setEditingId(null);
  }

  function openCreate() {
    resetForm();
    setShowModal(true);
  }

  function openEdit(p: SocialPost) {
    setEditingId(p.id);
    setPlatform(p.platform);
    setContent(p.content);
    setDate(p.date);
    setTime(p.time);
    setType(p.type);
    setStatus(p.status);
    setShowModal(true);
  }

  function handleSave() {
    if (!content.trim()) {
      toast.error('Post content is required');
      return;
    }
    const data = { platform, content, date, time, type, status };
    if (editingId) {
      update(editingId, data);
      toast.success('Post updated');
    } else {
      add({ id: `P_${Date.now()}`, ...data });
      toast.success('Post created');
    }
    setShowModal(false);
    resetForm();
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this post?')) return;
    remove(id);
    toast.success('Post deleted');
  }

  function schedulePost(id: string) {
    update(id, { status: 'scheduled' });
    toast.success('Post scheduled');
  }

  const scheduled = posts.filter((p) => p.status === 'scheduled').length;
  const published = posts.filter((p) => p.status === 'published').length;
  const engaged = posts.filter((p) => p.engagement);
  const avgEngagement = engaged.length > 0 ? Math.round(engaged.reduce((s, p) => s + (p.engagement || 0), 0) / engaged.length) : 0;

  const filtered = useMemo(
    () => (filter === 'all' ? posts : posts.filter((p) => p.platform === filter || p.status === filter)),
    [posts, filter]
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Share2 className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Social Calendar</h1>
            <p className="text-sm text-zinc-500">Plan and schedule social media content</p>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 transition-colors">
          <Plus size={16} /> New Post
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Scheduled" value={scheduled} icon={<Calendar size={18} />} />
        <MetricCard title="Published" value={published} icon={<Share2 size={18} />} />
        <MetricCard title="Avg Engagement" value={avgEngagement} icon={<TrendingUp size={18} />} />
        <MetricCard title="Drafts" value={posts.filter((p) => p.status === 'draft').length} icon={<Clock size={18} />} />
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'Instagram', 'Facebook', 'TikTok', 'X', 'scheduled', 'draft', 'published'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors', filter === f ? 'bg-seat-red text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white')}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-seat-card border border-seat-border rounded-xl p-8 text-center text-zinc-400 text-sm">
            No posts in this view
          </div>
        )}
        {filtered.map((p) => (
          <div key={p.id} className="bg-seat-card border border-seat-border rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={cn('px-2.5 py-1 rounded-lg text-[10px] font-medium mt-0.5 whitespace-nowrap', PLATFORM_COLORS[p.platform])}>
                  {p.platform}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{p.content}</p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-[10px] text-zinc-500">{p.date} at {p.time}</span>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', STATUS_COLORS[p.status])}>
                      {p.status}
                    </span>
                    <span className="text-[10px] text-zinc-600 capitalize">{p.type}</span>
                  </div>
                </div>
              </div>
              {p.engagement && (
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-green-400">{p.engagement}</p>
                  <p className="text-[10px] text-zinc-500">engagements</p>
                </div>
              )}
              <div className="flex items-center gap-1 flex-shrink-0">
                {p.status === 'draft' && (
                  <button onClick={() => schedulePost(p.id)} className="text-[10px] px-2 py-1 bg-seat-red text-white rounded">
                    Schedule
                  </button>
                )}
                <button onClick={() => openEdit(p)} className="p-1.5 rounded text-zinc-500 hover:text-white hover:bg-zinc-800">
                  <Pencil size={12} />
                </button>
                <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <EditModal
        open={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingId ? 'Edit Post' : 'New Social Post'}
        maxWidth="lg"
        footer={
          <>
            <GhostButton onClick={() => { setShowModal(false); resetForm(); }}>Cancel</GhostButton>
            <PrimaryButton onClick={handleSave}>{editingId ? 'Save Changes' : 'Create Post'}</PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Platform</FieldLabel>
              <Select
                value={platform}
                onChange={(v) => setPlatform(v as SocialPost['platform'])}
                options={[
                  { label: 'Instagram', value: 'Instagram' },
                  { label: 'Facebook', value: 'Facebook' },
                  { label: 'TikTok', value: 'TikTok' },
                  { label: 'X', value: 'X' },
                ]}
              />
            </div>
            <div>
              <FieldLabel>Type</FieldLabel>
              <Select
                value={type}
                onChange={(v) => setType(v as SocialPost['type'])}
                options={[
                  { label: 'Photo', value: 'photo' },
                  { label: 'Video', value: 'video' },
                  { label: 'Story', value: 'story' },
                  { label: 'Reel', value: 'reel' },
                ]}
              />
            </div>
          </div>
          <div>
            <FieldLabel>Content</FieldLabel>
            <TextArea value={content} onChange={setContent} placeholder="What do you want to post?" rows={3} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <FieldLabel>Date</FieldLabel>
              <TextInput value={date} onChange={setDate} placeholder="e.g., Apr 15" />
            </div>
            <div>
              <FieldLabel>Time</FieldLabel>
              <TextInput value={time} onChange={setTime} placeholder="e.g., 3:00 PM" />
            </div>
            <div>
              <FieldLabel>Status</FieldLabel>
              <Select
                value={status}
                onChange={(v) => setStatus(v as SocialPost['status'])}
                options={[
                  { label: 'Draft', value: 'draft' },
                  { label: 'Scheduled', value: 'scheduled' },
                  { label: 'Published', value: 'published' },
                ]}
              />
            </div>
          </div>
        </div>
      </EditModal>
    </div>
  );
}
