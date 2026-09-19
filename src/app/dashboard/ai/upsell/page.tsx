'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import {
  Brain,
  TrendingUp,
  DollarSign,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { MetricCard } from '@/components/ui/metric-card';

interface UpsellRule {
  id: string;
  trigger_item: string;
  suggestion: string;
  reason: string;
  success_rate: number;
  avg_increase: number;
  times_shown: number;
  accepted: number;
  active: boolean;
}

const upsellRules: UpsellRule[] = [
  { id: 'u1', trigger_item: 'Filet Mignon', suggestion: 'Truffle Butter Add-On (+$8)', reason: '72% of filet orders pair with truffle butter', success_rate: 42, avg_increase: 8, times_shown: 850, accepted: 357, active: true },
  { id: 'u2', trigger_item: 'Any Entrée', suggestion: 'Soup or Salad Starter (+$6)', reason: 'Tables with starters have 18% higher total spend', success_rate: 35, avg_increase: 6, times_shown: 2400, accepted: 840, active: true },
  { id: 'u3', trigger_item: 'Grilled Salmon', suggestion: 'Wine Pairing: Chardonnay ($14/glass)', reason: 'AI detected 68% of salmon orders include white wine', success_rate: 38, avg_increase: 14, times_shown: 620, accepted: 236, active: true },
  { id: 'u4', trigger_item: 'Dessert Menu View', suggestion: 'Coffee or Espresso (+$5)', reason: 'Dessert + coffee combo increases dessert sales by 25%', success_rate: 55, avg_increase: 5, times_shown: 1100, accepted: 605, active: true },
  { id: 'u5', trigger_item: 'Party of 4+', suggestion: 'Family Style Appetizer Platter ($28)', reason: 'Groups of 4+ accept shared appetizers 40% of the time', success_rate: 40, avg_increase: 28, times_shown: 380, accepted: 152, active: true },
  { id: 'u6', trigger_item: 'Lobster Linguine', suggestion: 'Premium Bread Basket (+$4)', reason: 'Lobster pasta pairs well with fresh bread for sauce', success_rate: 30, avg_increase: 4, times_shown: 440, accepted: 132, active: false },
  { id: 'u7', trigger_item: 'Happy Hour Visit', suggestion: 'Upgrade to Premium Spirit (+$3)', reason: 'Happy hour guests upgrade spirits 28% of the time', success_rate: 28, avg_increase: 3, times_shown: 900, accepted: 252, active: true },
  { id: 'u8', trigger_item: 'Check > $100', suggestion: 'Complimentary Dessert Tasting', reason: 'Free tasting leads to 60% full dessert order rate', success_rate: 60, avg_increase: 12, times_shown: 520, accepted: 312, active: true },
];

export default function AIUpsellPage() {
  const [rules, setRules] = useState(upsellRules);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleActive = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  const totalRevenue = rules.filter(r => r.active).reduce((s, r) => s + r.accepted * r.avg_increase, 0);
  const avgSuccessRate = Math.round(rules.filter(r => r.active).reduce((s, r) => s + r.success_rate, 0) / rules.filter(r => r.active).length);
  const totalAccepted = rules.reduce((s, r) => s + r.accepted, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
          <Brain className="w-5 h-5 text-seat-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">AI Upsell Engine</h1>
          <p className="text-sm text-zinc-500">Smart recommendations that increase check size</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Upsell Revenue" value={formatCurrency(totalRevenue)} icon={<DollarSign size={18} />} />
        <MetricCard title="Avg Success Rate" value={`${avgSuccessRate}%`} icon={<TrendingUp size={18} />} />
        <MetricCard title="Total Accepted" value={totalAccepted.toLocaleString()} icon={<Zap size={18} />} />
        <MetricCard title="Active Rules" value={rules.filter(r => r.active).length} icon={<Brain size={18} />} />
      </div>

      <div className="space-y-3">
        {rules.map(rule => {
          const expanded = expandedId === rule.id;
          return (
            <div key={rule.id} className={cn('bg-seat-card border rounded-xl transition-colors',
              rule.active ? 'border-seat-border' : 'border-zinc-800 opacity-60')}>
              <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(expanded ? null : rule.id)}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-seat-red/10 flex items-center justify-center">
                    <Zap size={14} className="text-seat-red" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      When: <span className="text-zinc-300">{rule.trigger_item}</span> → <span className="text-seat-red">{rule.suggestion}</span>
                    </h3>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{rule.reason}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden md:block">
                    <p className={cn('text-sm font-bold', rule.success_rate >= 40 ? 'text-green-400' : rule.success_rate >= 30 ? 'text-amber-400' : 'text-zinc-400')}>
                      {rule.success_rate}% rate
                    </p>
                    <p className="text-[10px] text-zinc-500">{formatCurrency(rule.avg_increase)} avg increase</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); toggleActive(rule.id); }}
                    className={cn('text-[10px] px-3 py-1 rounded-full font-medium',
                      rule.active ? 'bg-green-500/10 text-green-400' : 'bg-zinc-800 text-zinc-500')}>
                    {rule.active ? 'Active' : 'Paused'}
                  </button>
                  {expanded ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
                </div>
              </div>

              {expanded && (
                <div className="border-t border-seat-border/30 p-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-zinc-800/30 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-zinc-500">Times Shown</p>
                      <p className="text-lg font-bold text-white">{rule.times_shown.toLocaleString()}</p>
                    </div>
                    <div className="bg-zinc-800/30 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-zinc-500">Accepted</p>
                      <p className="text-lg font-bold text-green-400">{rule.accepted.toLocaleString()}</p>
                    </div>
                    <div className="bg-zinc-800/30 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-zinc-500">Success Rate</p>
                      <p className="text-lg font-bold text-white">{rule.success_rate}%</p>
                    </div>
                    <div className="bg-zinc-800/30 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-zinc-500">Revenue Generated</p>
                      <p className="text-lg font-bold text-white">{formatCurrency(rule.accepted * rule.avg_increase)}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-seat-red rounded-full" style={{ width: `${rule.success_rate}%` }} />
                    </div>
                    <div className="flex justify-between mt-1 text-[10px] text-zinc-500">
                      <span>0%</span>
                      <span>Conversion Rate</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
