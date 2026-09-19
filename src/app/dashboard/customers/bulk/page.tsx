'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Tag,
  Download,
  Search,
  CheckSquare,
  Square,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Customer {
  customer_id: string;
  first_name: string;
  last_name: string;
  email: string;
  total_spend: number;
  visit_count: number;
  source: string;
  tags: string[];
}

export default function BulkActionsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [action, setAction] = useState('add_tag');
  const [tagInput, setTagInput] = useState('');
  const [sourceInput, setSourceInput] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch('/api/customers?limit=200');
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const filtered = customers.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q);
  });

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(c => c.customer_id)));
    }
  };

  const executeBulk = async () => {
    if (selected.size === 0) { toast.error('Select customers first'); return; }
    setProcessing(true);
    try {
      const actionData: Record<string, string> = {};
      if (action === 'add_tag' || action === 'remove_tag') actionData.tag = tagInput;
      if (action === 'update_source') actionData.source = sourceInput;

      const res = await fetch('/api/customers/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          customer_ids: Array.from(selected),
          data: actionData,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        if (action === 'export') {
          const csv = [
            'Name,Email,Spend,Visits,Source',
            ...(result.customers || []).map((c: Customer) =>
              `${c.first_name} ${c.last_name},${c.email || ''},${c.total_spend || 0},${c.visit_count || 0},${c.source || ''}`
            ),
          ].join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'customers_bulk_export.csv';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success(`Exported ${result.count} customers`);
        } else {
          toast.success(`${action.replace(/_/g, ' ')} applied to ${result.affected} customers`);
          fetchCustomers();
        }
        setSelected(new Set());
      } else {
        toast.error('Action failed');
      }
    } catch { toast.error('Action failed'); }
    finally { setProcessing(false); }
  };

  if (loading) {
    return (<div className="p-6 space-y-6"><div className="animate-pulse space-y-4"><div className="h-8 bg-zinc-800 rounded w-64" /><div className="h-64 bg-zinc-800/50 rounded-xl" /></div></div>);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-seat-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Bulk Actions</h1>
          <p className="text-sm text-zinc-500">Select customers and apply actions in bulk</p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-4 flex flex-wrap items-center gap-3">
        <span className="text-xs text-zinc-400">{selected.size} selected</span>

        <select value={action} onChange={e => setAction(e.target.value)}
          className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white focus:outline-none focus:border-seat-red">
          <option value="add_tag">Add Tag</option>
          <option value="remove_tag">Remove Tag</option>
          <option value="update_source">Update Source</option>
          <option value="export">Export Selected</option>
        </select>

        {(action === 'add_tag' || action === 'remove_tag') && (
          <input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Tag name"
            className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-seat-red" />
        )}
        {action === 'update_source' && (
          <input value={sourceInput} onChange={e => setSourceInput(e.target.value)} placeholder="Source"
            className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-seat-red" />
        )}

        <button onClick={executeBulk} disabled={processing || selected.size === 0}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-seat-red text-white rounded-lg text-xs font-medium hover:bg-seat-red/90 disabled:opacity-50 transition-colors">
          {processing ? <Loader2 size={12} className="animate-spin" /> :
            action === 'add_tag' ? <Tag size={12} /> :
            action === 'export' ? <Download size={12} /> : <Tag size={12} />}
          Apply
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..."
          className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-seat-red" />
      </div>

      {/* Customer Table */}
      <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-seat-border">
              <th className="px-4 py-3 text-left">
                <button onClick={selectAll} className="text-zinc-400 hover:text-white">
                  {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Name</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Email</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Spend</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Visits</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Source</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Tags</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map(c => (
              <tr key={c.customer_id}
                className={cn('border-b border-seat-border/50 hover:bg-zinc-800/30 transition-colors cursor-pointer',
                  selected.has(c.customer_id) && 'bg-seat-red/5')}
                onClick={() => toggleSelect(c.customer_id)}>
                <td className="px-4 py-3">
                  {selected.has(c.customer_id) ? <CheckSquare size={16} className="text-seat-red" /> : <Square size={16} className="text-zinc-600" />}
                </td>
                <td className="px-4 py-3 text-white font-medium">{c.first_name} {c.last_name}</td>
                <td className="px-4 py-3 text-zinc-400">{c.email || '—'}</td>
                <td className="px-4 py-3 text-right text-zinc-300">{formatCurrency(c.total_spend || 0)}</td>
                <td className="px-4 py-3 text-right text-zinc-300">{c.visit_count || 0}</td>
                <td className="px-4 py-3 text-zinc-400">{c.source || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {(c.tags || []).slice(0, 3).map((t: string) => (
                      <span key={t} className="text-[9px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded">{t}</span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 100 && (
          <div className="px-4 py-3 text-xs text-zinc-500 text-center border-t border-seat-border">
            Showing 100 of {filtered.length} customers
          </div>
        )}
      </div>
    </div>
  );
}
