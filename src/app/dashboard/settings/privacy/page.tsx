'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { useLocalStorageState, useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal,
  FieldLabel,
  TextInput,
  Select,
  PrimaryButton,
  GhostButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { Shield, Download, Trash2, FileText, Lock, Plus, Pencil } from 'lucide-react';

interface PrivacyPrefs {
  retention: string;
  anonymize: boolean;
  encryptPii: boolean;
}

interface DataRequest {
  id: string;
  type: string;
  email: string;
  date: string;
  status: 'pending' | 'completed';
}

const DEFAULT_PREFS: PrivacyPrefs = {
  retention: '730',
  anonymize: true,
  encryptPii: true,
};

const DEFAULT_REQUESTS: DataRequest[] = [
  { id: 'dr-1', type: 'Data Access', email: 'jane@example.com', date: '2026-04-09', status: 'completed' },
  { id: 'dr-2', type: 'Data Deletion', email: 'mike@example.com', date: '2026-04-08', status: 'pending' },
  { id: 'dr-3', type: 'Data Export', email: 'sarah@example.com', date: '2026-04-07', status: 'completed' },
  { id: 'dr-4', type: 'Data Correction', email: 'tom@example.com', date: '2026-04-05', status: 'completed' },
];

const emptyForm = () => ({
  type: 'Data Access',
  email: '',
  date: new Date().toISOString().split('T')[0],
  status: 'pending' as DataRequest['status'],
});

export default function PrivacyPage() {
  const [prefs, setPrefs] = useLocalStorageState<PrivacyPrefs>(
    'seatsignals_settings_privacy',
    DEFAULT_PREFS
  );
  const { items: requests, add, update, remove } = useCrudList<DataRequest>(
    'seatsignals_settings_privacy_requests',
    DEFAULT_REQUESTS
  );
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (r: DataRequest) => {
    setEditingId(r.id);
    setForm({ type: r.type, email: r.email, date: r.date, status: r.status });
    setShowModal(true);
  };

  const saveRequest = () => {
    if (!form.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (editingId) {
      update(editingId, form);
      toast.success('Request updated');
    } else {
      add({ id: `dr-${Date.now()}`, ...form });
      toast.success('Request added');
    }
    setShowModal(false);
  };

  const deleteRequest = (id: string) => {
    if (!confirm('Delete this request?')) return;
    remove(id);
    toast.success('Deleted');
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Privacy & Data Protection</h1>
        <p className="text-zinc-500 mt-1">GDPR, CCPA, and CPRA compliance settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Data Requests" value={requests.length} subtitle="on record" />
        <MetricCard title="SLA for requests" value="30 days" subtitle="per GDPR/CCPA" />
        <MetricCard title="Encryption" value="TLS + at-rest" subtitle="via our providers" />
        <MetricCard title="AI training" value="Never" subtitle="your data stays yours" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-seat-card border border-seat-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-seat-red" />
            Data Retention Policy
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Customer data retention period</label>
              <select
                value={prefs.retention}
                onChange={(e) => setPrefs(p => ({ ...p, retention: e.target.value }))}
                className="w-full bg-seat-black border border-seat-border rounded-lg px-4 py-2 text-white"
              >
                <option value="365">1 year</option>
                <option value="730">2 years</option>
                <option value="1095">3 years</option>
                <option value="1825">5 years</option>
                <option value="forever">Indefinite</option>
              </select>
            </div>
            <div className="flex items-center justify-between py-3 border-t border-seat-border/50">
              <div>
                <div className="text-white">Auto-anonymize inactive guests</div>
                <div className="text-xs text-zinc-500">After 18 months of inactivity</div>
              </div>
              <button
                onClick={() => setPrefs(p => ({ ...p, anonymize: !p.anonymize }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${prefs.anonymize ? 'bg-seat-red' : 'bg-seat-border'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${prefs.anonymize ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between py-3 border-t border-seat-border/50">
              <div>
                <div className="text-white">Encrypt PII at rest</div>
                <div className="text-xs text-zinc-500">Names, emails, phone numbers</div>
              </div>
              <button
                onClick={() => setPrefs(p => ({ ...p, encryptPii: !p.encryptPii }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${prefs.encryptPii ? 'bg-seat-red' : 'bg-seat-border'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${prefs.encryptPii ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-seat-card border border-seat-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-seat-red" />
            Customer Rights
          </h3>
          <div className="space-y-3">
            {[
              { icon: Download, name: 'Right to Access', desc: 'Customers can request all data we hold' },
              { icon: FileText, name: 'Right to Portability', desc: 'Export data in machine-readable format' },
              { icon: Trash2, name: 'Right to Erasure', desc: 'Delete all customer data on request' },
              { icon: Shield, name: 'Right to Rectification', desc: 'Correct inaccurate personal data' },
            ].map((r, i) => (
              <div key={i} className="bg-seat-black border border-seat-border rounded-lg p-3 flex items-start gap-3">
                <r.icon className="w-5 h-5 text-seat-red flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-white font-medium text-sm">{r.name}</div>
                  <div className="text-xs text-zinc-500">{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Data Requests</h3>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-3 py-1.5 bg-seat-red text-white rounded-lg text-xs font-medium hover:bg-seat-red/90"
          >
            <Plus size={12} /> Add Request
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-seat-border text-zinc-500">
                <th className="text-left py-3 px-2">Request Type</th>
                <th className="text-left py-3 px-2">Customer</th>
                <th className="text-left py-3 px-2">Date</th>
                <th className="text-center py-3 px-2">Status</th>
                <th className="py-3 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id} className="border-b border-seat-border/50">
                  <td className="py-3 px-2 text-white">{r.type}</td>
                  <td className="py-3 px-2 text-zinc-400">{r.email}</td>
                  <td className="py-3 px-2 text-zinc-400">{r.date}</td>
                  <td className="py-3 px-2 text-center">
                    <span className={`px-2 py-1 rounded text-xs border ${r.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/30' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => openEdit(r)}
                        className="p-1.5 text-zinc-400 hover:text-white"
                        aria-label="Edit"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => deleteRequest(r.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-400"
                        aria-label="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-500 text-xs">No data requests on record.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EditModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit Data Request' : 'Add Data Request'}
        footer={
          <>
            <GhostButton onClick={() => setShowModal(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={saveRequest}>{editingId ? 'Save Changes' : 'Add'}</PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Request Type</FieldLabel>
            <Select
              value={form.type}
              onChange={v => setForm(f => ({ ...f, type: v }))}
              options={[
                { label: 'Data Access', value: 'Data Access' },
                { label: 'Data Deletion', value: 'Data Deletion' },
                { label: 'Data Export', value: 'Data Export' },
                { label: 'Data Correction', value: 'Data Correction' },
              ]}
            />
          </div>
          <div>
            <FieldLabel>Customer Email</FieldLabel>
            <TextInput type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="customer@example.com" />
          </div>
          <div>
            <FieldLabel>Date</FieldLabel>
            <TextInput type="date" value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} />
          </div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <Select
              value={form.status}
              onChange={v => setForm(f => ({ ...f, status: v as DataRequest['status'] }))}
              options={[
                { label: 'Pending', value: 'pending' },
                { label: 'Completed', value: 'completed' },
              ]}
            />
          </div>
        </div>
      </EditModal>
    </div>
  );
}
