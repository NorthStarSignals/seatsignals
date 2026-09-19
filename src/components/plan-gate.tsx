'use client';

import Link from 'next/link';
import { Lock, Sparkles } from 'lucide-react';
import { useHasPlan, Plan } from '@/hooks/use-plan';

interface PlanGateProps {
  allowed: Plan[];
  children: React.ReactNode;
  /** If true, render an upgrade stub when gated. If false, render nothing. Default: true. */
  showUpgrade?: boolean;
  /** Override for the feature name shown in the upgrade stub. */
  featureName?: string;
  /** Tier name shown in the upgrade stub (e.g. "Pro", "Enterprise"). */
  upgradeToPlan?: string;
}

export function PlanGate({
  allowed,
  children,
  showUpgrade = true,
  featureName,
  upgradeToPlan,
}: PlanGateProps) {
  const hasAccess = useHasPlan(allowed);

  if (hasAccess) return <>{children}</>;
  if (!showUpgrade) return null;

  // Derive the upgrade target from the allowed list
  const target =
    upgradeToPlan ||
    (allowed.includes('pro')
      ? 'Pro'
      : allowed.includes('enterprise')
        ? 'Enterprise'
        : 'Growth');

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto bg-seat-card border border-seat-border rounded-2xl p-10 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-seat-red/10 border border-seat-red/30 flex items-center justify-center mb-5">
          <Lock className="w-6 h-6 text-seat-red" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-seat-red/10 border border-seat-red/30 text-xs text-seat-red mb-4">
          <Sparkles className="w-3 h-3" />
          {target} plan feature
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {featureName ? `${featureName} is` : 'This is'} a {target} feature
        </h2>
        <p className="text-sm text-zinc-400 mb-6 max-w-md mx-auto">
          Upgrade to {target} to unlock this and every other advanced capability — multi-location
          comparison, corporate accounts, deep financial analytics, and more.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/pricing"
            className="px-5 py-2.5 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg text-sm font-semibold transition"
          >
            See {target} plan
          </Link>
          <Link
            href="/dashboard/billing"
            className="px-5 py-2.5 bg-seat-black border border-seat-border hover:border-zinc-600 text-white rounded-lg text-sm font-medium transition"
          >
            Upgrade now
          </Link>
        </div>
      </div>
    </div>
  );
}
