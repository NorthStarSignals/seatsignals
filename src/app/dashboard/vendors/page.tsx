'use client';

import { useState } from 'react';
import { useCrudApi } from '@/hooks/use-crud-api';
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
  Package,
  Phone,
  Mail,
  Star,
  Truck,
  Plus,
  Search,
  Pencil,
  Trash2,
} from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
  category: string;
  contact_name: string;
  email: string;
  phone: string;
  payment_terms: string;
  rating: number;
  status: 'active' | 'inactive' | 'pending';
  total_spend: number;
  last_order_date: string;
  delivery_days: string[];
  notes: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const INITIAL: Vendor[] = [
  { id: 'V1', name: 'Sysco Foods', category: 'dry-goods', contact_name: 'Bill Harper', email: 'bill@sysco.com', phone: '(555) 200-0100', payment_terms: 'net-30', rating: 4, status: 'active', total_spend: 18400, last_order_date: '2026-04-10', delivery_days: ['Monday', 'Thursday'], notes: 'Primary distributor' },
  { id: 'V2', name: 'Farm Fresh Produce', category: 'produce', contact_name: 'Lisa Chen', email: 'orders@farmfresh.com', phone: '(555) 200-0101', payment_terms: 'net-15', rating: 5, status: 'active', total_spend: 8200, last_order_date: '2026-04-14', delivery_days: ['Tuesday', 'Friday'], notes: 'Local, organic certified' },
  { id: 'V3', name: 'Prime Meats', category: 'meat', contact_name: 'Joe Ruiz', email: 'joe@primemeats.com', phone: '(555) 200-0102', payment_terms: 'net-30', rating: 5, status: 'active', total_spend: 14500, last_order_date: '2026-04-12', delivery_days: ['Wednesday'], notes: 'Wagyu supplier' },
  { id: 'V4', name: 'Ocean Fresh Co', category: 'seafood', contact_name: 'Maria Delgado', email: 'maria@oceanfresh.com', phone: '(555) 200-0103', payment_terms: 'net-7', rating: 4, status: 'active', total_spend: 9800, last_order_date: '2026-04-15', delivery_days: ['Tuesday', 'Friday'], notes: 'Fresh catch daily' },
];

const CATEGORIES = ['all', 'produce', 'meat', 'seafood', 'dairy', 'beverages', 'dry-goods', 'supplies', 'equipment'] as const;

const DAY_ABBREV: Record<string, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun',
};

function StarRatingDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={cn('w-3.5 h-3.5', i <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-zinc-700')} />
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-500/10 text-green-400',
    inactive: 'bg-zinc-500/10 text-zinc-400',
    pending: 'bg-amber-500/10 text-amber-400',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', colors[status] || colors.inactive)}>
      {status}
    </span>
  );
}

