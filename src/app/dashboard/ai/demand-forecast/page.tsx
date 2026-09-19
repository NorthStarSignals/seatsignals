'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  Brain,
  TrendingUp,
  Users,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ShoppingBag,
  Calendar,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

const demandForecast = [
  { day: 'Mon Apr 14', predicted_covers: 142, predicted_revenue: 9940, confidence: 85, events: [], weather: 'Sunny 72°F' },
  { day: 'Tue Apr 15', predicted_covers: 158, predicted_revenue: 11060, confidence: 82, events: ['Tax Day'], weather: 'Partly Cloudy 68°F' },
  { day: 'Wed Apr 16', predicted_covers: 165, predicted_revenue: 11550, confidence: 88, events: [], weather: 'Sunny 74°F' },
  { day: 'Thu Apr 17', predicted_covers: 178, predicted_revenue: 12460, confidence: 86, events: ['Local Concert Nearby'], weather: 'Sunny 76°F' },
  { day: 'Fri Apr 18', predicted_covers: 225, predicted_revenue: 15750, confidence: 90, events: ['Good Friday'], weather: 'Sunny 78°F' },
  { day: 'Sat Apr 19', predicted_covers: 248, predicted_revenue: 17360, confidence: 92, events: [], weather: 'Sunny 80°F' },
  { day: 'Sun Apr 20', predicted_covers: 210, predicted_revenue: 14700, confidence: 88, events: ['Easter'], weather: 'Partly Cloudy 75°F' },
];

const itemDemand = [
  { item: 'Filet Mignon', predicted: 42, prep_needed: '45 portions', confidence: 90 },
  { item: 'Grilled Salmon', predicted: 55, prep_needed: '60 portions', confidence: 88 },
  { item: 'Lobster Linguine', predicted: 32, prep_needed: '35 portions', confidence: 85 },
  { item: 'Crispy Calamari', predicted: 68, prep_needed: '72 orders', confidence: 92 },
  { item: 'Chocolate Lava Cake', predicted: 58, prep_needed: '65 cakes', confidence: 87 },
  { item: 'Caesar Salad', predicted: 45, prep_needed: '50 portions', confidence: 91 },
  { item: 'Mushroom Risotto', predicted: 22, prep_needed: '25 portions', confidence: 78 },
  { item: 'Pan-Seared Duck', predicted: 15, prep_needed: '18 portions', confidence: 75 },
];

const accuracy = [
  { week: 'W1', predicted: 980, actual: 945 },
  { week: 'W2', predicted: 1020, actual: 1050 },
  { week: 'W3', predicted: 1100, actual: 1085 },
  { week: 'W4', predicted: 1050, actual: 1072 },
];

export default function DemandForecastPage() {
  const [view, setView] = useState<'daily' | 'items'>('daily');

  const totalPredicted = demandForecast.reduce((s, d) => s + d.predicted_covers, 0);
  const totalRevenue = demandForecast.reduce((s, d) => s + d.predicted_revenue, 0);
  const peakDay = demandForecast.reduce((a, b) => a.predicted_covers > b.predicted_covers ? a : b);
  const avgAccuracy = 96;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
          <Brain className="w-5 h-5 text-seat-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">AI Demand Forecast</h1>
          <p className="text-sm text-zinc-500">Predict next week&apos;s covers, revenue, and prep needs</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Weekly Covers (Est.)" value={totalPredicted.toLocaleString()} icon={<Users size={18} />} />
        <MetricCard title="Weekly Revenue (Est.)" value={formatCurrency(totalRevenue)} icon={<TrendingUp size={18} />} />
        <MetricCard title="Peak Day" value={peakDay.day.split(' ').slice(0, 2).join(' ')} icon={<Calendar size={18} />} />
        <MetricCard title="Model Accuracy" value={`${avgAccuracy}%`} icon={<Brain size={18} />} />
      </div>

      <div className="flex gap-2">
        <button onClick={() => setView('daily')}
          className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            view === 'daily' ? 'bg-seat-red text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white')}>
          Daily Forecast
        </button>
        <button onClick={() => setView('items')}
          className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            view === 'items' ? 'bg-seat-red text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white')}>
          Item Demand
        </button>
      </div>

      {view === 'daily' && (
        <>
          <div className="bg-seat-card border border-seat-border rounded-xl p-5">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">7-Day Cover Forecast</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={demandForecast}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                <XAxis dataKey="day" stroke="#52525B" tick={{ fill: '#71717A', fontSize: 10 }}
                  tickFormatter={v => v.split(' ').slice(0, 2).join(' ')} />
                <YAxis stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: 8 }} />
                <Bar dataKey="predicted_covers" fill="#E11D48" radius={[4, 4, 0, 0]} name="Predicted Covers" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            {demandForecast.map(d => (
              <div key={d.day} className="bg-seat-card border border-seat-border rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-center w-16">
                    <p className="text-sm font-bold text-white">{d.day.split(' ')[1]} {d.day.split(' ')[2]}</p>
                    <p className="text-[10px] text-zinc-500">{d.day.split(' ')[0]}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{d.predicted_covers} covers</span>
                      <span className="text-xs text-zinc-400">·</span>
                      <span className="text-sm text-zinc-300">{formatCurrency(d.predicted_revenue)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-zinc-500">{d.weather}</span>
                      {d.events.map(e => (
                        <span key={e} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">{e}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${d.confidence}%` }} />
                  </div>
                  <span className="text-[10px] text-zinc-500 w-8">{d.confidence}%</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {view === 'items' && (
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Item-Level Demand (Tomorrow)</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-zinc-500 uppercase border-b border-seat-border">
                <th className="text-left py-2 px-3">Item</th>
                <th className="text-right py-2 px-3">Predicted Orders</th>
                <th className="text-right py-2 px-3">Prep Needed</th>
                <th className="text-right py-2 px-3">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {itemDemand.map(item => (
                <tr key={item.item} className="border-b border-seat-border/30">
                  <td className="py-2.5 px-3 text-white font-medium">{item.item}</td>
                  <td className="py-2.5 px-3 text-right text-zinc-300">{item.predicted}</td>
                  <td className="py-2.5 px-3 text-right text-amber-400 font-medium">{item.prep_needed}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={cn('text-xs font-medium',
                      item.confidence >= 85 ? 'text-green-400' : item.confidence >= 75 ? 'text-amber-400' : 'text-zinc-400')}>
                      {item.confidence}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Accuracy Tracker */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Model Accuracy (Predicted vs Actual)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={accuracy}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
            <XAxis dataKey="week" stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
            <YAxis stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: 8 }} />
            <Line type="monotone" dataKey="predicted" stroke="#E11D48" strokeWidth={2} name="Predicted" strokeDasharray="5 5" />
            <Line type="monotone" dataKey="actual" stroke="#22C55E" strokeWidth={2} name="Actual" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
