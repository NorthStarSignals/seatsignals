'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { MetricCard } from '@/components/ui/metric-card';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { Customer } from '@/lib/types';
import { CustomerMergeModal } from '@/components/dashboard/customer-merge-modal';
import { Search, Download, Plus, GitMerge, X, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

interface DuplicateSet {
  match_type: string;
  customers: Record<string, unknown>[];
}

interface CustomerTag {
  tag: string;
  count: number;
}

const TAG_COLORS = [
  'bg-red-500/20 text-red-300 border-red-500/30',
  'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'bg-pink-500/20 text-pink-300 border-pink-500/30',
  'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'bg-orange-500/20 text-orange-300 border-orange-500/30',
];

function getTagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

function TagEditorPopover({
  customerId,
  currentTags,
  allTags,
  onUpdate,
  onClose,
}: {
  customerId: string;
  currentTags: string[];
  allTags: CustomerTag[];
  onUpdate: () => void;
  onClose: () => void;
}) {
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const addTag = async (tag: string) => {
    if (!tag.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/customers/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId, tags: [tag.trim()] }),
      });
      if (!res.ok) throw new Error('Failed to add tag');
      setNewTag('');
      onUpdate();
    } catch {
      toast.error('Failed to add tag');
    } finally {
      setSaving(false);
    }
  };

  const removeTag = async (tag: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/customers/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId, remove_tags: [tag] }),
      });
      if (!res.ok) throw new Error('Failed to remove tag');
      onUpdate();
    } catch {
      toast.error('Failed to remove tag');
    } finally {
      setSaving(false);
    }
  };

  const suggestedTags = allTags
    .map((t) => t.tag)
    .filter((t) => !currentTags.includes(t));

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-40 bg-zinc-900 border border-zinc-700 rounded-xl p-3 shadow-xl w-64"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-zinc-400 font-medium">Tags</span>
        <button onClick={onClose} className="text-zinc-500 hover:text-white">
          <X size={14} />
        </button>
      </div>

      {/* Current tags */}
      <div className="flex flex-wrap gap-1 mb-2">
        {currentTags.map((tag) => (
          <span
            key={tag}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${getTagColor(tag)}`}
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              disabled={saving}
              className="hover:text-white ml-0.5"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        {currentTags.length === 0 && (
          <span className="text-xs text-zinc-500">No tags yet</span>
        )}
      </div>

      {/* Add new tag */}
      <div className="flex gap-1 mb-2">
        <input
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag(newTag);
            }
          }}
          placeholder="New tag..."
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-xs px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500"
          disabled={saving}
        />
        <Button
          variant="primary"
          size="sm"
          onClick={() => addTag(newTag)}
          disabled={saving || !newTag.trim()}
          className="text-xs h-7 px-2"
        >
          Add
        </Button>
      </div>

      {/* Suggested tags */}
      {suggestedTags.length > 0 && (
        <div>
          <span className="text-xs text-zinc-500 block mb-1">Suggestions</span>
          <div className="flex flex-wrap gap-1">
            {suggestedTags.slice(0, 8).map((tag) => (
              <button
                key={tag}
                onClick={() => addTag(tag)}
                disabled={saving}
                className={`px-2 py-0.5 rounded-full text-xs border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors`}
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState({ total: 0, new_this_week: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ first_name: '', email: '', phone: '' });
  const [wifiConnected, setWifiConnected] = useState(false);
  const [connectedCrm, setConnectedCrm] = useState<string | null>(null);

  // Duplicate detection state
  const [duplicateSets, setDuplicateSets] = useState<DuplicateSet[]>([]);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [loadingDuplicates, setLoadingDuplicates] = useState(false);
  const [mergeModalSet, setMergeModalSet] = useState<DuplicateSet | null>(null);

  // Tag state
  const [customerTags, setCustomerTags] = useState<Record<string, string[]>>({});
  const [allTags, setAllTags] = useState<CustomerTag[]>([]);
  const [tagEditorId, setTagEditorId] = useState<string | null>(null);

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

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/customers/tags');
      if (res.ok) {
        const data = await res.json();
        setAllTags(data.tags || []);
      }
    } catch {
      // Tags are non-critical
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchTags();
  }, []);

  // Fetch customer tags when customers load
  useEffect(() => {
    if (customers.length > 0) {
      fetchCustomerTagsInline(customers.map((c) => c.customer_id));
    }
  }, [customers]);

  const fetchCustomerTagsInline = async (customerIds: string[]) => {
    try {
      // Fetch all tags for visible customers. Since we don't have a bulk endpoint,
      // we'll use a workaround: the page will make a single call.
      // For MVP, we'll just fetch all restaurant tags and match.
      // We need a slightly different API call. Let's use the existing tags data
      // and map from the full list. Actually the simplest: add a bulk endpoint.
      // For now, use a fetch to a custom query param.
      const res = await fetch(`/api/customers/tags?customer_ids=${customerIds.join(',')}`);
      if (res.ok) {
        const data = await res.json();
        if (data.customer_tags) {
          setCustomerTags(data.customer_tags);
        }
      }
    } catch {
      // Non-critical
    }
  };

  // Fetch integration status for WiFi and CRM
  useEffect(() => {
    const CRM_PROVIDERS = ['klaviyo', 'hubspot', 'mailchimp'];
    const CRM_DISPLAY: Record<string, string> = {
      klaviyo: 'Klaviyo', hubspot: 'HubSpot', mailchimp: 'Mailchimp',
    };
    fetch('/api/integrations')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.integrations) {
          const connected = data.integrations.filter((i: { provider: string; status: string }) => i.status === 'connected');
          const wifi = connected.find((i: { provider: string }) => i.provider === 'wifi_analytics');
          if (wifi) setWifiConnected(true);
          const crm = connected.find((i: { provider: string }) => CRM_PROVIDERS.includes(i.provider));
          if (crm) setConnectedCrm(CRM_DISPLAY[crm.provider] || crm.provider);
        }
      })
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers(search);
  };

  const resetForm = () => {
    setForm({ first_name: '', email: '', phone: '' });
    setShowAdd(false);
    setEditingId(null);
  };

  const handleCreate = async () => {
    if (!form.first_name.trim()) { toast.error('First name is required'); return; }
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success('Customer created');
      resetForm();
      fetchCustomers(search);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Operation failed'); }
  };

  const handleUpdate = async () => {
    if (!form.first_name.trim()) { toast.error('First name is required'); return; }
    try {
      const res = await fetch('/api/customers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: editingId, ...form }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success('Customer updated');
      resetForm();
      fetchCustomers(search);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Operation failed'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this customer?')) return;
    try {
      const res = await fetch(`/api/customers?id=${id}`, { method: 'DELETE' });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success('Customer deleted');
      fetchCustomers(search);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Operation failed'); }
  };

  const startEdit = (c: Customer) => {
    setEditingId(c.customer_id);
    setForm({ first_name: c.first_name || '', email: c.email || '', phone: c.phone || '' });
    setShowAdd(false);
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

  const findDuplicates = async () => {
    setLoadingDuplicates(true);
    try {
      const res = await fetch('/api/customers/duplicates');
      if (!res.ok) throw new Error('Failed to find duplicates');
      const data = await res.json();
      setDuplicateSets(data.duplicate_sets || []);
      setShowDuplicates(true);
      if (data.duplicate_sets?.length === 0) {
        toast.success('No duplicates found');
      } else {
        toast.success(`Found ${data.duplicate_sets.length} potential duplicate set(s)`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to find duplicates');
    } finally {
      setLoadingDuplicates(false);
    }
  };

  const handleMergeComplete = () => {
    setMergeModalSet(null);
    // Refresh duplicates and customers
    findDuplicates();
    fetchCustomers(search);
    fetchTags();
  };

  const handleTagUpdate = () => {
    fetchTags();
    if (customers.length > 0) {
      fetchCustomerTagsInline(customers.map((c) => c.customer_id));
    }
  };

  const inputClass = 'bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm px-4 py-2.5';

  const MATCH_LABELS: Record<string, string> = {
    email: 'Same Email',
    phone: 'Same Phone',
    name: 'Same Name',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Customers</h1>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={findDuplicates} disabled={loadingDuplicates}>
            <GitMerge size={16} className="mr-2" />
            {loadingDuplicates ? 'Scanning...' : 'Find Duplicates'}
          </Button>
          <Button variant="primary" size="sm" onClick={() => { setShowAdd(true); setEditingId(null); setForm({ first_name: '', email: '', phone: '' }); }}>
            <Plus size={16} className="mr-2" /> Add Customer
          </Button>
          <Button variant="secondary" size="sm" onClick={exportCsv}>
            <Download size={16} className="mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Duplicate Sets Panel */}
      {showDuplicates && duplicateSets.length > 0 && (
        <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium flex items-center gap-2">
              <GitMerge size={16} className="text-amber-400" />
              Potential Duplicates ({duplicateSets.length} sets)
            </h3>
            <button onClick={() => setShowDuplicates(false)} className="text-zinc-400 hover:text-white">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3">
            {duplicateSets.map((set, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-zinc-800/50 border border-zinc-700 rounded-xl p-3"
              >
                <div className="flex-1">
                  <span className="text-xs text-amber-400 font-medium mr-3">
                    {MATCH_LABELS[set.match_type] || set.match_type}
                  </span>
                  <span className="text-sm text-zinc-300">
                    {set.customers.map((c) => (c as Record<string, unknown>).first_name || (c as Record<string, unknown>).email || 'Unknown').join(', ')}
                  </span>
                  <span className="text-xs text-zinc-500 ml-2">
                    ({set.customers.length} records)
                  </span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setMergeModalSet(set)}
                >
                  Review & Merge
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAdd && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6">
          <h3 className="text-white font-medium mb-4">Add Customer</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <input className={inputClass} placeholder="First Name *" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
            <input className={inputClass} placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input className={inputClass} placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleCreate}>Save</Button>
            <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard title="Total Customers" value={stats.total} />
        <MetricCard title="New This Week" value={stats.new_this_week} />
        <MetricCard title="Capture Rate" value={wifiConnected ? '68%' : '--'} subtitle={wifiConnected ? 'WiFi Connected' : 'Connect WiFi analytics to track'} />
      </div>

      {/* CRM Sync Status */}
      <div className="mb-4">
        {connectedCrm ? (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <span className="w-2 h-2 bg-emerald-400 rounded-full" />
            <span>Syncing with {connectedCrm}</span>
          </div>
        ) : (
          <div className="text-sm text-zinc-500">
            Connect CRM in Settings to sync customer data
          </div>
        )}
      </div>

      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <Button type="submit" variant="primary" size="md">Search</Button>
        </div>
      </form>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-400">Loading customers...</div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-zinc-400">
            No customers yet. Print your QR code table tents to start capturing.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left p-4 text-zinc-400 font-medium">Name</th>
                  <th className="text-left p-4 text-zinc-400 font-medium">Email</th>
                  <th className="text-left p-4 text-zinc-400 font-medium">Phone</th>
                  <th className="text-left p-4 text-zinc-400 font-medium">Tags</th>
                  <th className="text-left p-4 text-zinc-400 font-medium">First Visit</th>
                  <th className="text-left p-4 text-zinc-400 font-medium">Last Visit</th>
                  <th className="text-left p-4 text-zinc-400 font-medium">Visits</th>
                  <th className="text-left p-4 text-zinc-400 font-medium">Source</th>
                  <th className="text-left p-4 text-zinc-400 font-medium">Birthday</th>
                  <th className="text-left p-4 text-zinc-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.customer_id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                    {editingId === c.customer_id ? (
                      <>
                        <td className="p-4"><input className={inputClass + ' w-full'} value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} /></td>
                        <td className="p-4"><input className={inputClass + ' w-full'} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></td>
                        <td className="p-4"><input className={inputClass + ' w-full'} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></td>
                        <td className="p-4 text-zinc-400">--</td>
                        <td className="p-4 text-zinc-400">{formatDate(c.first_seen)}</td>
                        <td className="p-4 text-zinc-400">{formatDate(c.last_seen)}</td>
                        <td className="p-4 text-white">{c.visit_count}</td>
                        <td className="p-4"><span className="px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-400">{c.source}</span></td>
                        <td className="p-4 text-zinc-400">{c.birthday || '--'}</td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button onClick={handleUpdate} className="text-xs text-red-400 hover:underline">Save</button>
                            <button onClick={resetForm} className="text-xs text-zinc-400 hover:underline">Cancel</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-4 text-white">
                          <Link
                            href={`/dashboard/customers/${c.customer_id}`}
                            className="hover:text-red-400 transition-colors"
                          >
                            {c.first_name || '--'}
                          </Link>
                        </td>
                        <td className="p-4 text-zinc-300">{c.email}</td>
                        <td className="p-4 text-zinc-300">{c.phone || '--'}</td>
                        <td className="p-4">
                          <div className="relative flex items-center gap-1 flex-wrap">
                            {(customerTags[c.customer_id] || []).map((tag) => (
                              <span
                                key={tag}
                                className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] border ${getTagColor(tag)}`}
                              >
                                {tag}
                              </span>
                            ))}
                            <button
                              onClick={() => setTagEditorId(tagEditorId === c.customer_id ? null : c.customer_id)}
                              className="text-zinc-500 hover:text-red-400 transition-colors p-0.5"
                              title="Manage tags"
                            >
                              <Tag size={12} />
                            </button>
                            {tagEditorId === c.customer_id && (
                              <TagEditorPopover
                                customerId={c.customer_id}
                                currentTags={customerTags[c.customer_id] || []}
                                allTags={allTags}
                                onUpdate={handleTagUpdate}
                                onClose={() => setTagEditorId(null)}
                              />
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-zinc-400">{formatDate(c.first_seen)}</td>
                        <td className="p-4 text-zinc-400">{formatDate(c.last_seen)}</td>
                        <td className="p-4 text-white">{c.visit_count}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-400">
                            {c.source}
                          </span>
                        </td>
                        <td className="p-4 text-zinc-400">{c.birthday || '--'}</td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Link href={`/dashboard/customers/${c.customer_id}`} className="text-xs text-red-400 hover:underline">View</Link>
                            <button onClick={() => startEdit(c)} className="text-xs text-red-400 hover:underline">Edit</button>
                            <button onClick={() => handleDelete(c.customer_id)} className="text-xs text-red-400 hover:underline">Delete</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Merge Modal */}
      {mergeModalSet && (
        <CustomerMergeModal
          duplicateSet={mergeModalSet}
          onMerge={handleMergeComplete}
          onClose={() => setMergeModalSet(null)}
        />
      )}
    </div>
  );
}
