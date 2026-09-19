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
import { cn, formatCurrency } from '@/lib/utils';
import {
  FileText,
  Package,
  Truck,
  DollarSign,
  Plus,
  X,
  Search,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
} from 'lucide-react';

interface LineItem {
  name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
}

type POStatus = 'draft' | 'submitted' | 'approved' | 'received' | 'cancelled';

interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_name: string;
  items: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: POStatus;
  order_date: string;
  expected_delivery: string;
  notes: string;
  created_by: string;
}

type POFilter = POStatus | 'all';

const STATUS_OPTIONS: POFilter[] = ['all', 'draft', 'submitted', 'approved', 'received', 'cancelled'];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400',
  submitted: 'bg-blue-500/10 text-blue-400',
  approved: 'bg-amber-500/10 text-amber-400',
  received: 'bg-green-500/10 text-green-400',
  cancelled: 'bg-red-500/10 text-red-400',
};

const INITIAL: PurchaseOrder[] = [
  {
    id: 'PO1',
    po_number: 'PO-0001',
    vendor_name: 'Sysco Foods',
    items: [
      { name: 'Chicken Breast', quantity: 40, unit: 'lbs', unit_cost: 4.99 },
      { name: 'Ground Beef', quantity: 20, unit: 'lbs', unit_cost: 6.5 },
    ],
    subtotal: 329.6,
    tax: 26.37,
    total: 355.97,
    status: 'submitted',
    order_date: '2026-04-14',
    expected_delivery: '2026-04-18',
    notes: 'Weekly restock',
    created_by: 'Malik Alexander',
  },
  {
    id: 'PO2',
    po_number: 'PO-0002',
    vendor_name: 'Ocean Fresh Co',
    items: [
      { name: 'Atlantic Salmon', quantity: 25, unit: 'lbs', unit_cost: 14.5 },
    ],
    subtotal: 362.5,
    tax: 29.0,
    total: 391.5,
    status: 'approved',
    order_date: '2026-04-13',
    expected_delivery: '2026-04-17',
    notes: '',
    created_by: 'Malik Alexander',
  },
  {
    id: 'PO3',
    po_number: 'PO-0003',
    vendor_name: 'Farm Fresh Produce',
    items: [
      { name: 'Romaine Lettuce', quantity: 30, unit: 'heads', unit_cost: 1.8 },
      { name: 'Avocados', quantity: 50, unit: 'each', unit_cost: 1.8 },
    ],
    subtotal: 144,
    tax: 11.52,
    total: 155.52,
    status: 'received',
    order_date: '2026-04-10',
    expected_delivery: '2026-04-12',
    notes: '',
    created_by: 'Malik Alexander',
  },
];

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', STATUS_COLORS[status] || STATUS_COLORS.draft)}>
      {status}
    </span>
  );
}

function computeTotals(items: LineItem[]) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_cost, 0);
  const tax = subtotal * 0.08;
  return { subtotal, tax, total: subtotal + tax };
}

