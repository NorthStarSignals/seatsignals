'use client';

import { canAccess, PLANS } from '@/lib/stripe';
import type { PlanTier } from '@/lib/stripe';
import { Lock } from 'lucide-react';
import Link from 'next/link';

interface UpgradeGateProps {
  feature: string;
  tier: PlanTier;
  children: React.ReactNode;
}

function getRequiredPlan(feature: string): PlanTier {
  // Find the lowest tier that can access this feature
  const tiers: PlanTier[] = ['starter', 'growth', 'pro'];
  for (const t of tiers) {
    if (canAccess(t, feature)) return t;
  }
  return 'pro';
}

export function UpgradeGate({ feature, tier, children }: UpgradeGateProps) {
  if (canAccess(tier, feature)) {
    return <>{children}</>;
  }

  const requiredPlan = getRequiredPlan(feature);
  const planName = PLANS[requiredPlan].name;

  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* Blurred content behind the overlay */}
      <div className="filter blur-sm pointer-events-none select-none opacity-40">
        {children}
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-seat-black/60 via-seat-black/80 to-seat-black/95 flex flex-col items-center justify-center gap-4 rounded-xl">
        <div className="w-14 h-14 rounded-full bg-zinc-800/80 border border-zinc-700 flex items-center justify-center">
          <Lock size={24} className="text-zinc-400" />
        </div>

        <div className="text-center px-4">
          <p className="text-white font-semibold text-lg mb-1">
            Upgrade to {planName}
          </p>
          <p className="text-zinc-400 text-sm max-w-xs">
            This feature requires the {planName} plan or higher to unlock.
          </p>
        </div>

        <Link
          href="/dashboard/billing"
          className="inline-flex items-center gap-2 bg-seat-red text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-seat-red-dark transition-colors text-sm"
        >
          Upgrade Now
        </Link>
      </div>
    </div>
  );
}
