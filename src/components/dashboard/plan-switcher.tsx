'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Shield, Check } from 'lucide-react';
import { useIsAdmin, usePlan, setPlanOverride, Plan } from '@/hooks/use-plan';
import { cn } from '@/lib/utils';

/**
 * Admin-only: lets Malik impersonate any plan tier to demo what that customer sees.
 * Renders nothing for non-admin users.
 */
export function PlanSwitcher() {
  const isAdmin = useIsAdmin();
  const plan = usePlan();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!isAdmin) return null;

  const plans: { value: Plan; label: string; desc: string }[] = [
    { value: 'starter', label: 'Starter', desc: 'Free tier' },
    { value: 'growth', label: 'Growth', desc: '$299/mo' },
    { value: 'pro', label: 'Pro', desc: '$499/mo' },
    { value: 'enterprise', label: 'Enterprise', desc: 'Custom' },
  ];

  const pick = (p: Plan | null) => {
    setPlanOverride(p);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border border-seat-border text-zinc-400 hover:text-white hover:border-zinc-600 transition"
        title="Admin: switch demo plan"
      >
        <Shield className="w-3 h-3 text-seat-red" />
        <span className="uppercase tracking-wide">{plan}</span>
        <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-56 bg-seat-card border border-seat-border rounded-lg shadow-2xl overflow-hidden">
          <div className="px-3 py-2 border-b border-seat-border bg-seat-black/50">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Demo as plan</div>
            <div className="text-[10px] text-zinc-600 mt-0.5">Admin-only preview</div>
          </div>
          <div className="p-1">
            {plans.map((p) => (
              <button
                key={p.value}
                onClick={() => pick(p.value)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded text-left text-sm transition',
                  plan === p.value ? 'bg-seat-red/10 text-white' : 'text-zinc-300 hover:bg-zinc-800'
                )}
              >
                <div>
                  <div className="font-medium">{p.label}</div>
                  <div className="text-[10px] text-zinc-500">{p.desc}</div>
                </div>
                {plan === p.value && <Check className="w-4 h-4 text-seat-red" />}
              </button>
            ))}
          </div>
          <div className="p-1 border-t border-seat-border">
            <button
              onClick={() => pick(null)}
              className="w-full px-3 py-2 rounded text-left text-xs text-zinc-500 hover:text-white hover:bg-zinc-800"
            >
              Clear override (use real plan)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
