'use client';

import { MetricCard } from '@/components/ui/metric-card';
import { cn } from '@/lib/utils';
import {
  Brain,
  Users,
  TrendingUp,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const predictions = [
  { day: 'Mon', date: 'Apr 14', predicted_covers: 142, foh_needed: 6, boh_needed: 4, total_hours: 80, risk: 'low' as const },
  { day: 'Tue', date: 'Apr 15', predicted_covers: 155, foh_needed: 7, boh_needed: 4, total_hours: 88, risk: 'low' as const },
  { day: 'Wed', date: 'Apr 16', predicted_covers: 168, foh_needed: 7, boh_needed: 5, total_hours: 96, risk: 'low' as const },
  { day: 'Thu', date: 'Apr 17', predicted_covers: 185, foh_needed: 8, boh_needed: 5, total_hours: 104, risk: 'medium' as const },
  { day: 'Fri', date: 'Apr 18', predicted_covers: 228, foh_needed: 10, boh_needed: 6, total_hours: 128, risk: 'high' as const },
  { day: 'Sat', date: 'Apr 19', predicted_covers: 252, foh_needed: 11, boh_needed: 7, total_hours: 144, risk: 'high' as const },
  { day: 'Sun', date: 'Apr 20', predicted_covers: 198, foh_needed: 9, boh_needed: 5, total_hours: 112, risk: 'medium' as const },
];

const alerts = [
  { type: 'warning', message: 'Friday Apr 18: Easter weekend rush expected. 2 additional FOH staff recommended.', action: 'Post open shift' },
  { type: 'warning', message: 'Saturday Apr 19: Predicted 252 covers — highest of the week. Ensure full kitchen crew.', action: 'Confirm schedule' },
  { type: 'info', message: 'Monday-Wednesday can be covered with minimal crew. Consider offering PTO to reduce labor cost.', action: 'Review schedule' },
];

export default function StaffingPredictorPage() {
  const totalHours = predictions.reduce((s, p) => s + p.total_hours, 0);
  const peakDay = predictions.reduce((a, b) => a.predicted_covers > b.predicted_covers ? a : b);
  const highRiskDays = predictions.filter(p => p.risk === 'high').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
          <Brain className="w-5 h-5 text-seat-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">AI Staffing Predictor</h1>
          <p className="text-sm text-zinc-500">Predict staffing needs based on demand forecast</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total Hours Needed" value={totalHours} icon={<Users size={18} />} />
        <MetricCard title="Peak Day" value={`${peakDay.day} (${peakDay.predicted_covers})`} icon={<TrendingUp size={18} />} />
        <MetricCard title="High-Risk Days" value={highRiskDays} icon={<AlertTriangle size={18} />} />
        <MetricCard title="Week of" value="Apr 14-20" icon={<Calendar size={18} />} />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div key={i} className={cn('flex items-center justify-between p-3 rounded-xl border',
              alert.type === 'warning' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-blue-500/5 border-blue-500/20')}>
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className={alert.type === 'warning' ? 'text-amber-400' : 'text-blue-400'} />
                <p className="text-sm text-zinc-300">{alert.message}</p>
              </div>
              <button className="text-xs px-3 py-1 bg-zinc-800 text-zinc-300 rounded-lg hover:text-white border border-zinc-700">
                {alert.action}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Staff Chart */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Predicted Staff Needs</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={predictions}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
            <XAxis dataKey="day" stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
            <YAxis stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: 8 }} />
            <Bar dataKey="foh_needed" stackId="a" fill="#E11D48" name="FOH Staff" />
            <Bar dataKey="boh_needed" stackId="a" fill="#3B82F6" name="BOH Staff" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Daily Grid */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Daily Breakdown</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-zinc-500 uppercase border-b border-seat-border">
              <th className="text-left py-2 px-3">Day</th>
              <th className="text-right py-2 px-3">Covers</th>
              <th className="text-right py-2 px-3">FOH</th>
              <th className="text-right py-2 px-3">BOH</th>
              <th className="text-right py-2 px-3">Total Hours</th>
              <th className="text-center py-2 px-3">Risk</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map(p => (
              <tr key={p.day} className="border-b border-seat-border/30">
                <td className="py-2.5 px-3">
                  <span className="text-white font-medium">{p.day}</span>
                  <span className="text-zinc-500 text-xs ml-1">{p.date}</span>
                </td>
                <td className="py-2.5 px-3 text-right text-white font-medium">{p.predicted_covers}</td>
                <td className="py-2.5 px-3 text-right text-zinc-300">{p.foh_needed}</td>
                <td className="py-2.5 px-3 text-right text-zinc-300">{p.boh_needed}</td>
                <td className="py-2.5 px-3 text-right text-zinc-300">{p.total_hours}h</td>
                <td className="py-2.5 px-3 text-center">
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium',
                    p.risk === 'high' ? 'bg-red-500/10 text-red-400' :
                    p.risk === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-green-500/10 text-green-400')}>
                    {p.risk}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
