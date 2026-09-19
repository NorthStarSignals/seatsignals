'use client';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { MetricCard } from '@/components/ui/metric-card';

interface MenuSuggestion {
  type: 'price_increase' | 'price_decrease' | 'remove' | 'promote' | 'reposition' | 'new_item';
  item: string;
  current_price?: number;
  suggested_price?: number;
  reason: string;
  estimated_impact: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
}

const suggestions: MenuSuggestion[] = [
  { type: 'price_increase', item: 'Filet Mignon', current_price: 48, suggested_price: 52, reason: 'Price elasticity analysis shows demand is inelastic — 95% of orders maintained even at competitors\' $55 price point', estimated_impact: '+$740/month revenue', confidence: 88, priority: 'high' },
  { type: 'promote', item: 'Chocolate Lava Cake', reason: 'Highest margin item (82%) with 4.9 rating but only ordered by 28% of tables. Feature prominently on menu and train servers to suggest', estimated_impact: '+$1,200/month revenue', confidence: 92, priority: 'high' },
  { type: 'price_decrease', item: 'Pan-Seared Duck', current_price: 38, suggested_price: 34, reason: 'Orders declined 22% in 3 months. At $34, demand modeling predicts 40% increase in orders, net positive margin', estimated_impact: '+$480/month profit', confidence: 75, priority: 'medium' },
  { type: 'remove', item: 'French Onion Soup', reason: 'Lowest orders (85/month), 4.1 rating, and takes 45min prep time. Replacing with a seasonal soup could improve kitchen efficiency and appeal', estimated_impact: '-$1,020 revenue but +$600 labor savings', confidence: 72, priority: 'medium' },
  { type: 'reposition', item: 'Mushroom Risotto', reason: 'Currently buried on page 2. Moving to featured vegetarian section would capture growing plant-forward demand (+15% YoY in segment)', estimated_impact: '+$650/month from repositioning alone', confidence: 80, priority: 'medium' },
  { type: 'new_item', item: 'Add: Wagyu Burger ($28)', reason: 'Gap analysis: no premium burger option. Competitors with Wagyu burgers see 12-15% of dinner orders. Low food cost at $8', estimated_impact: '+$2,800/month potential', confidence: 70, priority: 'high' },
  { type: 'price_increase', item: 'Crispy Calamari', current_price: 14, suggested_price: 16, reason: 'Most popular appetizer with 78% margin. $2 increase within market range ($14-18 for comparable items)', estimated_impact: '+$640/month revenue', confidence: 85, priority: 'medium' },
  { type: 'promote', item: 'Kale & Quinoa Salad', reason: 'Only allergen-free, vegan, GF item on menu. Health-conscious segment growing 20% — promote as a hero item for dietary needs', estimated_impact: '+$400/month from underserved segment', confidence: 68, priority: 'low' },
];

const TYPE_CONFIG: Record<string, { icon: typeof TrendingUp; color: string; label: string }> = {
  price_increase: { icon: TrendingUp, color: 'text-green-400 bg-green-500/10', label: 'Price Increase' },
  price_decrease: { icon: TrendingDown, color: 'text-blue-400 bg-blue-500/10', label: 'Price Decrease' },
  remove: { icon: AlertTriangle, color: 'text-red-400 bg-red-500/10', label: 'Consider Removing' },
  promote: { icon: TrendingUp, color: 'text-purple-400 bg-purple-500/10', label: 'Promote' },
  reposition: { icon: Brain, color: 'text-amber-400 bg-amber-500/10', label: 'Reposition' },
  new_item: { icon: Check, color: 'text-cyan-400 bg-cyan-500/10', label: 'New Item' },
};

export default function MenuOptimizerPage() {
  const totalImpact = '+$6,910/month';
  const highPriority = suggestions.filter(s => s.priority === 'high').length;
  const avgConfidence = Math.round(suggestions.reduce((s, sg) => s + sg.confidence, 0) / suggestions.length);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
          <Brain className="w-5 h-5 text-seat-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">AI Menu Optimizer</h1>
          <p className="text-sm text-zinc-500">Data-driven recommendations for menu pricing and composition</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Est. Total Impact" value={totalImpact} icon={<DollarSign size={18} />} />
        <MetricCard title="Suggestions" value={suggestions.length} icon={<Brain size={18} />} />
        <MetricCard title="High Priority" value={highPriority} icon={<AlertTriangle size={18} />} />
        <MetricCard title="Avg Confidence" value={`${avgConfidence}%`} icon={<TrendingUp size={18} />} />
      </div>

      <div className="space-y-3">
        {suggestions.map((s, i) => {
          const config = TYPE_CONFIG[s.type];
          const Icon = config.icon;
          return (
            <div key={i} className="bg-seat-card border border-seat-border rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', config.color)}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', config.color)}>{config.label}</span>
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium',
                        s.priority === 'high' ? 'bg-red-500/10 text-red-400' :
                        s.priority === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-zinc-800 text-zinc-400')}>
                        {s.priority} priority
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-white mt-1">{s.item}</h3>
                    {s.current_price && s.suggested_price && (
                      <p className="text-sm mt-0.5">
                        <span className="text-zinc-400">{formatCurrency(s.current_price)}</span>
                        <span className="text-zinc-600 mx-2">→</span>
                        <span className="text-white font-bold">{formatCurrency(s.suggested_price)}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-400">{s.estimated_impact}</p>
                  <div className="flex items-center gap-1 mt-1 justify-end">
                    <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-seat-red rounded-full" style={{ width: `${s.confidence}%` }} />
                    </div>
                    <span className="text-[10px] text-zinc-500">{s.confidence}%</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">{s.reason}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
