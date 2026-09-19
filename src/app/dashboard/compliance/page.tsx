'use client';

import { useState, useEffect } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Shield, UserX, Mail, Phone, Check, AlertTriangle, Link, Copy, X } from 'lucide-react';

interface DncEntry {
  id: string;
  contact_type: string;
  contact_value: string;
  reason: string | null;
  customer_id: string | null;
  added_by: string | null;
  created_at: string;
  customers: { first_name: string; email: string } | null;
}

interface ConsentEntry {
  id: string;
  customer_id: string | null;
  consent_type: string;
  consented: boolean;
  source: string | null;
  created_at: string;
  customers: { first_name: string; email: string } | null;
}

interface Summary {
  dnc_count: number;
  opt_in_rate: number;
  recent_unsubscribes: number;
  consent_records: number;
}

export default function CompliancePage() {
  const [dncList, setDncList] = useState<DncEntry[]>([]);
  const [consentLog, setConsentLog] = useState<ConsentEntry[]>([]);
  const [summary, setSummary] = useState<Summary>({
    dnc_count: 0,
    opt_in_rate: 0,
    recent_unsubscribes: 0,
    consent_records: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    contact_type: 'email' as 'email' | 'phone' | 'both',
    contact_value: '',
    reason: 'manual',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/compliance');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setDncList(data.dnc_list || []);
      setConsentLog(data.consent_log || []);
      setSummary(data.summary);
    } catch {
      toast.error('Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    if (!addForm.contact_value.trim()) {
      toast.error('Contact value is required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) throw new Error('Failed to add');
      toast.success('Added to Do Not Contact list');
      setShowAddModal(false);
      setAddForm({ contact_type: 'email', contact_value: '', reason: 'manual' });
      fetchData();
    } catch {
      toast.error('Failed to add to DNC list');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this entry? The contact will be eligible to receive messages again.')) return;
    try {
      const res = await fetch('/api/compliance', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to remove');
      toast.success('Removed from DNC list');
      fetchData();
    } catch {
      toast.error('Failed to remove');
    }
  };

  const unsubscribeUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/unsubscribe?restaurant_id=YOUR_RESTAURANT_ID&email=CUSTOMER_EMAIL`
    : '';

  const copyUrl = () => {
    navigator.clipboard.writeText(unsubscribeUrl);
    toast.success('Copied to clipboard');
  };

  const reasonBadge = (reason: string | null) => {
    const colors: Record<string, string> = {
      unsubscribed: 'bg-yellow-500/10 text-yellow-400',
      bounced: 'bg-orange-500/10 text-orange-400',
      complained: 'bg-red-500/10 text-red-400',
      manual: 'bg-zinc-700/50 text-zinc-400',
    };
    const cls = colors[reason || 'manual'] || colors.manual;
    return (
      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded ${cls}`}>
        {reason || 'manual'}
      </span>
    );
  };

  const consentBadge = (consented: boolean) => (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded ${
      consented ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
    }`}>
      {consented ? 'Yes' : 'No'}
    </span>
  );

  const complianceChecklist = [
    { label: 'Include physical mailing address in all emails', category: 'CAN-SPAM' },
    { label: 'Honor unsubscribe requests within 10 business days', category: 'CAN-SPAM' },
    { label: 'Do not use deceptive subject lines', category: 'CAN-SPAM' },
    { label: 'Clearly identify messages as advertisements', category: 'CAN-SPAM' },
    { label: 'Include a working unsubscribe link in every email', category: 'CAN-SPAM' },
    { label: 'Obtain express written consent before sending SMS', category: 'TCPA' },
    { label: 'Provide opt-out instructions in every SMS message', category: 'TCPA' },
    { label: 'Do not send SMS before 8am or after 9pm local time', category: 'TCPA' },
    { label: 'Maintain records of consent for at least 5 years', category: 'TCPA' },
    { label: 'Honor STOP/UNSUBSCRIBE keywords immediately', category: 'TCPA' },
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-seat-card rounded w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-seat-card rounded-xl" />)}
          </div>
          <div className="h-64 bg-seat-card rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Compliance Center</h1>
            <p className="text-sm text-zinc-500">Manage opt-outs, consent, and messaging compliance</p>
          </div>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <UserX className="w-4 h-4" />
          Add to DNC
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="DNC List Size"
          value={summary.dnc_count}
          subtitle="Contacts blocked"
          icon={<UserX className="w-4 h-4" />}
        />
        <MetricCard
          title="Opt-In Rate"
          value={`${summary.opt_in_rate}%`}
          subtitle="Of consent records"
          icon={<Check className="w-4 h-4" />}
        />
        <MetricCard
          title="Unsubscribes (30d)"
          value={summary.recent_unsubscribes}
          subtitle="Last 30 days"
          icon={<AlertTriangle className="w-4 h-4" />}
        />
        <MetricCard
          title="Consent Records"
          value={summary.consent_records}
          subtitle="Total logged"
          icon={<Shield className="w-4 h-4" />}
        />
      </div>

      {/* DNC List Table */}
      <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-seat-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Do Not Contact List</h2>
          <span className="text-xs text-zinc-500">{dncList.length} entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-seat-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Reason</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Date Added</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {dncList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                    No entries in the Do Not Contact list
                  </td>
                </tr>
              ) : (
                dncList.map((entry) => (
                  <tr key={entry.id} className="border-b border-seat-border/50 hover:bg-zinc-800/30">
                    <td className="px-4 py-3 text-white font-mono text-xs">{entry.contact_value}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                        {entry.contact_type === 'email' ? <Mail className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                        {entry.contact_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">{reasonBadge(entry.reason)}</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      {entry.customers?.first_name || '--'}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">{formatDate(entry.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleRemove(entry.id)}>
                        <X className="w-3 h-3" />
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Consent Log Table */}
      <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-seat-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Consent Log</h2>
          <span className="text-xs text-zinc-500">{consentLog.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-seat-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Consent Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Consented</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Source</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody>
              {consentLog.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                    No consent records yet
                  </td>
                </tr>
              ) : (
                consentLog.map((entry) => (
                  <tr key={entry.id} className="border-b border-seat-border/50 hover:bg-zinc-800/30">
                    <td className="px-4 py-3 text-white text-xs">
                      {entry.customers?.first_name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs font-mono">{entry.consent_type}</td>
                    <td className="px-4 py-3">{consentBadge(entry.consented)}</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{entry.source || '--'}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">{formatDate(entry.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CAN-SPAM / TCPA Compliance Checklist */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-seat-red" />
          <h2 className="text-sm font-semibold text-white">CAN-SPAM / TCPA Compliance Checklist</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {complianceChecklist.map((item, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-300">{item.label}</p>
                <span className="text-[10px] text-zinc-600 uppercase font-medium">{item.category}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Unsubscribe Link Generator */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Link className="w-4 h-4 text-seat-red" />
          <h2 className="text-sm font-semibold text-white">Unsubscribe Link Generator</h2>
        </div>
        <p className="text-xs text-zinc-500 mb-3">
          Include this URL in your emails. Replace YOUR_RESTAURANT_ID with your restaurant ID and CUSTOMER_EMAIL with the recipient&apos;s email.
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-seat-black border border-seat-border rounded-lg px-3 py-2">
            <code className="text-xs text-zinc-400 break-all">{unsubscribeUrl}</code>
          </div>
          <Button variant="secondary" size="sm" onClick={copyUrl}>
            <Copy className="w-3.5 h-3.5" />
            Copy
          </Button>
        </div>
      </div>

      {/* Add to DNC Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-seat-card border border-seat-border rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">Add to Do Not Contact</h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Contact Type</label>
                <select
                  value={addForm.contact_type}
                  onChange={(e) => setAddForm({ ...addForm, contact_type: e.target.value as 'email' | 'phone' | 'both' })}
                  className="w-full bg-seat-black border border-seat-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-seat-red"
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Contact Value</label>
                <input
                  type="text"
                  value={addForm.contact_value}
                  onChange={(e) => setAddForm({ ...addForm, contact_value: e.target.value })}
                  placeholder={addForm.contact_type === 'phone' ? '+1 (555) 000-0000' : 'email@example.com'}
                  className="w-full bg-seat-black border border-seat-border rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-seat-red"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Reason</label>
                <select
                  value={addForm.reason}
                  onChange={(e) => setAddForm({ ...addForm, reason: e.target.value })}
                  className="w-full bg-seat-black border border-seat-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-seat-red"
                >
                  <option value="manual">Manual</option>
                  <option value="unsubscribed">Unsubscribed</option>
                  <option value="bounced">Bounced</option>
                  <option value="complained">Complained</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" className="flex-1" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleAdd} disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add to DNC List'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
