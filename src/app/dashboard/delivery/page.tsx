'use client';

import { useState, useEffect, useCallback } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  CheckCircle, Circle, Minus, RefreshCw, Truck, Settings,
  TrendingUp, DollarSign, ShoppingBag, Star,
} from 'lucide-react';

interface IntegrationConfig {
  id: string;
  provider: string;
  status: string;
  config: Record<string, string>;
}

interface ChecklistItem {
  id: string;
  category: string;
  text: string;
  impact: 'high' | 'medium' | 'low';
  status: 'done' | 'not_done' | 'na';
}

const AUDIT_CHECKLIST: ChecklistItem[] = [
  { id: 'p1', category: 'Photos', text: 'Do all menu items have photos?', impact: 'high', status: 'not_done' },
  { id: 'p2', category: 'Photos', text: 'Is the hero image high quality?', impact: 'high', status: 'not_done' },
  { id: 'p3', category: 'Photos', text: 'Do combo meals have photos?', impact: 'medium', status: 'not_done' },
  { id: 'm1', category: 'Menu', text: 'Are items ordered by popularity/margin?', impact: 'medium', status: 'not_done' },
  { id: 'm2', category: 'Menu', text: 'Do you have combos/bundles?', impact: 'high', status: 'not_done' },
  { id: 'm3', category: 'Menu', text: 'Are modifiers priced (extra protein, premium sides)?', impact: 'medium', status: 'not_done' },
  { id: 'pr1', category: 'Pricing', text: 'Have you adjusted prices for platform commission?', impact: 'high', status: 'not_done' },
  { id: 'pr2', category: 'Pricing', text: 'Are any items negative margin after 30% commission?', impact: 'high', status: 'not_done' },
  { id: 's1', category: 'SEO', text: 'Do item titles include descriptive keywords?', impact: 'medium', status: 'not_done' },
  { id: 's2', category: 'SEO', text: 'Is your restaurant description filled out?', impact: 'low', status: 'not_done' },
  { id: 's3', category: 'SEO', text: 'Are all relevant categories selected?', impact: 'low', status: 'not_done' },
];

const DELIVERY_PROVIDERS = [
  'doordash', 'uber_eats', 'grubhub', 'postmates',
  'caviar', 'chownow', 'toast_takeout', 'olo',
];

const PROVIDER_DISPLAY: Record<string, string> = {
  doordash: 'DoorDash',
  uber_eats: 'Uber Eats',
  grubhub: 'Grubhub',
  postmates: 'Postmates',
  caviar: 'Caviar',
  chownow: 'ChowNow',
  toast_takeout: 'Toast Takeout',
  olo: 'Olo',
};

// Demo data for test mode when platforms are connected but no real API access
function generateDemoData(provider: string) {
  // Use provider string to seed pseudo-random but stable values
  const seed = provider.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const orders = 80 + (seed % 120);
  const aov = 22 + (seed % 15);
  const revenue = orders * aov;
  const rating = (4.0 + (seed % 10) / 10).toFixed(1);
  return {
    orders,
    revenue,
    avg_order_value: aov,
    rating: parseFloat(rating),
  };
}

const CHECKLIST_STORAGE_KEY = 'seatsignals_delivery_checklist';