export default function PurchaseOrdersPage() {
  const { items: orders, add, update, remove } = useCrudList<PurchaseOrder>('seatsignals_purchase_orders', INITIAL);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<POFilter>('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseOrder | null>(null);
  const [formVendor, setFormVendor] = useState('');
  const [formDelivery, setFormDelivery] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState<POStatus>('draft');
  const [formItems, setFormItems] = useState<LineItem[]>([{ name: '', quantity: 1, unit: 'lb', unit_cost: 0 }]);

  const openAdd = () => {
    setEditing(null);
    setFormVendor('');
    setFormDelivery('');
    setFormNotes('');
    setFormStatus('draft');
    setFormItems([{ name: '', quantity: 1, unit: 'lb', unit_cost: 0 }]);
    setModalOpen(true);
  };

  const openEdit = (po: PurchaseOrder) => {
    setEditing(po);
    setFormVendor(po.vendor_name);
    setFormDelivery(po.expected_delivery);
    setFormNotes(po.notes);
    setFormStatus(po.status);
    setFormItems(po.items.length ? po.items : [{ name: '', quantity: 1, unit: 'lb', unit_cost: 0 }]);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!formVendor.trim()) {
      toast.error('Vendor name required');
      return;
    }
    const validItems = formItems.filter(i => i.name.trim());
    if (validItems.length === 0) {
      toast.error('Add at least one line item');
      return;
    }
    const totals = computeTotals(validItems);
    if (editing) {
      update(editing.id, {
        vendor_name: formVendor,
        items: validItems,
        expected_delivery: formDelivery,
        notes: formNotes,
        status: formStatus,
        ...totals,
      });
      toast.success('PO updated');
    } else {
      const nextNum = String(orders.length + 1).padStart(4, '0');
      add({
        id: `PO${Date.now()}`,
        po_number: `PO-${nextNum}`,
        vendor_name: formVendor,
        items: validItems,
        ...totals,
        status: formStatus,
        order_date: new Date().toISOString().slice(0, 10),
        expected_delivery: formDelivery,
        notes: formNotes,
        created_by: 'Malik Alexander',
      });
      toast.success('PO created');
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete?')) return;
    remove(id);
    toast.success('Deleted');
  };

  const handleApprove = (po: PurchaseOrder) => {
    update(po.id, { status: 'approved' });
    toast.success(`${po.po_number} approved`);
  };

  const addLineItem = () => setFormItems([...formItems, { name: '', quantity: 1, unit: 'lb', unit_cost: 0 }]);
  const removeLineItem = (index: number) => {
    if (formItems.length <= 1) return;
    setFormItems(formItems.filter((_, i) => i !== index));
  };
  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...formItems];
    updated[index] = { ...updated[index], [field]: value };
    setFormItems(updated);
  };

  const vendors = Array.from(new Set(orders.map(o => o.vendor_name))).sort();

  const filtered = orders.filter(po => {
    if (statusFilter !== 'all' && po.status !== statusFilter) return false;
    if (vendorFilter !== 'all' && po.vendor_name !== vendorFilter) return false;
    if (search && !po.po_number.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total_pos: orders.length,
    pending_delivery: orders.filter(o => o.status === 'approved' || o.status === 'submitted').length,
    total_this_month: orders.reduce((s, o) => s + o.total, 0),
    avg_order_value: orders.length ? orders.reduce((s, o) => s + o.total, 0) / orders.length : 0,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Purchase Orders</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage vendor orders and track deliveries</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> New PO
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total POs" value={stats.total_pos} icon={<FileText className="w-4 h-4" />} />
        <MetricCard title="Pending Delivery" value={stats.pending_delivery} icon={<Truck className="w-4 h-4" />} />
        <MetricCard title="Total Spend" value={formatCurrency(stats.total_this_month)} icon={<DollarSign className="w-4 h-4" />} />
        <MetricCard title="Avg Order" value={formatCurrency(stats.avg_order_value)} icon={<Package className="w-4 h-4" />} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search PO number..."
            className="pl-9 pr-3 py-2 bg-seat-card border border-seat-border rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-seat-red w-56"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as POFilter)}
          className="bg-seat-card border border-seat-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-seat-red"
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>
              {s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={vendorFilter}
          onChange={e => setVendorFilter(e.target.value)}
          className="bg-seat-card border border-seat-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-seat-red"
        >
          <option value="all">All Vendors</option>
          {vendors.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-seat-border">
              <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">PO #</th>
              <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Vendor</th>
              <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Order Date</th>
              <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Delivery</th>
              <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Total</th>
              <th className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(po => (
              <PORow
                key={po.id}
                po={po}
                expanded={expandedId === po.id}
                onToggle={() => setExpandedId(expandedId === po.id ? null : po.id)}
                onApprove={() => handleApprove(po)}
                onEdit={() => openEdit(po)}
                onDelete={() => handleDelete(po.id)}
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-zinc-500 text-sm py-12">No purchase orders found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.po_number}` : 'New Purchase Order'}
        maxWidth="2xl"
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
            <PrimaryButton onClick={handleSave}>{editing ? 'Save' : 'Create'}</PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <FieldLabel>Vendor Name</FieldLabel>
              <TextInput value={formVendor} onChange={setFormVendor} placeholder="Enter vendor name" />
            </div>
            <div>
              <FieldLabel>Expected Delivery</FieldLabel>
              <TextInput type="date" value={formDelivery} onChange={setFormDelivery} />
            </div>
            <div>
              <FieldLabel>Status</FieldLabel>
              <Select
                value={formStatus}
                onChange={(v) => setFormStatus(v as POStatus)}
                options={[
                  { label: 'Draft', value: 'draft' },
                  { label: 'Submitted', value: 'submitted' },
                  { label: 'Approved', value: 'approved' },
                  { label: 'Received', value: 'received' },
                  { label: 'Cancelled', value: 'cancelled' },
                ]}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <FieldLabel>Line Items</FieldLabel>
              <button type="button" onClick={addLineItem} className="flex items-center gap-1 text-xs text-seat-red hover:text-seat-red/80">
                <Plus className="w-3 h-3" /> Add Item
              </button>
            </div>
            <div className="space-y-2">
              {formItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    value={item.name}
                    onChange={e => updateLineItem(idx, 'name', e.target.value)}
                    placeholder="Item name"
                    className="col-span-4 bg-seat-black border border-seat-border rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-seat-red"
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={e => updateLineItem(idx, 'quantity', Number(e.target.value))}
                    placeholder="Qty"
                    className="col-span-2 bg-seat-black border border-seat-border rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-seat-red"
                  />
                  <input
                    value={item.unit}
                    onChange={e => updateLineItem(idx, 'unit', e.target.value)}
                    placeholder="Unit"
                    className="col-span-2 bg-seat-black border border-seat-border rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-seat-red"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={item.unit_cost}
                    onChange={e => updateLineItem(idx, 'unit_cost', Number(e.target.value))}
                    placeholder="Cost"
                    className="col-span-3 bg-seat-black border border-seat-border rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-seat-red"
                  />
                  <button
                    type="button"
                    onClick={() => removeLineItem(idx)}
                    className="col-span-1 flex items-center justify-center text-zinc-600 hover:text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Notes</FieldLabel>
            <TextArea value={formNotes} onChange={setFormNotes} placeholder="Order notes..." />
          </div>
        </div>
      </EditModal>
    </div>
  );
}

function PORow({
  po,
  expanded,
  onToggle,
  onApprove,
  onEdit,
  onDelete,
}: {
  po: PurchaseOrder;
  expanded: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const canApprove = po.status === 'submitted' || po.status === 'draft';

  return (
    <>
      <tr className="border-b border-seat-border hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={onToggle}>
        <td className="px-4 py-3 text-sm text-white font-mono">{po.po_number}</td>
        <td className="px-4 py-3 text-sm text-white">{po.vendor_name}</td>
        <td className="px-4 py-3 text-sm text-zinc-400">{po.order_date}</td>
        <td className="px-4 py-3 text-sm text-zinc-400">{po.expected_delivery}</td>
        <td className="px-4 py-3 text-sm text-white text-right font-medium">{formatCurrency(po.total)}</td>
        <td className="px-4 py-3 text-center"><StatusBadge status={po.status} /></td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
            {canApprove && (
              <button
                onClick={onApprove}
                className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded hover:bg-emerald-500/20 transition-colors"
              >
                Approve
              </button>
            )}
            <button
              onClick={onEdit}
              className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onToggle} className="text-zinc-500 hover:text-white p-1">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-seat-border bg-white/[0.01]">
          <td colSpan={7} className="px-4 py-4">
            <div className="space-y-3">
              {po.notes && <p className="text-xs text-zinc-500">Notes: {po.notes}</p>}
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left text-xs text-zinc-600 pb-1">Item</th>
                    <th className="text-right text-xs text-zinc-600 pb-1">Qty</th>
                    <th className="text-right text-xs text-zinc-600 pb-1">Unit</th>
                    <th className="text-right text-xs text-zinc-600 pb-1">Unit Cost</th>
                    <th className="text-right text-xs text-zinc-600 pb-1">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {po.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="text-sm text-zinc-300 py-0.5">{item.name}</td>
                      <td className="text-sm text-zinc-400 text-right">{item.quantity}</td>
                      <td className="text-sm text-zinc-400 text-right">{item.unit}</td>
                      <td className="text-sm text-zinc-400 text-right">{formatCurrency(item.unit_cost)}</td>
                      <td className="text-sm text-white text-right">{formatCurrency(item.quantity * item.unit_cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end gap-6 pt-2 border-t border-seat-border text-sm">
                <span className="text-zinc-500">Subtotal: <span className="text-zinc-300">{formatCurrency(po.subtotal)}</span></span>
                <span className="text-zinc-500">Tax: <span className="text-zinc-300">{formatCurrency(po.tax)}</span></span>
                <span className="text-zinc-500">Total: <span className="text-white font-medium">{formatCurrency(po.total)}</span></span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
