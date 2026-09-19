'use client';

import { useState } from 'react';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal,
  FieldLabel,
  TextInput,
  TextArea,
  Select,
  PrimaryButton,
  GhostButton,
  DangerButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { MetricCard } from '@/components/ui/metric-card';
import { formatCurrency, cn } from '@/lib/utils';
import {
  FileText,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';

type BillStatus = 'pending' | 'approved' | 'paid' | 'overdue';

interface Bill {
  id: string;
  vendor_name: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  status: BillStatus;
  category: string;
  description: string;
  created_at: string;
}

const INITIAL: Bill[] = [
  { id: 'B1', vendor_name: 'Sysco Foods', invoice_number: 'SY-98421', amount: 4820.5, due_date: '2026-04-20', status: 'pending', category: 'Food', description: 'Weekly dry goods restock', created_at: '2026-04-08' },
  { id: 'B2', vendor_name: 'Ocean Fresh Co', invoice_number: 'OF-5532', amount: 1245.0, due_date: '2026-04-12', status: 'overdue', category: 'Seafood', description: 'Salmon + lobster delivery', created_at: '2026-03-29' },
  { id: 'B3', vendor_name: 'Dairy Direct', invoice_number: 'DD-2019', amount: 642.8, due_date: '2026-04-18', status: 'approved', category: 'Dairy', description: 'Cream, butter, cheese', created_at: '2026-04-04' },
  { id: 'B4', vendor_name: 'Shamrock Beverages', invoice_number: 'SB-110244', amount: 2890.0, due_date: '2026-04-05', status: 'paid', category: 'Beverage', description: 'Wine + liquor order', created_at: '2026-03-22' },
  { id: 'B5', vendor_name: 'HVAC Solutions', invoice_number: 'HV-7781', amount: 1450.0, due_date: '2026-04-25', status: 'pending', category: 'Maintenance', description: 'Hood vent repair', created_at: '2026-04-10' },
];

const STATUS_STYLES: Record<BillStatus, string> = {
  pending: 'bg-blue-500/10 text-blue-400',
  approved: 'bg-amber-500/10 text-amber-400',
  paid: 'bg-green-500/10 text-green-400',
  overdue: 'bg-red-500/10 text-red-400',
};

export default function AccountsPayablePage() {
  const { items: bills, add, update, remove } = useCrudList<Bill>('seatsignals_ap_invoices', INITIAL);
  const [filter, setFilter] = useState<BillStatus | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);

  const emptyForm: Omit<Bill, 'id' | 'created_at'> = {
    vendor_name: '',
    invoice_number: '',
    amount: 0,
    due_date: new Date().toISOString().slice(0, 10),
    status: 'pending',
    category: 'Food',
    description: '',
  };
  const [form, setForm] = useState<Omit<Bill, 'id' | 'created_at'>>(emptyForm);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (b: Bill) => {
    setEditing(b);
    setForm({
      vendor_name: b.vendor_name,
      invoice_number: b.invoice_number,
      amount: b.amount,
      due_date: b.due_date,
      status: b.status,
      category: b.category,
      description: b.description,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.vendor_name.trim() || !form.invoice_number.trim()) {
      toast.error('Vendor and invoice number required');
      return;
    }
    if (editing) {
      update(editing.id, form);
      toast.success('Invoice updated');
    } else {
      add({ id: `B${Date.now()}`, created_at: new Date().toISOString().slice(0, 10), ...form });
      toast.success('Invoice added');
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete?')) return;
    remove(id);
    toast.success('Deleted');
  };

  const markPaid = (b: Bill) => {
    update(b.id, { status: 'paid' });
    toast.success(`${b.invoice_number} marked paid`);
  };

  const markApproved = (b: Bill) => {
    update(b.id, { status: 'approved' });
    toast.success(`${b.invoice_number} approved`);
  };

  const stats = {
    total_bills: bills.length,
    total_owed: bills.filter(b => b.status !== 'paid').reduce((s, b) => s + b.amount, 0),
    overdue_count: bills.filter(b => b.status === 'overdue').length,
    overdue_amount: bills.filter(b => b.status === 'overdue').reduce((s, b) => s + b.amount, 0),
    due_this_week: bills.filter(b => {
      if (b.status === 'paid') return false;
      const diff = (new Date(b.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return diff <= 7 && diff >= 0;
    }).length,
    paid_this_month: bills.filter(b => b.status === 'paid').reduce((s, b) => s + b.amount, 0),
  };

  const filtered = filter === 'all' ? bills : bills.filter(b => b.status === filter);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Accounts Payable</h1>
            <p className="text-sm text-zinc-500">Track and manage vendor invoices</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90"
        >
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total Owed" value={formatCurrency(stats.total_owed)} icon={<DollarSign size={18} />} />
        <MetricCard title="Overdue" value={stats.overdue_count} icon={<AlertTriangle size={18} />} />
        <MetricCard title="Due This Week" value={stats.due_this_week} icon={<Clock size={18} />} />
        <MetricCard title="Paid This Month" value={formatCurrency(stats.paid_this_month)} icon={<CheckCircle size={18} />} />
      </div>

      {stats.overdue_count > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">
            {stats.overdue_count} overdue bill{stats.overdue_count > 1 ? 's' : ''} totaling {formatCurrency(stats.overdue_amount)}
          </p>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {(['all', 'overdue', 'pending', 'approved', 'paid'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              filter === f ? 'bg-seat-red text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
            )}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-seat-border">
              <th className="text-left px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Vendor</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Invoice</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Category</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Amount</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Due Date</th>
              <th className="text-left px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Status</th>
              <th className="text-right px-4 py-3 text-[11px] font-medium text-zinc-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(bill => (
              <tr
                key={bill.id}
                className={cn(
                  'border-b border-seat-border/50 hover:bg-zinc-800/30 transition-colors',
                  bill.status === 'overdue' && 'bg-red-500/5'
                )}
              >
                <td className="px-4 py-3">
                  <p className="text-white font-medium">{bill.vendor_name}</p>
                  <p className="text-[10px] text-zinc-500">{bill.description}</p>
                </td>
                <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{bill.invoice_number}</td>
                <td className="px-4 py-3 text-zinc-400">{bill.category}</td>
                <td className="px-4 py-3 text-right text-white font-medium">{formatCurrency(bill.amount)}</td>
                <td className="px-4 py-3 text-zinc-300">{new Date(bill.due_date).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', STATUS_STYLES[bill.status])}>
                    {bill.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {bill.status === 'pending' && (
                      <button
                        onClick={() => markApproved(bill)}
                        className="text-[10px] px-2 py-1 bg-amber-500/10 text-amber-400 rounded hover:bg-amber-500/20"
                      >
                        Approve
                      </button>
                    )}
                    {(bill.status === 'approved' || bill.status === 'overdue') && (
                      <button
                        onClick={() => markPaid(bill)}
                        className="text-[10px] px-2 py-1 bg-green-500/10 text-green-400 rounded hover:bg-green-500/20"
                      >
                        Mark Paid
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(bill)}
                      className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(bill.id)}
                      className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-zinc-500 text-sm py-8">No invoices match filter.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Invoice' : 'New Invoice'}
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
              <TextInput value={form.vendor_name} onChange={(v) => setForm({ ...form, vendor_name: v })} placeholder="e.g. Sysco Foods" />
            </div>
            <div>
              <FieldLabel>Invoice #</FieldLabel>
              <TextInput value={form.invoice_number} onChange={(v) => setForm({ ...form, invoice_number: v })} placeholder="e.g. INV-12345" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Amount ($)</FieldLabel>
              <TextInput type="number" value={form.amount} onChange={(v) => setForm({ ...form, amount: Number(v) || 0 })} />
            </div>
            <div>
              <FieldLabel>Due Date</FieldLabel>
              <TextInput type="date" value={form.due_date} onChange={(v) => setForm({ ...form, due_date: v })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Category</FieldLabel>
              <Select
                value={form.category}
                onChange={(v) => setForm({ ...form, category: v })}
                options={[
                  { label: 'Food', value: 'Food' },
                  { label: 'Seafood', value: 'Seafood' },
                  { label: 'Dairy', value: 'Dairy' },
                  { label: 'Beverage', value: 'Beverage' },
                  { label: 'Maintenance', value: 'Maintenance' },
                  { label: 'Supplies', value: 'Supplies' },
                  { label: 'Utilities', value: 'Utilities' },
                  { label: 'Other', value: 'Other' },
                ]}
              />
            </div>
            <div>
              <FieldLabel>Status</FieldLabel>
              <Select
                value={form.status}
                onChange={(v) => setForm({ ...form, status: v as BillStatus })}
                options={[
                  { label: 'Pending', value: 'pending' },
                  { label: 'Approved', value: 'approved' },
                  { label: 'Paid', value: 'paid' },
                  { label: 'Overdue', value: 'overdue' },
                ]}
              />
            </div>
          </div>
          <div>
            <FieldLabel>Description</FieldLabel>
            <TextArea value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Invoice details..." />
          </div>
        </div>
      </EditModal>
    </div>
  );
}
