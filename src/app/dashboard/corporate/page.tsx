'use client';

import { useState, useEffect } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Building2, AlertTriangle } from 'lucide-react';

interface CorporateAccount {
  account_id: string;
  company_name: string;
  primary_contact: string;
  delivery_address: string;
  last_order_date?: string;
  total_lifetime_value: number;
  churn_risk_flag: boolean;
  access_token: string;
}

export default function CorporatePage() {
  const [accounts, setAccounts] = useState<CorporateAccount[]>([]);
  const [stats, setStats] = useState({ active: 0, monthly_recurring: 0, churn_risk: 0, avg_order_value: 0, total_ltv: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/corporate')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setAccounts(data.accounts);
          setStats(data.stats);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Corporate Accounts</h1>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <MetricCard title="Active Accounts" value={stats.active} />
        <MetricCard title="Monthly Recurring" value={formatCurrency(stats.monthly_recurring)} />
        <MetricCard title="Churn Risk" value={stats.churn_risk} />
        <MetricCard title="Avg Order Value" value={formatCurrency(stats.avg_order_value)} />
        <MetricCard title="Total LTV" value={formatCurrency(stats.total_ltv)} />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-400">Loading accounts...</div>
        ) : accounts.length === 0 ? (
          <div className="p-8 text-center text-zinc-400">
            No corporate accounts yet. They&apos;ll appear automatically when catering leads convert.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left p-4 text-zinc-400 font-medium">Company</th>
                  <th className="text-left p-4 text-zinc-400 font-medium">Contact</th>
                  <th className="text-left p-4 text-zinc-400 font-medium">Last Order</th>
                  <th className="text-left p-4 text-zinc-400 font-medium">Lifetime Value</th>
                  <th className="text-left p-4 text-zinc-400 font-medium">Status</th>
                  <th className="text-left p-4 text-zinc-400 font-medium">Portal</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(account => (
                  <tr key={account.account_id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-red-500" />
                        <span className="text-white font-medium">{account.company_name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-zinc-300">{account.primary_contact}</td>
                    <td className="p-4 text-zinc-400">
                      {account.last_order_date ? formatDate(account.last_order_date) : 'No orders yet'}
                    </td>
                    <td className="p-4 text-white font-medium">
                      {formatCurrency(account.total_lifetime_value)}
                    </td>
                    <td className="p-4">
                      {account.churn_risk_flag ? (
                        <span className="flex items-center gap-1 text-xs text-red-400">
                          <AlertTriangle size={14} /> Churn Risk
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-400">Active</span>
                      )}
                    </td>
                    <td className="p-4">
                      <a
                        href={`/corporate/${account.account_id}/${account.access_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-red-400 hover:underline"
                      >
                        Open Portal
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
