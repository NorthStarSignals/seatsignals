interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; positive: boolean };
  icon?: React.ReactNode;
}

export function MetricCard({ title, value, subtitle, trend, icon }: MetricCardProps) {
  return (
    <div className="bg-seat-card border border-seat-border rounded-xl p-5 hover:border-zinc-600 transition-colors group">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{title}</p>
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-seat-red/10 flex items-center justify-center text-seat-red">
            {icon}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
      {trend && (
        <div className="mt-2">
          <span className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded ${
            trend.positive
              ? 'bg-red-500/10 text-red-400'
              : 'bg-zinc-700/50 text-zinc-400'
          }`}>
            {trend.positive ? '+' : ''}{trend.value}%
          </span>
          <span className="text-xs text-zinc-600 ml-1.5">vs last month</span>
        </div>
      )}
    </div>
  );
}
