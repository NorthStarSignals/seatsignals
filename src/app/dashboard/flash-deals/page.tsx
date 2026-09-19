'use client';

import { useState, useEffect } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { FlashDeal } from '@/lib/types';
import toast from 'react-hot-toast';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  Zap,
  Clock,
  Timer,
  Users,
  DollarSign,
  Sparkles,
  ArrowRight,
  X,
  Plus,
  Copy,
  StopCircle,
  CalendarClock,
  Pencil,
  Trash2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type DealType = 'flash' | 'happy_hour' | 'early_bird' | 'late_night';

const INITIAL_DEALS: FlashDeal[] = [
  {
    id: 'fd1',
    restaurant_id: 'demo',
    title: 'Tonight Only: 20% Off',
    description: 'Flash deal for tonight only',
    deal_type: 'flash',
    discount_value: '20% Off Entire Bill',
    starts_at: new Date(Date.now() - 3600000).toISOString(),
    expires_at: new Date(Date.now() + 3 * 3600000).toISOString(),
    max_redemptions: 50,
    current_redemptions: 17,
    redemption_code: 'FLASH20',
    target_audience: 'all',
    channel: 'sms',
    message_sent: true,
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'fd2',
    restaurant_id: 'demo',
    title: 'Happy Hour 2-for-1',
    description: '2-for-1 drinks during happy hour',
    deal_type: 'happy_hour',
    discount_value: '2-for-1 Drinks',
    starts_at: new Date(Date.now() + 2 * 86400000).toISOString(),
    expires_at: new Date(Date.now() + 2 * 86400000 + 2 * 3600000).toISOString(),
    max_redemptions: 100,
    current_redemptions: 0,
    redemption_code: 'HH2FOR1',
    target_audience: 'all',
    channel: 'email',
    message_sent: false,
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'fd3',
    restaurant_id: 'demo',
    title: 'Last Week Flash',
    description: 'Previous promo',
    deal_type: 'flash',
    discount_value: '15% Off',
    starts_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    expires_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    max_redemptions: 100,
    current_redemptions: 73,
    redemption_code: 'FLASH15',
    target_audience: 'all',
    channel: 'sms',
    message_sent: true,
    active: false,
    created_at: new Date().toISOString(),
  },
];

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DEAL_TYPES: { value: DealType; label: string; icon: React.ReactNode }[] = [
  { value: 'flash', label: 'Flash Deal', icon: <Zap className="w-4 h-4" /> },
  { value: 'happy_hour', label: 'Happy Hour', icon: <Clock className="w-4 h-4" /> },
  { value: 'early_bird', label: 'Early Bird', icon: <Sparkles className="w-4 h-4" /> },
  { value: 'late_night', label: 'Late Night Special', icon: <Timer className="w-4 h-4" /> },
];

const TARGET_AUDIENCES = [
  { value: 'all', label: 'All Customers' },
  { value: 'vip', label: 'VIP Only' },
  { value: 'lapsed_30', label: "Haven't visited in 30+ days" },
  { value: 'nearby', label: 'Nearby' },
];

const CHANNELS = [
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
  { value: 'push', label: 'Push (Future)' },
];

const QUICK_TEMPLATES = [
  {
    title: 'Happy Hour 2-for-1',
    deal_type: 'happy_hour' as DealType,
    discount_value: '2-for-1 Drinks',
    description: 'Buy one drink, get one free during happy hour!',
    hours: 2,
  },
  {
    title: '20% Off Next 2 Hours',
    deal_type: 'flash' as DealType,
    discount_value: '20% Off Entire Bill',
    description: 'Flash deal! 20% off your total for the next 2 hours.',
    hours: 2,
  },
  {
    title: 'Free Appetizer Today Only',
    deal_type: 'flash' as DealType,
    discount_value: 'Free Appetizer',
    description: 'Get a free appetizer with any entree purchase today!',
    hours: 8,
  },
  {
    title: 'Early Bird 15% Off Before 5PM',
    deal_type: 'early_bird' as DealType,
    discount_value: '15% Off Before 5PM',
    description: 'Dine early, save big. 15% off for guests seated before 5PM.',
    hours: 4,
  },
];

/* ------------------------------------------------------------------ */
/*  Countdown Hook                                                     */
/* ------------------------------------------------------------------ */

function useCountdown(expiresAt: string) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    function calculate() {
      const now = new Date().getTime();
      const end = new Date(expiresAt).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return timeLeft;
}

/* ------------------------------------------------------------------ */
/*  Active Deal Card                                                   */
/* ------------------------------------------------------------------ */

