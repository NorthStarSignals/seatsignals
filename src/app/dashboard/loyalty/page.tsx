'use client';

import { useState, useEffect } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDate, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  Award,
  Trophy,
  Star,
  Gift,
  Target,
  Lock,
  Unlock,
  Crown,
  Plus,
  X,
  Pencil,
  Trash2,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { RewardsCatalogTab } from '@/components/dashboard/loyalty/rewards-catalog-tab';
import { TiersTab } from '@/components/dashboard/loyalty/tiers-tab';
import { PointsHistoryTab } from '@/components/dashboard/loyalty/points-history-tab';
import { ReferralsTab } from '@/components/dashboard/loyalty/referrals-tab';

type LoyaltyTab = 'overview' | 'rewards' | 'tiers' | 'points' | 'referrals';
const TABS: { id: LoyaltyTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'rewards', label: 'Rewards Catalog' },
  { id: 'tiers', label: 'Tiers' },
  { id: 'points', label: 'Points History' },
  { id: 'referrals', label: 'Referrals' },
];

// ── Types ───────────────────────────────────────────────────────────

interface LoyaltyReward {
  id: string;
  name: string;
  description: string | null;
  milestone_type: string;
  milestone_value: number;
  reward_type: string;
  reward_value: string;
  active: boolean;
  created_at: string;
}

interface Achievement {
  id: string;
  customer_id: string;
  reward_id: string;
  earned_at: string;
  redeemed: boolean;
  redeemed_at: string | null;
  redemption_code: string | null;
  customers: { first_name: string; email: string } | null;
  loyalty_rewards: { name: string; reward_type: string; reward_value: string } | null;
}

interface Stats {
  total_rewards_earned: number;
  total_redeemed: number;
  redemption_rate: number;
  most_popular_reward: string;
}

// ── Constants ──────────────────────────────────────────────────────

const MILESTONE_TYPES = [
  { value: 'visit_count', label: 'Visit Count', icon: Target, format: (v: number) => `After ${v} visits` },
  { value: 'total_spend', label: 'Total Spend', icon: Trophy, format: (v: number) => `After $${v} spent` },
  { value: 'referral_count', label: 'Referral Count', icon: Gift, format: (v: number) => `After ${v} referrals` },
  { value: 'anniversary', label: 'Anniversary', icon: Star, format: (v: number) => `${v}-year anniversary` },
];

const REWARD_TYPES = [
  { value: 'discount_pct', label: 'Percentage Discount' },
  { value: 'free_item', label: 'Free Item' },
  { value: 'credit', label: 'Account Credit' },
  { value: 'custom', label: 'Custom Reward' },
];

function formatRewardDisplay(type: string, value: string): string {
  switch (type) {
    case 'discount_pct': return `${value}% off next visit`;
    case 'free_item': return `Free ${value}`;
    case 'credit': return `$${value} credit`;
    case 'custom': return value;
    default: return value;
  }
}

function getMilestoneConfig(type: string) {
  return MILESTONE_TYPES.find(m => m.value === type) || MILESTONE_TYPES[0];
}

// ── Page ────────────────────────────────────────────────────────────

