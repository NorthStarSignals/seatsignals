'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { CheckCircle, Circle, Minus } from 'lucide-react';

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

export default function DeliveryPage() {
  const [checklist, setChecklist] = useState(AUDIT_CHECKLIST);
  const [platform, setPlatform] = useState('UberEats');
  const [date, setDate] = useState('');
  const [orders, setOrders] = useState('');
  const [revenue, setRevenue] = useState('');
  const [aov, setAov] = useState('');
  const [rating, setRating] = useState('');

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

  const addMetrics = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/delivery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform,
        date: date || new Date().toISOString().split('T')[0],
        orders: parseInt(orders) || 0,
        revenue: parseFloat(revenue) || 0,
        avg_order_value: parseFloat(aov) || 0,
        rating: parseFloat(rating) || 0,
      }),
    });
    if (res.ok) {
      toast.success('Metrics saved');
      setOrders(''); setRevenue(''); setAov(''); setRating('');
    }
  };

  const categories = Array.from(new Set(checklist.map(i => i.category)));

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Delivery Audit</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Audit Score" value={`${score}%`} subtitle={`${done}/${total} items complete`} />
        <MetricCard title="High Impact Items" value={recommendations.filter(r => r.impact === 'high').length} subtitle="Remaining" />
        <MetricCard title="Platforms" value="3" subtitle="UberEats, DoorDash, Grubhub" />
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
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-6">
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

      {/* Monthly Metrics Entry */}
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Log Monthly Delivery Stats</h2>
        <form onSubmit={addMetrics} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Platform</label>
            <select value={platform} onChange={e => setPlatform(e.target.value)}
              className="w-full bg-navy-700 border border-navy-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-accent-blue">
              <option>UberEats</option>
              <option>DoorDash</option>
              <option>Grubhub</option>
            </select>
          </div>
          <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
          <Input label="Orders" type="number" placeholder="150" value={orders} onChange={e => setOrders(e.target.value)} />
          <Input label="Revenue" type="number" step="0.01" placeholder="3750.00" value={revenue} onChange={e => setRevenue(e.target.value)} />
          <Input label="Avg Order Value" type="number" step="0.01" placeholder="25.00" value={aov} onChange={e => setAov(e.target.value)} />
          <Input label="Rating" type="number" step="0.1" placeholder="4.5" value={rating} onChange={e => setRating(e.target.value)} />
          <div className="md:col-span-3">
            <Button type="submit" variant="cta">Save Metrics</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