export default function VendorsPage() {
  const { items: vendors, add, update, remove } = useCrudApi<Vendor>('/api/vendors');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const emptyForm: Omit<Vendor, 'id'> = {
    name: '',
    category: 'produce',
    contact_name: '',
    email: '',
    phone: '',
    payment_terms: 'net-30',
    rating: 3,
    status: 'active',
    total_spend: 0,
    last_order_date: '',
    delivery_days: [],
    notes: '',
  };
  const [form, setForm] = useState<Omit<Vendor, 'id'>>(emptyForm);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row: Vendor) => {
    setEditing(row);
    setForm({
      name: row.name,
      category: row.category,
      contact_name: row.contact_name,
      email: row.email,
      phone: row.phone,
      payment_terms: row.payment_terms,
      rating: row.rating,
      status: row.status,
      total_spend: row.total_spend,
      last_order_date: row.last_order_date,
      delivery_days: row.delivery_days,
      notes: row.notes,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('Vendor name required');
      return;
    }
    if (editing) {
      update(editing.id, form);
      toast.success('Vendor updated');
    } else {
      add({ ...form });
      toast.success('Vendor added');
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete?')) return;
    remove(id);
    toast.success('Deleted');
  };

  const toggleDeliveryDay = (day: string) => {
    setForm(prev => ({
      ...prev,
      delivery_days: prev.delivery_days.includes(day)
        ? prev.delivery_days.filter(d => d !== day)
        : [...prev.delivery_days, day],
    }));
  };

  const stats = {
    total_vendors: vendors.length,
    active_vendors: vendors.filter(v => v.status === 'active').length,
    total_monthly_spend: vendors.reduce((s, v) => s + v.total_spend, 0),
    avg_rating: vendors.length ? vendors.reduce((s, v) => s + v.rating, 0) / vendors.length : 0,
  };

  const filtered = vendors
    .filter(v => activeCategory === 'all' || v.category === activeCategory)
    .filter(v => v.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Vendor Management</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg hover:bg-seat-red/90 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add Vendor
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Vendors" value={stats.total_vendors} icon={<Package className="w-4 h-4" />} />
        <MetricCard title="Active" value={stats.active_vendors} icon={<Truck className="w-4 h-4" />} />
        <MetricCard title="Monthly Spend" value={formatCurrency(stats.total_monthly_spend)} icon={<Package className="w-4 h-4" />} />
        <MetricCard title="Avg Rating" value={stats.avg_rating.toFixed(1)} icon={<Star className="w-4 h-4" />} />
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search vendors by name..."
            className="w-full bg-seat-card border border-seat-border rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:border-seat-red"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
                activeCategory === cat
                  ? 'bg-seat-red text-white'
                  : 'bg-seat-card border border-seat-border text-zinc-400 hover:border-zinc-500'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(vendor => (
          <div
            key={vendor.id}
            className="bg-seat-card border border-seat-border rounded-xl p-5 hover:border-zinc-600 transition-colors group"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-white font-semibold text-sm">{vendor.name}</h3>
                <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-xs font-medium bg-seat-red/10 text-seat-red capitalize">
                  {vendor.category}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <StatusBadge status={vendor.status} />
                <button
                  onClick={() => openEdit(vendor)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-500 hover:text-white transition-all"
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(vendor.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-500 hover:text-red-400 transition-all"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <StarRatingDisplay rating={vendor.rating} />

            <div className="mt-3 space-y-1.5 text-sm">
              <div className="flex items-center gap-2 text-zinc-400">
                <Package className="w-3.5 h-3.5 text-zinc-500" />
                <span>{vendor.contact_name || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                <Mail className="w-3.5 h-3.5 text-zinc-500" />
                <span className="truncate">{vendor.email || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                <Phone className="w-3.5 h-3.5 text-zinc-500" />
                <span>{vendor.phone || '—'}</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-seat-border">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                <span>Total Spend: <span className="text-white font-medium">{formatCurrency(vendor.total_spend)}</span></span>
                <span className="uppercase">{vendor.payment_terms}</span>
              </div>
              {vendor.last_order_date && (
                <p className="text-xs text-zinc-500 mb-2">
                  Last order: {new Date(vendor.last_order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
              <div className="flex items-center gap-1 flex-wrap">
                <Truck className="w-3.5 h-3.5 text-zinc-500 mr-1" />
                {vendor.delivery_days.map(day => (
                  <span key={day} className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-medium">
                    {DAY_ABBREV[day] || day}
                  </span>
                ))}
              </div>
            </div>

            {vendor.notes && <p className="mt-2 text-xs text-zinc-500 italic line-clamp-2">{vendor.notes}</p>}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <Package className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
          <p className="text-sm">No vendors found</p>
        </div>
      )}

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Vendor' : 'New Vendor'}
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
              <FieldLabel>Vendor Name</FieldLabel>
              <TextInput value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. Fresh Fields Farm" />
            </div>
            <div>
              <FieldLabel>Category</FieldLabel>
              <Select
                value={form.category}
                onChange={(v) => setForm({ ...form, category: v })}
                options={CATEGORIES.filter(c => c !== 'all').map(c => ({ label: c, value: c }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Contact Name</FieldLabel>
              <TextInput value={form.contact_name} onChange={(v) => setForm({ ...form, contact_name: v })} />
            </div>
            <div>
              <FieldLabel>Email</FieldLabel>
              <TextInput type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Phone</FieldLabel>
              <TextInput value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            </div>
            <div>
              <FieldLabel>Payment Terms</FieldLabel>
              <Select
                value={form.payment_terms}
                onChange={(v) => setForm({ ...form, payment_terms: v })}
                options={[
                  { label: 'Net 7', value: 'net-7' },
                  { label: 'Net 15', value: 'net-15' },
                  { label: 'Net 30', value: 'net-30' },
                  { label: 'COD', value: 'cod' },
                ]}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <FieldLabel>Status</FieldLabel>
              <Select
                value={form.status}
                onChange={(v) => setForm({ ...form, status: v as Vendor['status'] })}
                options={[
                  { label: 'Active', value: 'active' },
                  { label: 'Inactive', value: 'inactive' },
                  { label: 'Pending', value: 'pending' },
                ]}
              />
            </div>
            <div>
              <FieldLabel>Rating (1-5)</FieldLabel>
              <Select
                value={String(form.rating)}
                onChange={(v) => setForm({ ...form, rating: Number(v) })}
                options={[1, 2, 3, 4, 5].map(n => ({ label: `${n} star${n > 1 ? 's' : ''}`, value: String(n) }))}
              />
            </div>
            <div>
              <FieldLabel>Total Spend ($)</FieldLabel>
              <TextInput type="number" value={form.total_spend} onChange={(v) => setForm({ ...form, total_spend: Number(v) || 0 })} />
            </div>
          </div>
          <div>
            <FieldLabel>Delivery Days</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {Object.entries(DAY_ABBREV).map(([day, abbrev]) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDeliveryDay(day)}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-medium transition-colors',
                    form.delivery_days.includes(day)
                      ? 'bg-seat-red text-white'
                      : 'bg-seat-black border border-seat-border text-zinc-400 hover:border-zinc-500'
                  )}
                >
                  {abbrev}
                </button>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Notes</FieldLabel>
            <TextArea value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} placeholder="Additional notes..." />
          </div>
        </div>
      </EditModal>
    </div>
  );
}