export default function LoyaltyPage() {
  const [activeTab, setActiveTab] = useState<LoyaltyTab>('overview');
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_rewards_earned: 0,
    total_redeemed: 0,
    redemption_rate: 0,
    most_popular_reward: 'None yet',
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingReward, setEditingReward] = useState<LoyaltyReward | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formMilestoneType, setFormMilestoneType] = useState('visit_count');
  const [formMilestoneValue, setFormMilestoneValue] = useState('');
  const [formRewardType, setFormRewardType] = useState('discount_pct');
  const [formRewardValue, setFormRewardValue] = useState('');

  async function fetchData() {
    try {
      const res = await fetch('/api/loyalty');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRewards(data.rewards || []);
      setAchievements(data.achievements || []);
      setStats(data.stats || stats);
    } catch {
      toast.error('Failed to load loyalty data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function resetForm() {
    setFormName('');
    setFormDescription('');
    setFormMilestoneType('visit_count');
    setFormMilestoneValue('');
    setFormRewardType('discount_pct');
    setFormRewardValue('');
    setEditingReward(null);
  }

  function openCreate() {
    resetForm();
    setShowModal(true);
  }

  function openEdit(reward: LoyaltyReward) {
    setEditingReward(reward);
    setFormName(reward.name);
    setFormDescription(reward.description || '');
    setFormMilestoneType(reward.milestone_type);
    setFormMilestoneValue(String(reward.milestone_value));
    setFormRewardType(reward.reward_type);
    setFormRewardValue(reward.reward_value);
    setShowModal(true);
  }

  async function handleSave() {
    if (!formName || !formMilestoneValue || !formRewardValue) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const payload = {
        ...(editingReward ? { id: editingReward.id } : {}),
        name: formName,
        description: formDescription || null,
        milestone_type: formMilestoneType,
        milestone_value: Number(formMilestoneValue),
        reward_type: formRewardType,
        reward_value: formRewardValue,
      };

      const res = await fetch('/api/loyalty', {
        method: editingReward ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save');
      }

      toast.success(editingReward ? 'Reward updated' : 'Reward created');
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save reward');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this reward? This cannot be undone.')) return;

    try {
      const res = await fetch('/api/loyalty', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Reward deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete reward');
    }
  }

  async function handleToggleActive(reward: LoyaltyReward) {
    try {
      const res = await fetch('/api/loyalty', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reward.id, active: !reward.active }),
      });

      if (!res.ok) throw new Error('Failed to update');
      toast.success(reward.active ? 'Reward deactivated' : 'Reward activated');
      fetchData();
    } catch {
      toast.error('Failed to toggle reward');
    }
  }

  // Sort rewards by milestone_value for the milestone ladder
  const sortedMilestones = [...rewards]
    .filter(r => r.milestone_type === 'visit_count')
    .sort((a, b) => a.milestone_value - b.milestone_value);

  const activeRewardsCount = rewards.filter(r => r.active).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-seat-red" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Award className="text-seat-red" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Loyalty Program</h1>
            <p className="text-sm text-zinc-500">Reward your best customers automatically</p>
          </div>
        </div>
        {activeTab === 'overview' && (
          <Button onClick={openCreate}>
            <Plus size={16} className="mr-1.5" />
            Create Reward
          </Button>
        )}
      </div>

      {/* ── Tab Strip ───────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-seat-border overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
              activeTab === t.id
                ? 'text-white border-seat-red'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'rewards' && <RewardsCatalogTab />}
      {activeTab === 'tiers' && <TiersTab />}
      {activeTab === 'points' && <PointsHistoryTab />}
      {activeTab === 'referrals' && <ReferralsTab />}

      {activeTab === 'overview' && (<>
      {/* ── Metric Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Rewards"
          value={activeRewardsCount}
          subtitle={`${rewards.length} total configured`}
          icon={<Award size={18} />}
        />
        <MetricCard
          title="Total Earned"
          value={stats.total_rewards_earned}
          subtitle="Rewards unlocked by customers"
          icon={<Trophy size={18} />}
        />
        <MetricCard
          title="Redemption Rate"
          value={`${stats.redemption_rate}%`}
          subtitle={`${stats.total_redeemed} redeemed`}
          icon={<Target size={18} />}
        />
        <MetricCard
          title="Most Popular"
          value={stats.most_popular_reward}
          subtitle="Top earned reward"
          icon={<Crown size={18} />}
        />
      </div>

      {/* ── Rewards Configuration ───────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Rewards Configuration</h2>
        {rewards.length === 0 ? (
          <div className="bg-seat-card border border-seat-border rounded-xl p-12 text-center">
            <Gift className="mx-auto text-zinc-600 mb-3" size={40} />
            <p className="text-zinc-400 font-medium">No rewards configured yet</p>
            <p className="text-zinc-600 text-sm mt-1">Create your first milestone reward to get started</p>
            <Button className="mt-4" onClick={openCreate}>
              <Plus size={16} className="mr-1.5" />
              Create First Reward
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rewards.map((reward) => {
              const milestone = getMilestoneConfig(reward.milestone_type);
              const MilestoneIcon = milestone.icon;
              return (
                <div
                  key={reward.id}
                  className={`bg-seat-card border rounded-xl p-5 transition-colors ${
                    reward.active ? 'border-seat-border hover:border-zinc-600' : 'border-zinc-800 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-sm">{reward.name}</h3>
                      {reward.description && (
                        <p className="text-zinc-500 text-xs mt-0.5 line-clamp-2">{reward.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 ml-3">
                      {/* Active toggle */}
                      <button
                        onClick={() => handleToggleActive(reward)}
                        className={`w-9 h-5 rounded-full transition-colors relative ${
                          reward.active ? 'bg-seat-red' : 'bg-zinc-700'
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-transform ${
                            reward.active ? 'left-[19px]' : 'left-[3px]'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Milestone */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <MilestoneIcon size={14} className="text-amber-400" />
                    </div>
                    <span className="text-xs text-zinc-400">{milestone.format(reward.milestone_value)}</span>
                  </div>

                  {/* Reward */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Gift size={14} className="text-emerald-400" />
                    </div>
                    <span className="text-xs text-zinc-400">{formatRewardDisplay(reward.reward_type, reward.reward_value)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-zinc-800">
                    <button
                      onClick={() => openEdit(reward)}
                      className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(reward.id)}
                      className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Milestone Ladder + Recent Achievements ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Milestone Ladder */}
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Star size={16} className="text-amber-400" />
            Milestone Ladder
          </h2>
          {sortedMilestones.length === 0 ? (
            <p className="text-xs text-zinc-600 text-center py-6">
              Add visit-based rewards to see the ladder
            </p>
          ) : (
            <div className="relative pl-6">
              {/* Vertical line */}
              <div className="absolute left-[11px] top-2 bottom-2 w-px bg-zinc-700" />
              <div className="space-y-5">
                {sortedMilestones.map((reward, idx) => {
                  const isLast = idx === sortedMilestones.length - 1;
                  return (
                    <div key={reward.id} className="relative flex items-start gap-3">
                      {/* Node */}
                      <div className={`absolute -left-6 w-[22px] h-[22px] rounded-full flex items-center justify-center ${
                        reward.active
                          ? 'bg-seat-red/20 border border-seat-red'
                          : 'bg-zinc-800 border border-zinc-700'
                      }`}>
                        {reward.active ? (
                          <Unlock size={10} className="text-seat-red" />
                        ) : (
                          <Lock size={10} className="text-zinc-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-white">
                          Visit {reward.milestone_value}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {formatRewardDisplay(reward.reward_type, reward.reward_value)}
                        </p>
                        {isLast && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                              <Crown size={9} /> Top Tier
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Recent Achievements */}
        <div className="lg:col-span-2 bg-seat-card border border-seat-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Trophy size={16} className="text-amber-400" />
            Recent Achievements
          </h2>
          {achievements.length === 0 ? (
            <p className="text-xs text-zinc-600 text-center py-6">
              No achievements earned yet. Customers will appear here as they hit milestones.
            </p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {achievements.map((ach) => {
                const customer = ach.customers as { first_name: string; email: string } | null;
                const reward = ach.loyalty_rewards as { name: string; reward_type: string; reward_value: string } | null;
                return (
                  <div
                    key={ach.id}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-seat-red/10 flex items-center justify-center">
                        <Award size={14} className="text-seat-red" />
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium">
                          {customer?.first_name || 'Unknown Customer'}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Earned <span className="text-zinc-400">{reward?.name || 'Reward'}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {ach.redeemed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          <CheckCircle size={10} /> Redeemed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                          <Clock size={10} /> Pending
                        </span>
                      )}
                      <span className="text-[11px] text-zinc-600">
                        {formatDate(ach.earned_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      </>)}

      {/* ── Create / Edit Modal ─────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-seat-dark border border-seat-border rounded-2xl w-full max-w-lg shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-seat-border">
              <h3 className="text-white font-semibold">
                {editingReward ? 'Edit Reward' : 'Create Reward'}
              </h3>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Reward Name</label>
                <Input
                  value={formName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormName(e.target.value)}
                  placeholder="e.g., Loyal Regular Bonus"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description (optional)</label>
                <Input
                  value={formDescription}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormDescription(e.target.value)}
                  placeholder="e.g., Reward for reaching 10 visits"
                />
              </div>

              {/* Milestone Type + Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Milestone Type</label>
                  <select
                    value={formMilestoneType}
                    onChange={(e) => setFormMilestoneType(e.target.value)}
                    className="w-full bg-seat-card border border-seat-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-seat-red"
                  >
                    {MILESTONE_TYPES.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Milestone Value</label>
                  <Input
                    type="number"
                    value={formMilestoneValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormMilestoneValue(e.target.value)}
                    placeholder={formMilestoneType === 'total_spend' ? 'e.g., 500' : 'e.g., 10'}
                  />
                </div>
              </div>

              {/* Reward Type + Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Reward Type</label>
                  <select
                    value={formRewardType}
                    onChange={(e) => setFormRewardType(e.target.value)}
                    className="w-full bg-seat-card border border-seat-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-seat-red"
                  >
                    {REWARD_TYPES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Reward Value</label>
                  <Input
                    value={formRewardValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormRewardValue(e.target.value)}
                    placeholder={
                      formRewardType === 'discount_pct' ? 'e.g., 20' :
                      formRewardType === 'free_item' ? 'e.g., dessert' :
                      formRewardType === 'credit' ? 'e.g., 10' : 'e.g., VIP access'
                    }
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Preview</p>
                <p className="text-sm text-white">
                  {getMilestoneConfig(formMilestoneType).format(Number(formMilestoneValue) || 0)}
                  {' '}&rarr;{' '}
                  {formatRewardDisplay(formRewardType, formRewardValue || '...')}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-seat-border">
              <Button
                variant="ghost"
                onClick={() => { setShowModal(false); resetForm(); }}
              >
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingReward ? 'Save Changes' : 'Create Reward'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
