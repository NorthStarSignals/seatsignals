'use client';

import { useState } from 'react';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal,
  FieldLabel,
  TextInput,
  Select,
  PrimaryButton,
  GhostButton,
  DangerButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { MetricCard } from '@/components/ui/metric-card';
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  DollarSign,
  Pencil,
  Trash2,
  Plus,
} from 'lucide-react';

type ContractStatus = 'active' | 'expiring' | 'expired';

interface Contract {
  id: string;
  vendor: string;
  category: string;
  value: number;
  start: string;
  end: string;
  status: ContractStatus;
  autoRenew: boolean;
  terms: string;
}

const INITIAL: Contract[] = [
  { id: 'C1', vendor: 'Sysco Foods', category: 'Food Distribution', value: 184000, start: '2025-01-01', end: '2026-12-31', status: 'active', autoRenew: true, terms: 'Net 30' },
  { id: 'C2', vendor: 'US Foods', category: 'Produce', value: 92500, start: '2025-06-15', end: '2026-06-14', status: 'active', autoRenew: false, terms: 'Net 15' },
  { id: 'C3', vendor: 'Shamrock Beverages', category: 'Wine & Spirits', value: 145000, start: '2024-09-01', end: '2026-05-31', status: 'expiring', autoRenew: false, terms: 'Net 30' },
  { id: 'C4', vendor: 'Restaurant Depot', category: 'Dry Goods', value: 38400, start: '2025-03-01', end: '2027-02-28', status: 'active', autoRenew: true, terms: 'Net 30' },
  { id: 'C5', vendor: 'Premium Linens Co', category: 'Linens & Laundry', value: 24800, start: '2024-11-15', end: '2026-04-30', status: 'expiring', autoRenew: false, terms: 'Net 30' },
  { id: 'C6', vendor: 'EcoClean Services', category: 'Cleaning', value: 18600, start: '2025-04-01', end: '2026-03-31', status: 'expired', autoRenew: false, terms: 'Net 15' },
  { id: 'C7', vendor: 'Pacific Seafood', category: 'Seafood', value: 78200, start: '2025-08-01', end: '2026-07-31', status: 'active', autoRenew: true, terms: 'Net 7' },
  { id: 'C8', vendor: 'Fresh Bakery Co', category: 'Bread & Pastry', value: 32100, start: '2025-02-01', end: '2027-01-31', status: 'active', autoRenew: true, terms: 'Net 15' },
];

const statusBadge = (s: ContractStatus) => {
  if (s === 'active') return 'bg-green-500/10 text-green-500 border-green-500/30';
  if (s === 'expiring') return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
  return 'bg-red-500/10 text-red-500 border-red-500/30';
};

