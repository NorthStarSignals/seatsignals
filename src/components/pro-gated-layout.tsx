'use client';

import { PlanGate } from '@/components/plan-gate';

/**
 * Wraps a route segment so only Pro/Enterprise/Admin users see its contents.
 * Growth and Starter users see an upgrade stub at the route.
 */
export function ProGatedLayout({
  children,
  featureName,
}: {
  children: React.ReactNode;
  featureName?: string;
}) {
  return (
    <PlanGate allowed={['pro', 'enterprise']} featureName={featureName} upgradeToPlan="Pro">
      {children}
    </PlanGate>
  );
}
