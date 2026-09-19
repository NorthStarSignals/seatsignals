'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

type Variant = 'success' | 'warning' | 'danger' | 'neutral';

interface StatBadgeProps {
  value: string | number;
  trend?: number;
  label?: string;
  variant?: Variant;
  className?: string;
}

const variantStyles: Record<Variant, { bg: string; text: string; trendUp: string; trendDown: string }> = {
  success: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    trendUp: 'text-emerald-400',
    trendDown: 'text-red-400',
  },
  warning: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    trendUp: 'text-amber-400',
    trendDown: 'text-red-400',
  },
  danger: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    trendUp: 'text-red-400',
    trendDown: 'text-red-400',
  },
  neutral: {
    bg: 'bg-zinc-700/50',
    text: 'text-zinc-300',
    trendUp: 'text-emerald-400',
    trendDown: 'text-red-400',
  },
};

export function StatBadge({
  value,
  trend,
  label,
  variant = 'neutral',
  className,
}: StatBadgeProps) {
  const styles = variantStyles[variant];
  const trendPositive = trend !== undefined && trend > 0;
  const trendNeutral = trend === undefined || trend === 0;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1',
        styles.bg,
        className,
      )}
    >
      {/* Value */}
      <span className={cn('text-sm font-semibold', styles.text)}>
        {value}
      </span>

      {/* Trend indicator */}
      {trend !== undefined && (
        <span
          className={cn(
            'inline-flex items-center gap-0.5 text-[11px] font-medium',
            trendNeutral
              ? 'text-zinc-500'
              : trendPositive
                ? styles.trendUp
                : styles.trendDown,
          )}
        >
          {trendNeutral ? (
            <Minus className="w-3 h-3" />
          ) : trendPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}

      {/* Label */}
      {label && (
        <span className="text-[11px] text-zinc-500 ml-0.5">{label}</span>
      )}
    </span>
  );
}

export type { StatBadgeProps, Variant as StatBadgeVariant };
