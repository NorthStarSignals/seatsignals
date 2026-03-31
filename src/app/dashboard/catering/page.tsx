'use client';

import { useState, useEffect } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Search, Send, CheckCircle, Building2 } from 'lucide-react';

interface Lead {
  lead_id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  company_size: number;
  distance_miles: number;
  sequence_status: string;
  last_contacted?: string;
  converted: boolean;
  order_value?: number;
}

const STATUS_COLORS: Record<string, string> = {
  discovered: 'bg-slate-500/10 text-slate-400',
  contacted: 'bg-blue-500/10 text-blue-400',
  replied: 'bg-purple-500/10 text-purple-400',
  meeting: 'bg-amber-500/10 text-amber-400',
  order_placed: 'bg-emerald-500/10 text-emerald-400',
  recurring: 'bg-accent-blue/10 text-accent-blue',
};

export default function CateringPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState({ total: 0, contacted: 0, conversion_rate: 0, pipeline_value: 0, total_revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [convertId, setConvertId] = useState<string | null>(null);
  const [convertAmount, setConvertAmount] = useState('');

  const fetchData = async () => {
    const res = await fetch('/api/catering');
    if (res.ok) {
      const data = await res.json();
      setLeads(data.leads);
      setStats(data.stats);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const [discovering, setDiscovering] = useState(false);

  const discover = async () => {
    setDiscovering(true);
    try {
      const res = await fetch('/api/catering/discover', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Discovered ${data.discovered} nearby businesses`);
        fetchData();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error === 'No restaurant' ? 'Complete onboarding first — set up your restaurant profile in Settings.' : 'Failed to discover leads');
      }
    } catch {
      toast.error('Failed to discover leads');
    } finally {
      setDiscovering(false);
    }
  };

  const startSequence = async () => {
    if (selected.size === 0) { toast.error('Select leads first'); return; }
    const res = await fetch('/api/catering/sequence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_ids: Array.from(selected) }),
    });
    if (res.ok) {
      const data = await res.json();
      toast.success(`Started sequence for ${data.contacted} leads`);
      setSelected(new Set());
      fetchData();
    }
  };

  const convertLead = async () => {
    if (!convertId || !convertAmount) return;
    const res = await fetch('/api/catering/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: convertId, amount: parseFloat(convertAmount) }),
    });
    if (res.ok) {
      toast.success('Lead converted! Corporate account created.');
      setConvertId(null);
      setConvertAmount('');
      fetchData();
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Catering Pipeline</h1>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={discover} disabled={discovering}>
            <Search size={16} className="mr-1" /> {discovering ? 'Discovering...' : 'Discover'}
          </Button>
          <Button variant="cta" size="sm" onClick={startSequence} disabled={selected.size === 0}>
            <Send size={16} className="mr-1" /> Start Sequence ({selected.size})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <MetricCard title="Total Leads" value={stats.total} />
        <MetricCard title="Contacted" value={stats.contacted} />
        <MetricCard title="Conversion Rate" value={`${stats.conversion_rate}%`} />
        <MetricCard title="Pipeline Value" value={formatCurrency(stats.pipeline_value)} />
        <MetricCard title="Catering Revenue" value={formatCurrency(stats.total_revenue)} />
      </div>

      {/* Convert modal */}
      {convertId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Convert Lead to Order</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Order Amount</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="500.00"
                  value={convertAmount}
                  onChange={(e) => setConvertAmount(e.target.value)}
                  className="w-full bg-navy-700 border border-navy-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-accent-blue"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="cta" onClick={convertLead} disabled={!convertAmount}>Convert</Button>
                <Button variant="ghost" onClick={() => setConvertId(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading pipeline...</div>
        ) : leads.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            No leads yet. Click Discover to find nearby offices.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-700">
                  <th className="p-4 w-10"></th>
                  <th className="text-left p-4 text-slate-400 font-medium">Company</th>
                  <th className="text-left p-4 text-slate-400 font-medium">Contact</th>
                  <th className="text-left p-4 text-slate-400 font-medium">Size</th>
                  <th className="text-left p-4 text-slate-400 font-medium">Distance</th>
                  <th className="text-left p-4 text-slate-400 font-medium">Status</th>
                  <th className="text-left p-4 text-slate-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.lead_id} className="border-b border-navy-700/50 hover:bg-navy-700/30">
                    <td className="p-4">
                      {lead.sequence_status === 'discovered' && (
                        <input
                          type="checkbox"
                          checked={selected.has(lead.lead_id)}
                          onChange={() => toggleSelect(lead.lead_id)}
                          className="rounded"
                        />
                      )}
                    </td>
                    <td className="p-4">
                      <p className="text-white font-medium">{lead.company_name}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-slate-300">{lead.contact_name}</p>
                      <p className="text-xs text-slate-500">{lead.contact_email}</p>
                    </td>
                    <td className="p-4 text-slate-300">{lead.company_size} employees</td>
                    <td className="p-4 text-slate-300">{lead.distance_miles} mi</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${STATUS_COLORS[lead.sequence_status] || 'text-slate-400'}`}>
                        {lead.sequence_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      {!lead.converted && lead.sequence_status !== 'discovered' && (
                        <Button size="sm" variant="ghost" onClick={() => setConvertId(lead.lead_id)}>
                          <CheckCircle size={14} className="mr-1" /> Convert
                        </Button>
                      )}
                      {lead.converted && (
                        <span className="text-emerald-400 text-xs flex items-center gap-1">
                          <Building2 size={14} /> {formatCurrency(lead.order_value || 0)}
                        </span>
                      )}
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
