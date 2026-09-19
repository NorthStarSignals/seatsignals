'use client';

import { MetricCard } from '@/components/ui/metric-card';
import { Building2, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const locations = [
  { id: 'main', name: 'Downtown', revenue: 487500, covers: 4280, avgCheck: 113.9, labor: 28.4, food: 31.2, satisfaction: 4.7 },
  { id: 'west', name: 'Westside', revenue: 392100, covers: 3640, avgCheck: 107.7, labor: 30.1, food: 32.8, satisfaction: 4.5 },
  { id: 'north', name: 'Uptown', revenue: 521800, covers: 4590, avgCheck: 113.7, labor: 27.2, food: 30.5, satisfaction: 4.8 },
  { id: 'south', name: 'Southbank', revenue: 342900, covers: 3210, avgCheck: 106.8, labor: 31.5, food: 33.4, satisfaction: 4.4 },
];

const monthlyComparison = [
  { month: 'Jan', Downtown: 412, Westside: 358, Uptown: 478, Southbank: 312 },
  { month: 'Feb', Downtown: 438, Westside: 372, Uptown: 491, Southbank: 325 },
  { month: 'Mar', Downtown: 487, Westside: 392, Uptown: 521, Southbank: 343 },
];

const radarData = [
  { metric: 'Revenue', Downtown: 93, Uptown: 100 },
  { metric: 'Covers', Downtown: 93, Uptown: 100 },
  { metric: 'Avg Check', Downtown: 100, Uptown: 100 },
  { metric: 'Labor Eff', Downtown: 96, Uptown: 100 },
  { metric: 'Food Cost', Downtown: 98, Uptown: 100 },
  { metric: 'CSAT', Downtown: 98, Uptown: 100 },
];

export default function LocationsComparePage() {
  const totalRev = locations.reduce((s, l) => s + l.revenue, 0);
  const totalCovers = locations.reduce((s, l) => s + l.covers, 0);
  const best = locations.reduce((b, l) => l.revenue > b.revenue ? l : b);
  const worst = locations.reduce((w, l) => l.revenue < w.revenue ? l : w);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Multi-Location Comparison</h1>
        <p className="text-seat-muted mt-1">Compare performance across all your restaurants</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Total Revenue" value={`$${(totalRev / 1000).toFixed(0)}K`} trend={{ value: 14, positive: true }} />
        <MetricCard title="Total Covers" value={totalCovers.toLocaleString()} trend={{ value: 9, positive: true }} />
        <MetricCard title="Top Location" value={best.name} subtitle={`$${(best.revenue / 1000).toFixed(0)}K`} />
        <MetricCard title="Needs Attention" value={worst.name} subtitle={`$${(worst.revenue / 1000).toFixed(0)}K`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-seat-card border border-seat-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue Trend (3-Month)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
              <XAxis dataKey="month" stroke="#71717A" />
              <YAxis stroke="#71717A" />
              <Tooltip contentStyle={{ background: '#1C1C21', border: '1px solid #27272A' }} />
              <Legend />
              <Bar dataKey="Downtown" fill="#E11D48" />
              <Bar dataKey="Westside" fill="#F59E0B" />
              <Bar dataKey="Uptown" fill="#10B981" />
              <Bar dataKey="Southbank" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-seat-card border border-seat-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top vs Bottom Performance</h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#27272A" />
              <PolarAngleAxis dataKey="metric" stroke="#71717A" />
              <PolarRadiusAxis stroke="#71717A" />
              <Radar name="Downtown" dataKey="Downtown" stroke="#E11D48" fill="#E11D48" fillOpacity={0.4} />
              <Radar name="Uptown" dataKey="Uptown" stroke="#10B981" fill="#10B981" fillOpacity={0.4} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-seat-red" />
          Location Comparison Matrix
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-seat-border text-seat-muted">
                <th className="text-left py-3 px-2">Location</th>
                <th className="text-right py-3 px-2">Revenue</th>
                <th className="text-right py-3 px-2">Covers</th>
                <th className="text-right py-3 px-2">Avg Check</th>
                <th className="text-right py-3 px-2">Labor %</th>
                <th className="text-right py-3 px-2">Food %</th>
                <th className="text-right py-3 px-2">CSAT</th>
                <th className="text-right py-3 px-2">vs Avg</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((l) => {
                const avg = totalRev / locations.length;
                const diff = ((l.revenue - avg) / avg) * 100;
                return (
                  <tr key={l.id} className="border-b border-seat-border/50 hover:bg-seat-black/50">
                    <td className="py-3 px-2 text-white font-medium">{l.name}</td>
                    <td className="py-3 px-2 text-right text-white">${l.revenue.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right text-white">{l.covers.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right text-white">${l.avgCheck.toFixed(2)}</td>
                    <td className="py-3 px-2 text-right text-white">{l.labor}%</td>
                    <td className="py-3 px-2 text-right text-white">{l.food}%</td>
                    <td className="py-3 px-2 text-right text-white">{l.satisfaction}</td>
                    <td className="py-3 px-2 text-right">
                      <span className={`inline-flex items-center gap-1 ${diff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {diff >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(diff).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