export default function VendorContractsPage() {
  const { items: contracts, add, update, remove } = useCrudList<Contract>('seatsignals_vendor_contracts', INITIAL);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [form, setForm] = useState<Omit<Contract, 'id'>>({
    vendor: '',
    category: '',
    value: 0,
    start: '',
    end: '',
    status: 'active',
    autoRenew: false,
    terms: 'Net 30',
  });

  const openAdd = () => {
    setEditing(null);
    setForm({
      vendor: '',
      category: '',
      value: 0,
      start: '',
      end: '',
      status: 'active',
      autoRenew: false,
      terms: 'Net 30',
    });
    setModalOpen(true);
  };

  const openEdit = (c: Contract) => {
    setEditing(c);
    setForm({
      vendor: c.vendor,
      category: c.category,
      value: c.value,
      start: c.start,
      end: c.end,
      status: c.status,
      autoRenew: c.autoRenew,
      terms: c.terms,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.vendor.trim()) {
      toast.error('Vendor name required');
      return;
    }
    if (editing) {
      update(editing.id, form);
      toast.success('Contract updated');
    } else {
      add({ id: `C${Date.now()}`, ...form });
      toast.success('Contract added');
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete?')) return;
    remove(id);
    toast.success('Deleted');
  };

  const totalValue = contracts.reduce((s, c) => s + c.value, 0);
  const expiring = contracts.filter(c => c.status === 'expiring').length;
  const expired = contracts.filter(c => c.status === 'expired').length;
  const largest = [...contracts].sort((a, b) => b.value - a.value)[0];
  const nextRenewal = [...contracts]
    .filter(c => c.status !== 'expired')
    .sort((a, b) => new Date(a.end).getTime() - new Date(b.end).getTime())[0];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Vendor Contracts</h1>
          <p className="text-seat-muted mt-1">Manage supplier agreements, terms, and renewals</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg font-medium"
        >
          <Plus className="w-4 h-4" /> New Contract
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Active Contracts" value={contracts.filter(c => c.status === 'active').length} subtitle={`${contracts.length} total`} />
        <MetricCard title="Total Annual Value" value={`$${(totalValue / 1000).toFixed(0)}K`} subtitle="across all vendors" />
        <MetricCard title="Expiring Soon" value={expiring} subtitle="next 60 days" />
        <MetricCard title="Expired" value={expired} subtitle="needs action" />
      </div>

      {(expiring > 0 || expired > 0) && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-yellow-500 font-medium">Contracts requiring attention</div>
            <div className="text-sm text-seat-muted mt-1">{expiring} expiring soon · {expired} expired. Review terms before negotiation.</div>
          </div>
        </div>
      )}

      <div className="bg-seat-card border border-seat-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-seat-red" />
          All Contracts
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-seat-border text-seat-muted">
                <th className="text-left py-3 px-2">Vendor</th>
                <th className="text-left py-3 px-2">Category</th>
                <th className="text-right py-3 px-2">Annual Value</th>
                <th className="text-left py-3 px-2">Term</th>
                <th className="text-left py-3 px-2">Payment</th>
                <th className="text-center py-3 px-2">Auto-Renew</th>
                <th className="text-center py-3 px-2">Status</th>
                <th className="text-right py-3 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map(c => (
                <tr key={c.id} className="border-b border-seat-border/50 hover:bg-seat-black/50">
                  <td className="py-3 px-2 text-white font-medium">{c.vendor}</td>
                  <td className="py-3 px-2 text-seat-muted">{c.category}</td>
                  <td className="py-3 px-2 text-right text-white">${c.value.toLocaleString()}</td>
                  <td className="py-3 px-2 text-seat-muted text-xs">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {c.start} → {c.end}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-seat-muted">{c.terms}</td>
                  <td className="py-3 px-2 text-center">
                    {c.autoRenew ? <CheckCircle2 className="w-4 h-4 text-green-500 inline" /> : <span className="text-seat-muted text-xs">No</span>}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className={`px-2 py-1 rounded text-xs border ${statusBadge(c.status)}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {contracts.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-zinc-500 text-sm py-8">No contracts yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <DollarSign className="w-5 h-5 text-seat-red mb-2" />
          <div className="text-sm text-seat-muted">Largest Contract</div>
          <div className="text-xl font-bold text-white mt-1">{largest?.vendor || '—'}</div>
          <div className="text-xs text-seat-muted">${(largest?.value || 0).toLocaleString()}/year</div>
        </div>
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <Calendar className="w-5 h-5 text-seat-red mb-2" />
          <div className="text-sm text-seat-muted">Next Renewal</div>
          <div className="text-xl font-bold text-white mt-1">{nextRenewal?.vendor || '—'}</div>
          <div className="text-xs text-seat-muted">{nextRenewal?.end || '—'}</div>
        </div>
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <CheckCircle2 className="w-5 h-5 text-seat-red mb-2" />
          <div className="text-sm text-seat-muted">Auto-Renewing</div>
          <div className="text-xl font-bold text-white mt-1">{contracts.filter(c => c.autoRenew).length} contracts</div>
          <div className="text-xs text-seat-muted">${contracts.filter(c => c.autoRenew).reduce((s, c) => s + c.value, 0).toLocaleString()}/year</div>
        </div>
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Contract' : 'New Contract'}
        maxWidth="lg"
        footer={
          <>
            {editing && (
              <DangerButton
                onClick={() => {
                  if (!confirm('Delete?')) return;
                  remove(editing.id);
                  toast.success('Deleted');
                  setModalOpen(false);
                }}
              >
                Delete
              </DangerButton>
            )}
            <GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={handleSave}>{editing ? 'Save' : 'Add'}</PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Vendor</FieldLabel>
              <TextInput value={form.vendor} onChange={(v) => setForm({ ...form, vendor: v })} placeholder="e.g. Sysco Foods" />
            </div>
            <div>
              <FieldLabel>Category</FieldLabel>
              <TextInput value={form.category} onChange={(v) => setForm({ ...form, category: v })} placeholder="e.g. Food Distribution" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Annual Value ($)</FieldLabel>
              <TextInput type="number" value={form.value} onChange={(v) => setForm({ ...form, value: Number(v) || 0 })} />
            </div>
            <div>
              <FieldLabel>Payment Terms</FieldLabel>
              <Select
                value={form.terms}
                onChange={(v) => setForm({ ...form, terms: v })}
                options={[
                  { label: 'Net 7', value: 'Net 7' },
                  { label: 'Net 15', value: 'Net 15' },
                  { label: 'Net 30', value: 'Net 30' },
                  { label: 'Net 60', value: 'Net 60' },
                  { label: 'COD', value: 'COD' },
                ]}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Start Date</FieldLabel>
              <TextInput type="date" value={form.start} onChange={(v) => setForm({ ...form, start: v })} />
            </div>
            <div>
              <FieldLabel>End Date</FieldLabel>
              <TextInput type="date" value={form.end} onChange={(v) => setForm({ ...form, end: v })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Status</FieldLabel>
              <Select
                value={form.status}
                onChange={(v) => setForm({ ...form, status: v as ContractStatus })}
                options={[
                  { label: 'Active', value: 'active' },
                  { label: 'Expiring', value: 'expiring' },
                  { label: 'Expired', value: 'expired' },
                ]}
              />
            </div>
            <div>
              <FieldLabel>Auto-Renew</FieldLabel>
              <Select
                value={form.autoRenew ? 'yes' : 'no'}
                onChange={(v) => setForm({ ...form, autoRenew: v === 'yes' })}
                options={[
                  { label: 'Yes', value: 'yes' },
                  { label: 'No', value: 'no' },
                ]}
              />
            </div>
          </div>
        </div>
      </EditModal>
    </div>
  );
}
