'use client';

import { useState, useEffect } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { Customer } from '@/lib/types';
import { Search, Download } from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState({ total: 0, new_this_week: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCustomers = async (searchTerm?: string) => {
    setLoading(true);
    const params = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
    const res = await fetch(`/api/customers${params}`);
    if (res.ok) {
      const data = await res.json();
      setCustomers(data.customers);
      setStats(data.stats);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers(search);
  };

  const exportCsv = () => {
    const headers = ['Name', 'Email', 'Phone', 'First Visit', 'Last Visit', 'Visits', 'Source', 'Birthday'];
    const rows = customers.map(c => [
      c.first_name, c.email, c.phone || '', formatDate(c.first_seen),
      formatDate(c.last_seen), c.visit_count, c.source, c.birthday || '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'seatsignals-customers.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Customers</h1>
        <Button variant="secondary" size="sm" onClick={exportCsv}>
          <Download size={16} className="mr-2" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard title="Total Customers" value={stats.total} />
        <MetricCard title="New This Week" value={stats.new_this_week} />
        <MetricCard title="Capture Rate" value="--" subtitle="Connect WiFi analytics to track" />
      </div>

      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-blue"
            />
          </div>
          <Button type="submit" variant="primary" size="md">Search</Button>
        </div>
      </form>

      <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading customers...</div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            No customers yet. Print your QR code table tents to start capturing.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-700">
                  <th className="text-left p-4 text-slate-400 font-medium">Name</th>
                  <th className="text-left p-4 text-slate-400 font-medium">Email</th>
                  <th className="text-left p-4 text-slate-400 font-medium">Phone</th>
                  <th className="text-left p-4 text-slate-400 font-medium">First Visit</th>
                  <th className="text-left p-4 text-slate-400 font-medium">Last Visit</th>
                  <th className="text-left p-4 text-slate-400 font-medium">Visits</th>
                  <th className="text-left p-4 text-slate-400 font-medium">Source</th>
                  <th className="text-left p-4 text-slate-400 font-medium">Birthday</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.customer_id} className="border-b border-navy-700/50 hover:bg-navy-700/30">
                    <td className="p-4 text-white">{c.first_name || '--'}</td>
                    <td className="p-4 text-slate-300">{c.email}</td>
                    <td className="p-4 text-slate-300">{c.phone || '--'}</td>
                    <td className="p-4 text-slate-400">{formatDate(c.first_seen)}</td>
                    <td className="p-4 text-slate-400">{formatDate(c.last_seen)}</td>
                    <td className="p-4 text-white">{c.visit_count}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-accent-blue/10 text-accent-blue">
                        {c.source}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">{c.birthday || '--'}</td>
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
