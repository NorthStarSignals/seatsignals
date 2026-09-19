'use client';

import { useState, useEffect } from 'react';
import { useRestaurant } from '@/hooks/use-restaurant';
import { PLANS } from '@/lib/stripe';
import type { PlanTier } from '@/lib/stripe';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import {
  CreditCard,
  Check,
  Lock,
  ArrowRight,
  Crown,
  Zap,
} from 'lucide-react';

interface BillingData {
  tier: PlanTier;
  plan: { name: string; price: number; priceDisplay: string; features: string[] };
  limits: { customers: number; sequences: number; users: number; ai_requests: number };
  usage: { customers: number; sequences: number; users: number; ai_requests: number };
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

const PLAN_KEYS: PlanTier[] = ['starter', 'growth', 'pro'];

const PLAN_ICONS: Record<PlanTier, React.ReactNode> = {
  starter: <Zap size={20} className="text-zinc-400" />,
  growth: <Crown size={20} className="text-amber-400" />,
  pro: <Crown size={20} className="text-seat-red" />,
  enterprise: <Crown size={20} className="text-purple-400" />,
};

export default function BillingPage() {
  const { restaurant, loading: restaurantLoading } = useRestaurant();
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/billing')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setBilling(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleUpgrade = async (plan: PlanTier) => {
    if (plan === 'starter') return;
    setUpgrading(plan);
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        toast.error(data.error || 'Failed to create checkout session');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setUpgrading(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error('Unable to open billing portal');
      }
    } catch {
      toast.error('Something went wrong');
    }
  };

  if (loading || restaurantLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-seat-card rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-96 bg-seat-card rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const currentTier = billing?.tier || (restaurant?.subscription_tier as PlanTier) || 'starter';

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-seat-card border border-seat-border rounded-lg flex items-center justify-center">
            <CreditCard size={20} className="text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Plans & Billing</h1>
            <p className="text-sm text-zinc-400">
              Manage your subscription and monitor usage
            </p>
          </div>
        </div>
        {billing?.stripe_subscription_id && (
          <Button variant="secondary" size="sm" onClick={handleManageBilling}>
            Manage Billing
            <ArrowRight size={14} />
          </Button>
        )}
      </div>

      {/* Starter upgrade CTA */}
      {currentTier === 'starter' && (
        <div className="bg-gradient-to-r from-seat-red/20 via-seat-card to-seat-card border border-seat-red/30 rounded-xl p-6 flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold text-lg flex items-center gap-2">
              <Zap size={18} className="text-seat-red" />
              Unlock the full power of SeatSignals
            </h3>
            <p className="text-zinc-400 text-sm mt-1">
              Upgrade to Growth to access AI review responses, dead hours engine, catering leads, and more.
            </p>
          </div>
          <Button variant="cta" size="lg" onClick={() => handleUpgrade('growth')}>
            Upgrade to Growth
            <ArrowRight size={16} />
          </Button>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLAN_KEYS.map((key) => {
          const plan = PLANS[key];
          const isCurrent = currentTier === key;
          const isPopular = key === 'growth';
          const tierIndex = PLAN_KEYS.indexOf(key);
          const currentIndex = PLAN_KEYS.indexOf(currentTier);
          const isDowngrade = tierIndex < currentIndex;

          return (
            <div
              key={key}
              className={`relative bg-seat-card rounded-xl border transition-all ${
                isCurrent
                  ? 'border-seat-red shadow-lg shadow-seat-red/10'
                  : 'border-seat-border hover:border-zinc-600'
              }`}
            >
              {/* Popular badge */}
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-seat-red text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}

              <div className="p-6 space-y-5">
                {/* Plan header */}
                <div className="flex items-center gap-2">
                  {PLAN_ICONS[key]}
                  <h3 className="text-white font-semibold text-lg">{plan.name}</h3>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">
                    {plan.price === 0 ? 'Free' : `$${plan.price}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-zinc-400 text-sm">/month</span>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check
                        size={16}
                        className={`mt-0.5 flex-shrink-0 ${
                          isCurrent ? 'text-seat-red' : 'text-zinc-500'
                        }`}
                      />
                      <span className="text-zinc-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action button */}
                <div className="pt-2">
                  {isCurrent ? (
                    <div className="w-full h-9 rounded-lg border border-seat-red/40 bg-seat-red/10 flex items-center justify-center text-sm font-medium text-seat-red">
                      Current Plan
                    </div>
                  ) : isDowngrade ? (
                    <button
                      disabled
                      className="w-full h-9 rounded-lg bg-zinc-800 text-zinc-500 text-sm font-medium cursor-not-allowed flex items-center justify-center gap-1"
                    >
                      <Lock size={14} />
                      Downgrade via Portal
                    </button>
                  ) : (
                    <Button
                      variant={isPopular ? 'cta' : 'primary'}
                      className="w-full"
                      onClick={() => handleUpgrade(key)}
                      disabled={upgrading === key}
                    >
                      {upgrading === key ? (
                        'Redirecting...'
                      ) : (
                        <>
                          Upgrade to {plan.name}
                          <ArrowRight size={14} />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Usage section */}
      {billing && (
        <div className="bg-seat-card border border-seat-border rounded-xl p-6">
          <h2 className="text-white font-semibold text-lg mb-5">Current Usage</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <UsageBar
              label="Customers"
              used={billing.usage.customers}
              limit={billing.limits.customers}
            />
            <UsageBar
              label="Sequences"
              used={billing.usage.sequences}
              limit={billing.limits.sequences}
            />
            <UsageBar
              label="AI Requests"
              used={billing.usage.ai_requests}
              limit={billing.limits.ai_requests}
            />
            <UsageBar
              label="Team Users"
              used={billing.usage.users}
              limit={billing.limits.users}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function UsageBar({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const isUnlimited = !isFinite(limit);
  const pct = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isNearLimit = pct >= 80;
  const isAtLimit = pct >= 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400">{label}</span>
        <span className="text-sm font-medium text-zinc-300">
          {used.toLocaleString()}{' '}
          <span className="text-zinc-500">
            / {isUnlimited ? 'Unlimited' : limit.toLocaleString()}
          </span>
        </span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isAtLimit
              ? 'bg-red-500'
              : isNearLimit
                ? 'bg-amber-500'
                : 'bg-seat-red'
          }`}
          style={{ width: isUnlimited ? '0%' : `${pct}%` }}
        />
      </div>
      {isAtLimit && (
        <p className="text-xs text-red-400">Limit reached - upgrade to continue</p>
      )}
    </div>
  );
}