function ActiveDealCard({
  deal,
  onEndEarly,
  onEdit,
  onDelete,
}: {
  deal: FlashDeal;
  onEndEarly: (id: string) => void;
  onEdit: (deal: FlashDeal) => void;
  onDelete: (id: string) => void;
}) {
  const countdown = useCountdown(deal.expires_at);
  const progress =
    deal.max_redemptions && deal.max_redemptions > 0
      ? Math.min((deal.current_redemptions / deal.max_redemptions) * 100, 100)
      : 0;
  const isExpired = countdown === 'Expired';

  const dealTypeLabel =
    DEAL_TYPES.find((t) => t.value === deal.deal_type)?.label || deal.deal_type;

  return (
    <div
      className={`bg-seat-card border rounded-xl p-5 ${
        isExpired ? 'border-zinc-700 opacity-60' : 'border-seat-red/30'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-seat-red/10 text-seat-red">
              {dealTypeLabel}
            </span>
            {!isExpired && (
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                LIVE
              </span>
            )}
          </div>
          <h3 className="text-white font-semibold text-lg">{deal.title}</h3>
        </div>
        <div className="text-right">
          <div
            className={`font-mono text-lg font-bold ${
              isExpired ? 'text-zinc-500' : 'text-seat-red'
            }`}
          >
            {countdown}
          </div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
            {isExpired ? 'Ended' : 'Time Left'}
          </p>
        </div>
      </div>

      <p className="text-sm text-zinc-400 mb-3">{deal.discount_value}</p>

      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
            <span>Redemptions</span>
            <span>
              {deal.current_redemptions}
              {deal.max_redemptions ? ` / ${deal.max_redemptions}` : ''}
            </span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-seat-red rounded-full transition-all duration-500"
              style={{ width: `${deal.max_redemptions ? progress : 50}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-600 font-mono bg-zinc-800 px-2 py-1 rounded">
            {deal.redemption_code}
          </span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(deal.redemption_code);
              toast.success('Code copied!');
            }}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(deal)} className="p-1.5 rounded text-zinc-500 hover:text-white hover:bg-zinc-800" title="Edit">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {!isExpired && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEndEarly(deal.id)}
              className="text-zinc-500 hover:text-red-400"
            >
              <StopCircle className="w-3.5 h-3.5 mr-1" />
              End Early
            </Button>
          )}
          <button onClick={() => onDelete(deal.id)} className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function FlashDealsPage() {
  const { items: deals, add, update, remove } = useCrudList<FlashDeal>(
    'seatsignals_flash_deals',
    INITIAL_DEALS
  );

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDealType, setFormDealType] = useState<DealType>('flash');
  const [formDiscount, setFormDiscount] = useState('');
  const [formStartsAt, setFormStartsAt] = useState('');
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [formMaxRedemptions, setFormMaxRedemptions] = useState('');
  const [formAudience, setFormAudience] = useState('all');
  const [formChannel, setFormChannel] = useState('sms');

  // Trigger re-renders for countdowns
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const now = new Date();
  const activeDeals = deals.filter(
    (d) => d.active && new Date(d.expires_at) > now && new Date(d.starts_at) <= now
  );
  const upcomingDeals = deals.filter((d) => d.active && new Date(d.starts_at) > now);
  const pastDeals = deals.filter((d) => !d.active || new Date(d.expires_at) <= now);

  const stats = {
    active_count: activeDeals.length,
    total_redemptions: deals.reduce((s, d) => s + d.current_redemptions, 0),
    estimated_revenue: deals.reduce((s, d) => s + d.current_redemptions * 25, 0),
  };

  function resetForm() {
    setFormTitle('');
    setFormDescription('');
    setFormDealType('flash');
    setFormDiscount('');
    setFormStartsAt('');
    setFormExpiresAt('');
    setFormMaxRedemptions('');
    setFormAudience('all');
    setFormChannel('sms');
    setEditingId(null);
  }

  function openEdit(d: FlashDeal) {
    setEditingId(d.id);
    setFormTitle(d.title);
    setFormDescription(d.description || '');
    setFormDealType(d.deal_type);
    setFormDiscount(d.discount_value);
    setFormStartsAt(toLocalDatetimeString(new Date(d.starts_at)));
    setFormExpiresAt(toLocalDatetimeString(new Date(d.expires_at)));
    setFormMaxRedemptions(d.max_redemptions ? String(d.max_redemptions) : '');
    setFormAudience(d.target_audience);
    setFormChannel(d.channel);
    setShowCreate(true);
  }

  function handleCreate() {
    if (!formTitle || !formDiscount || !formStartsAt || !formExpiresAt) {
      toast.error('Please fill in all required fields');
      return;
    }
    const data = {
      title: formTitle,
      description: formDescription || undefined,
      deal_type: formDealType,
      discount_value: formDiscount,
      starts_at: new Date(formStartsAt).toISOString(),
      expires_at: new Date(formExpiresAt).toISOString(),
      max_redemptions: formMaxRedemptions ? parseInt(formMaxRedemptions) : undefined,
      target_audience: formAudience,
      channel: formChannel,
    };

    if (editingId) {
      update(editingId, data);
      toast.success('Flash deal updated');
    } else {
      add({
        id: `fd_${Date.now()}`,
        restaurant_id: 'demo',
        current_redemptions: 0,
        redemption_code: `DEAL${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        message_sent: false,
        active: true,
        created_at: new Date().toISOString(),
        ...data,
      });
      toast.success('Flash deal launched!');
    }
    resetForm();
    setShowCreate(false);
  }

  function handleEndEarly(id: string) {
    update(id, { active: false });
    toast.success('Deal ended');
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this deal?')) return;
    remove(id);
    toast.success('Deal deleted');
  }

  function applyTemplate(template: (typeof QUICK_TEMPLATES)[number]) {
    const start = new Date();
    const end = new Date(start.getTime() + template.hours * 60 * 60 * 1000);

    setFormTitle(template.title);
    setFormDealType(template.deal_type);
    setFormDiscount(template.discount_value);
    setFormDescription(template.description);
    setFormStartsAt(toLocalDatetimeString(start));
    setFormExpiresAt(toLocalDatetimeString(end));
    setShowCreate(true);
  }

  function toLocalDatetimeString(d: Date) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-seat-red" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Flash Deals</h1>
              <p className="text-sm text-zinc-500">
                Create time-limited offers to fill seats fast
              </p>
            </div>
          </div>
        </div>
        <Button variant="primary" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          Create Flash Deal
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Active Deals Now"
          value={stats.active_count}
          subtitle={`${upcomingDeals.length} upcoming`}
          icon={<Zap className="w-4 h-4" />}
        />
        <MetricCard
          title="Total Redemptions This Month"
          value={stats.total_redemptions}
          icon={<Users className="w-4 h-4" />}
        />
        <MetricCard
          title="Flash Deal Revenue"
          value={formatCurrency(stats.estimated_revenue)}
          subtitle="Estimated from redemptions"
          icon={<DollarSign className="w-4 h-4" />}
        />
      </div>

      {/* Quick Templates */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-seat-red" />
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
            Quick Templates
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {QUICK_TEMPLATES.map((tpl) => (
            <button
              key={tpl.title}
              onClick={() => applyTemplate(tpl)}
              className="bg-seat-card border border-seat-border rounded-xl p-4 text-left hover:border-seat-red/40 transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                  {DEAL_TYPES.find((t) => t.value === tpl.deal_type)?.label}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-seat-red transition-colors" />
              </div>
              <p className="text-sm font-medium text-white mb-1">{tpl.title}</p>
              <p className="text-xs text-zinc-500">{tpl.discount_value}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Creation Form Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-seat-dark border border-seat-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-seat-red" />
                {editingId ? 'Edit Flash Deal' : 'Create Flash Deal'}
              </h2>
              <button
                onClick={() => {
                  setShowCreate(false);
                  resetForm();
                }}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Title */}
              <Input
                label="Deal Title"
                placeholder="e.g. Happy Hour 2-for-1 Drinks"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />

              {/* Deal Type */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-400">Deal Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DEAL_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setFormDealType(type.value)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                        formDealType === type.value
                          ? 'border-seat-red bg-seat-red/10 text-white'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {type.icon}
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Discount Value */}
              <Input
                label="Discount / Offer"
                placeholder="e.g. 20% Off, Buy 1 Get 1 Free, Free Appetizer"
                value={formDiscount}
                onChange={(e) => setFormDiscount(e.target.value)}
              />

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-400">
                  Description (optional)
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Add more details about the deal..."
                  rows={2}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-seat-red/50 focus:border-seat-red transition-colors resize-none"
                />
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Time"
                  type="datetime-local"
                  value={formStartsAt}
                  onChange={(e) => setFormStartsAt(e.target.value)}
                />
                <Input
                  label="End Time"
                  type="datetime-local"
                  value={formExpiresAt}
                  onChange={(e) => setFormExpiresAt(e.target.value)}
                />
              </div>

              {/* Max Redemptions */}
              <Input
                label="Max Redemptions (optional)"
                type="number"
                placeholder="Leave empty for unlimited"
                value={formMaxRedemptions}
                onChange={(e) => setFormMaxRedemptions(e.target.value)}
              />

              {/* Target Audience */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-400">
                  Target Audience
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TARGET_AUDIENCES.map((aud) => (
                    <button
                      key={aud.value}
                      onClick={() => setFormAudience(aud.value)}
                      className={`px-3 py-2 rounded-lg border text-sm text-left transition-all ${
                        formAudience === aud.value
                          ? 'border-seat-red bg-seat-red/10 text-white'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {aud.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Channel */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-400">Channel</label>
                <div className="flex gap-2">
                  {CHANNELS.map((ch) => (
                    <button
                      key={ch.value}
                      onClick={() => setFormChannel(ch.value)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                        formChannel === ch.value
                          ? 'border-seat-red bg-seat-red/10 text-white'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview Card */}
              {formTitle && formDiscount && (
                <div className="border border-dashed border-zinc-700 rounded-xl p-4">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">
                    Preview
                  </p>
                  <div className="bg-seat-card border border-seat-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-seat-red/10 text-seat-red">
                        {DEAL_TYPES.find((t) => t.value === formDealType)?.label}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                        LIVE
                      </span>
                    </div>
                    <h3 className="text-white font-semibold mb-1">{formTitle}</h3>
                    <p className="text-sm text-seat-red font-medium mb-1">{formDiscount}</p>
                    {formDescription && (
                      <p className="text-xs text-zinc-500">{formDescription}</p>
                    )}
                    <div className="mt-3 flex items-center gap-3 text-xs text-zinc-600">
                      {formStartsAt && (
                        <span className="flex items-center gap-1">
                          <CalendarClock className="w-3 h-3" />
                          {new Date(formStartsAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                      <span>
                        {TARGET_AUDIENCES.find((a) => a.value === formAudience)?.label}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit */}
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleCreate}
                disabled={!formTitle || !formDiscount || !formStartsAt || !formExpiresAt}
              >
                <Zap className="w-4 h-4" />
                {editingId ? 'Save Changes' : 'Launch Deal'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Active Deals */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Timer className="w-4 h-4 text-seat-red" />
          <h2 className="text-lg font-semibold text-white">
            Active Deals
            {activeDeals.length > 0 && (
              <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-seat-red/10 text-seat-red">
                {activeDeals.length} live
              </span>
            )}
          </h2>
        </div>
        {activeDeals.length === 0 && upcomingDeals.length === 0 ? (
          <div className="bg-seat-card border border-seat-border rounded-xl p-8 text-center">
            <Zap className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">
              No active deals right now. Create one to start filling seats!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeDeals.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeDeals.map((deal) => (
                  <ActiveDealCard
                    key={deal.id}
                    deal={deal}
                    onEndEarly={handleEndEarly}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
            {upcomingDeals.length > 0 && (
              <div>
                <p className="text-xs text-zinc-600 uppercase tracking-wider mb-2 mt-4">
                  Upcoming
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="bg-seat-card border border-zinc-800 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">
                            Scheduled
                          </span>
                          <h3 className="text-white font-medium mt-1">{deal.title}</h3>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            Starts{' '}
                            {new Date(deal.starts_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEndEarly(deal.id)}
                          className="text-zinc-500"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Past Deals Table */}
      {pastDeals.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-zinc-500" />
            <h2 className="text-lg font-semibold text-white">Past Deals</h2>
          </div>
          <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-seat-border">
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                      Title
                    </th>
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                      Type
                    </th>
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                      Duration
                    </th>
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                      Redemptions
                    </th>
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                      Est. Revenue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pastDeals.slice(0, 20).map((deal) => {
                    const start = new Date(deal.starts_at);
                    const end = new Date(deal.expires_at);
                    const durationHours = Math.round(
                      (end.getTime() - start.getTime()) / (1000 * 60 * 60)
                    );
                    const dealTypeLabel =
                      DEAL_TYPES.find((t) => t.value === deal.deal_type)?.label ||
                      deal.deal_type;

                    return (
                      <tr
                        key={deal.id}
                        className="border-b border-seat-border/50 last:border-0 hover:bg-zinc-800/30"
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm text-white font-medium">{deal.title}</p>
                          <p className="text-xs text-zinc-600">{deal.discount_value}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                            {dealTypeLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-400">
                          {durationHours}h
                          <span className="text-xs text-zinc-600 ml-1">
                            ({start.toLocaleDateString([], { month: 'short', day: 'numeric' })})
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-white font-medium">
                            {deal.current_redemptions}
                          </span>
                          {deal.max_redemptions && (
                            <span className="text-xs text-zinc-600">
                              {' '}
                              / {deal.max_redemptions}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-400">
                          {formatCurrency(deal.current_redemptions * 25)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
