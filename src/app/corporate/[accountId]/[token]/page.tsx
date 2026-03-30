'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PortalData {
  account: {
    company_name: string;
    primary_contact: string;
    dietary_preferences?: string;
    delivery_address: string;
  };
  orders: Array<{
    order_id: string;
    date: string;
    amount: number;
    items: Record<string, unknown>[];
  }>;
  restaurant_name: string;
}

export default function CorporatePortalPage() {
  const params = useParams();
  const accountId = params.accountId as string;
  const token = params.token as string;
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/corporate/portal?account_id=${accountId}&token=${token}`)
      .then(res => {
        if (!res.ok) throw new Error('Access denied');
        return res.json();
      })
      .then(setData)
      .catch(() => setError('Invalid or expired portal link'))
      .finally(() => setLoading(false));
  }, [accountId, token]);

  if (loading) return <div className="min-h-screen bg-navy-900 flex items-center justify-center text-slate-400">Loading portal...</div>;
  if (error || !data) return <div className="min-h-screen bg-navy-900 flex items-center justify-center text-red-400">{error}</div>;

  const totalSpent = data.orders.reduce((sum, o) => sum + o.amount, 0);

  return (
    <div className="min-h-screen bg-navy-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">{data.account.company_name}</h1>
          <p className="text-slate-400">Catering portal with {data.restaurant_name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
            <p className="text-sm text-slate-400">Total Orders</p>
            <p className="text-2xl font-bold text-white">{data.orders.length}</p>
          </div>
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
            <p className="text-sm text-slate-400">Total Spent</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(totalSpent)}</p>
          </div>
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
            <p className="text-sm text-slate-400">Contact</p>
            <p className="text-2xl font-bold text-white">{data.account.primary_contact}</p>
          </div>
        </div>

        {data.account.dietary_preferences && (
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-2">Dietary Preferences</h2>
            <p className="text-slate-300">{data.account.dietary_preferences}</p>
          </div>
        )}

        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Order History</h2>
          {data.orders.length === 0 ? (
            <p className="text-slate-400">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {data.orders.map(order => (
                <div key={order.order_id} className="flex items-center justify-between p-4 bg-navy-700 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{formatCurrency(order.amount)}</p>
                    <p className="text-xs text-slate-400">{formatDate(order.date)}</p>
                  </div>
                  <Button variant="secondary" size="sm">Reorder</Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 opacity-60">
          <h2 className="text-lg font-semibold text-white mb-2">Recurring Orders</h2>
          <p className="text-slate-400 text-sm">Set up weekly or monthly recurring orders. Coming soon.</p>
        </div>
      </div>
    </div>
  );
}
