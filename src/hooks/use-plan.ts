'use client';

import { useUser } from '@clerk/nextjs';
import { useRestaurant } from './use-restaurant';
import { useEffect, useState } from 'react';

export type Plan = 'starter' | 'growth' | 'pro' | 'enterprise';

// Admin override via localStorage — set by the dev plan switcher.
// Only honored when the Clerk user is whitelisted as admin.
const ADMIN_OVERRIDE_KEY = 'seatsignals_admin_plan_override';

/**
 * Returns the effective plan for the current tenant.
 * If the user is an admin AND has set a plan-switcher override, returns that instead.
 */
export function usePlan(): Plan {
  const { restaurant } = useRestaurant();
  const isAdmin = useIsAdmin();
  const [override, setOverride] = useState<Plan | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    try {
      const raw = window.localStorage.getItem(ADMIN_OVERRIDE_KEY);
      if (raw) setOverride(raw as Plan);
    } catch {}
    const handler = () => {
      try {
        const raw = window.localStorage.getItem(ADMIN_OVERRIDE_KEY);
        setOverride(raw ? (raw as Plan) : null);
      } catch {}
    };
    window.addEventListener('storage', handler);
    window.addEventListener('seatsignals:plan-override', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('seatsignals:plan-override', handler);
    };
  }, [isAdmin]);

  if (isAdmin && override) return override;
  const tier = (restaurant?.subscription_tier as Plan | undefined) || 'starter';
  return tier;
}

/**
 * Check if the Clerk user is whitelisted as a platform admin.
 * Whitelist is read from NEXT_PUBLIC_ADMIN_USER_IDS (comma-separated Clerk user ids).
 */
export function useIsAdmin(): boolean {
  const { user } = useUser();
  if (!user) return false;
  const raw = process.env.NEXT_PUBLIC_ADMIN_USER_IDS || '';
  const admins = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return admins.includes(user.id);
}

/**
 * Set the admin plan override. No-op if the user isn't an admin.
 * Call from the dev plan switcher.
 */
export function setPlanOverride(plan: Plan | null) {
  try {
    if (plan === null) {
      window.localStorage.removeItem(ADMIN_OVERRIDE_KEY);
    } else {
      window.localStorage.setItem(ADMIN_OVERRIDE_KEY, plan);
    }
    window.dispatchEvent(new Event('seatsignals:plan-override'));
  } catch {}
}

/**
 * Returns true if the current effective plan is in the allowed list.
 * Admins always pass (via their override or real plan).
 */
export function useHasPlan(allowed: Plan[]): boolean {
  const plan = usePlan();
  return allowed.includes(plan);
}

// Plan hierarchy — lower index = lower tier. Useful for "at least X" checks.
const ORDER: Plan[] = ['starter', 'growth', 'pro', 'enterprise'];

export function planAtLeast(plan: Plan, minimum: Plan): boolean {
  return ORDER.indexOf(plan) >= ORDER.indexOf(minimum);
}