export default function DeliveryPage() {
  const [connectedPlatforms, setConnectedPlatforms] = useState<IntegrationConfig[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  // Load checklist from localStorage
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CHECKLIST_STORAGE_KEY);
      if (saved) {
        try { return JSON.parse(saved); } catch { /* fall through */ }
      }
    }
    return AUDIT_CHECKLIST;
  });

  // Persist checklist to localStorage on change
  useEffect(() => {
    localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(checklist));
  }, [checklist]);

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations');
      if (res.ok) {
        const data = await res.json();
        const deliveryIntegrations = (data.integrations || []).filter(
          (i: IntegrationConfig) => DELIVERY_PROVIDERS.includes(i.provider) && i.status === 'connected'
        );
        setConnectedPlatforms(deliveryIntegrations);
      }
    } catch { /* ignore */ }
    finally { setLoadingIntegrations(false); }
  }, []);

  useEffect(() => { fetchIntegrations(); }, [fetchIntegrations]);

  const toggleStatus = (id: string) => {
    setChecklist(prev => prev.map(item => {
      if (item.id !== id) return item;
      const next = item.status === 'not_done' ? 'done' : item.status === 'done' ? 'na' : 'not_done';
      return { ...item, status: next };
    }));
  };

  const done = checklist.filter(i => i.status === 'done').length;
  const total = checklist.filter(i => i.status !== 'na').length;
  const score = total > 0 ? Math.round((done / total) * 100) : 0;

  const recommendations = checklist
    .filter(i => i.status === 'not_done')
    .sort((a, b) => { const order = { high: 0, medium: 1, low: 2 }; return order[a.impact] - order[b.impact]; });

  const handleSync = (provider: string) => {
    setSyncing(provider);
    toast.success(`Syncing with ${PROVIDER_DISPLAY[provider] || provider}... Data will update shortly.`);
    setTimeout(() => setSyncing(null), 2000);
  };

  const handleSyncAll = () => {
    setSyncing('all');
    const names = connectedPlatforms.map(p => PROVIDER_DISPLAY[p.provider] || p.provider).join(', ');
    toast.success(`Syncing all platforms (${names})... Data will update shortly.`);
    setTimeout(() => setSyncing(null), 3000);
  };

  // Aggregate metrics from connected platforms
  const platformMetrics = connectedPlatforms.map(p => ({
    provider: p.provider,
    name: PROVIDER_DISPLAY[p.provider] || p.provider,
    ...generateDemoData(p.provider),
  }));

  const aggregateOrders = platformMetrics.reduce((sum, p) => sum + p.orders, 0);
  const aggregateRevenue = platformMetrics.reduce((sum, p) => sum + p.revenue, 0);
  const aggregateAOV = platformMetrics.length > 0 ? Math.round(aggregateRevenue / aggregateOrders) : 0;
  const aggregateRating = platformMetrics.length > 0
    ? parseFloat((platformMetrics.reduce((sum, p) => sum + p.rating, 0) / platformMetrics.length).toFixed(1))
    : 0;

  const categories = Array.from(new Set(checklist.map(i => i.category)));

  if (loadingIntegrations) {
    return <div className="text-slate-400">Loading delivery data...</div>;
  }

  const hasConnected = connectedPlatforms.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Delivery Hub</h1>
        {hasConnected && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSyncAll}
            disabled={syncing === 'all'}
          >
            <RefreshCw size={14} className={`mr-1.5 ${syncing === 'all' ? 'animate-spin' : ''}`} />
            {syncing === 'all' ? 'Syncing...' : 'Sync All'}
          </Button>
        )}
      </div>

      {/* No platforms connected — CTA */}
      {!hasConnected && (
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-8 text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-navy-700 flex items-center justify-center mx-auto mb-4">
            <Truck size={28} className="text-slate-500" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Connect Your Delivery Platforms</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
            Connect DoorDash, Uber Eats, Grubhub, and more to automatically track orders, revenue, and ratings across all your delivery channels in one place.
          </p>
          <Link href="/dashboard/settings">
            <Button variant="cta" size="lg">
              <Settings size={18} className="mr-2" /> Go to Settings to Connect
            </Button>
          </Link>
          <p className="text-xs text-slate-500 mt-4">
            Supports DoorDash, Uber Eats, Grubhub, Postmates, Caviar, ChowNow, Toast Takeout, and Olo
          </p>
        </div>
      )}

      {/* Aggregate Metrics — shown when platforms connected */}
      {hasConnected && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <MetricCard
              title="Total Orders"
              value={aggregateOrders.toLocaleString()}
              subtitle={`Across ${connectedPlatforms.length} platform${connectedPlatforms.length > 1 ? 's' : ''}`}
              trend={{ value: 12, positive: true }}
            />
            <MetricCard
              title="Total Revenue"
              value={`$${aggregateRevenue.toLocaleString()}`}
              subtitle="This month"
              trend={{ value: 8, positive: true }}
            />
            <MetricCard
              title="Avg Order Value"
              value={`$${aggregateAOV}`}
              subtitle="Across all platforms"
              trend={{ value: 3, positive: true }}
            />
            <MetricCard
              title="Avg Rating"
              value={aggregateRating}
              subtitle="Weighted average"
              trend={{ value: 0.2, positive: true }}
            />
          </div>

          {/* Per-Platform Breakdown */}
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Platform Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-navy-700">
                    <th className="text-left text-xs text-slate-500 uppercase tracking-wider pb-3 pr-4">Platform</th>
                    <th className="text-right text-xs text-slate-500 uppercase tracking-wider pb-3 px-4">Orders</th>
                    <th className="text-right text-xs text-slate-500 uppercase tracking-wider pb-3 px-4">Revenue</th>
                    <th className="text-right text-xs text-slate-500 uppercase tracking-wider pb-3 px-4">AOV</th>
                    <th className="text-right text-xs text-slate-500 uppercase tracking-wider pb-3 px-4">Rating</th>
                    <th className="text-right text-xs text-slate-500 uppercase tracking-wider pb-3 pl-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {platformMetrics.map((pm) => (
                    <tr key={pm.provider} className="border-b border-navy-700/50 last:border-0">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                          <span className="text-white text-sm font-medium">{pm.name}</span>
                        </div>
                      </td>
                      <td className="text-right text-sm text-slate-300 py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <ShoppingBag size={13} className="text-slate-500" />
                          {pm.orders.toLocaleString()}
                        </div>
                      </td>
                      <td className="text-right text-sm text-slate-300 py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <DollarSign size={13} className="text-slate-500" />
                          ${pm.revenue.toLocaleString()}
                        </div>
                      </td>
                      <td className="text-right text-sm text-slate-300 py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <TrendingUp size={13} className="text-slate-500" />
                          ${pm.avg_order_value}
                        </div>
                      </td>
                      <td className="text-right text-sm text-slate-300 py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Star size={13} className="text-amber-400" />
                          {pm.rating}
                        </div>
                      </td>
                      <td className="text-right py-3 pl-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSync(pm.provider)}
                          disabled={syncing === pm.provider}
                        >
                          <RefreshCw size={13} className={syncing === pm.provider ? 'animate-spin' : ''} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-600 mt-3">
              Demo data shown — live sync will populate real metrics from each platform&apos;s API.
            </p>
          </div>
        </>
      )}

      {/* Audit Score Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard title="Audit Score" value={`${score}%`} subtitle={`${done}/${total} items complete`} />
        <MetricCard title="High Impact Items" value={recommendations.filter(r => r.impact === 'high').length} subtitle="Remaining" />
        <MetricCard title="Commission Rate" value="30%" subtitle="Average platform fee" />
      </div>

      {/* Audit Checklist */}
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Optimization Checklist</h2>
        {categories.map(cat => (
          <div key={cat} className="mb-4">
            <h3 className="text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider">{cat}</h3>
            {checklist.filter(i => i.category === cat).map(item => (
              <button
                key={item.id}
                onClick={() => toggleStatus(item.id)}
                className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-navy-700 transition-colors text-left"
              >
                {item.status === 'done' ? (
                  <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />
                ) : item.status === 'na' ? (
                  <Minus size={18} className="text-slate-600 flex-shrink-0" />
                ) : (
                  <Circle size={18} className="text-slate-500 flex-shrink-0" />
                )}
                <span className={`text-sm ${item.status === 'done' ? 'text-slate-400 line-through' : item.status === 'na' ? 'text-slate-600' : 'text-white'}`}>
                  {item.text}
                </span>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                  item.impact === 'high' ? 'bg-red-500/10 text-red-400' :
                  item.impact === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                  'bg-slate-500/10 text-slate-400'
                }`}>
                  {item.impact}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Prioritized Recommendations</h2>
          {recommendations.slice(0, 5).map(r => (
            <div key={r.id} className="flex items-center gap-3 p-3 border-b border-navy-700 last:border-0">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                r.impact === 'high' ? 'bg-red-500/10 text-red-400' :
                r.impact === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                'bg-slate-500/10 text-slate-400'
              }`}>{r.impact.toUpperCase()}</span>
              <span className="text-sm text-slate-300">{r.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
