'use client';

import { useState, useMemo } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useCrudApi } from '@/hooks/use-crud-api';
import {
  EditModal,
  FieldLabel,
  TextInput,
  Select,
  PrimaryButton,
  GhostButton,
} from '@/components/dashboard/edit-modal';
import {
  Ticket,
  Copy,
  Plus,
  Search,
  Pause,
  Play,
  Trash2,
  Percent,
  DollarSign,
  Pencil,
} from 'lucide-react';

// -- Types ------------------------------------------------------------------

interface PromoCode {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'bogo' | 'free_item';
  value: number;
  min_order: number;
  max_uses: number;
  current_uses: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'paused' | 'exhausted';
  applicable_to: 'dine_in' | 'delivery' | 'takeout' | 'all';
  created_at: string;
}

// -- Helpers ----------------------------------------------------------------

function getStatusConfig(status: string) {
  switch (status) {
    case 'active':
      return { label: 'Active', className: 'text-emerald-400 bg-emerald-500/10' };
    case 'expired':
      return { label: 'Expired', className: 'text-amber-400 bg-amber-500/10' };
    case 'paused':
      return { label: 'Paused', className: 'text-blue-400 bg-blue-500/10' };
    case 'exhausted':
      return { label: 'Exhausted', className: 'text-red-400 bg-red-500/10' };
    default:
      return { label: status, className: 'text-zinc-400 bg-zinc-500/10' };
  }
}

function getTypeLabel(type: string) {
  switch (type) {
    case 'percentage': return '% Off';
    case 'fixed': return '$ Off';
    case 'bogo': return 'BOGO';
    case 'free_item': return 'Free Item';
    default: return type;
  }
}

function getApplicableLabel(applicable: string) {
  switch (applicable) {
    case 'dine_in': return 'Dine-In';
    case 'delivery': return 'Delivery';
    case 'takeout': return 'Takeout';
    case 'all': return 'All Channels';
    default: return applicable;
  }
}

function formatPromoValue(type: string, value: number) {
  if (type === 'percentage') return `${value}%`;
  if (type === 'fixed') return formatCurrency(value);
  if (type === 'bogo') return 'Buy 1 Get 1';
  return 'Free Item';
}

function generateRandomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const initialPromos: PromoCode[] = [
  {
    id: 'p1',
    code: 'SUMMER20',
    type: 'percentage',
    value: 20,
    min_order: 25,
    max_uses: 500,
    current_uses: 187,
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    applicable_to: 'all',
    created_at: new Date().toISOString(),
  },
  {
    id: 'p2',
    code: 'FREESHIP',
    type: 'fixed',
    value: 5,
    min_order: 30,
    max_uses: 1000,
    current_uses: 412,
    start_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    applicable_to: 'delivery',
    created_at: new Date().toISOString(),
  },
  {
    id: 'p3',
    code: 'LUNCHBOGO',
    type: 'bogo',
    value: 0,
    min_order: 15,
    max_uses: 200,
    current_uses: 200,
    start_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'exhausted',
    applicable_to: 'dine_in',
    created_at: new Date().toISOString(),
  },
];

// -- Page -------------------------------------------------------------------

export default function PromosPage() {
  const { items: promos, add, update, remove } = useCrudApi<PromoCode>('/api/promos');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<string>('percentage');
  const [formValue, setFormValue] = useState('');
  const [formMinOrder, setFormMinOrder] = useState('');
  const [formMaxUses, setFormMaxUses] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formApplicable, setFormApplicable] = useState<string>('all');

  function resetForm() {
    setFormCode('');
    setFormType('percentage');
    setFormValue('');
    setFormMinOrder('');
    setFormMaxUses('');
    setFormStartDate('');
    setFormEndDate('');
    setFormApplicable('all');
    setEditingId(null);
  }

  function openCreate() {
    resetForm();
    setShowModal(true);
  }

  function openEdit(p: PromoCode) {
    setEditingId(p.id);
    setFormCode(p.code);
    setFormType(p.type);
    setFormValue(String(p.value));
    setFormMinOrder(String(p.min_order));
    setFormMaxUses(String(p.max_uses));
    setFormStartDate(p.start_date ? p.start_date.slice(0, 10) : '');
    setFormEndDate(p.end_date ? p.end_date.slice(0, 10) : '');
    setFormApplicable(p.applicable_to);
    setShowModal(true);
  }

  function handleSave() {
    if (!formCode.trim()) {
      toast.error('Please provide a promo code');
      return;
    }

    const data = {
      code: formCode.toUpperCase(),
      type: formType as PromoCode['type'],
      value: Number(formValue) || 0,
      min_order: Number(formMinOrder) || 0,
      max_uses: Number(formMaxUses) || 100,
      start_date: formStartDate ? new Date(formStartDate).toISOString() : new Date().toISOString(),
      end_date: formEndDate ? new Date(formEndDate).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString(),
      applicable_to: formApplicable as PromoCode['applicable_to'],
    };

    if (editingId) {
      update(editingId, data);
      toast.success('Promo updated');
    } else {
      add({ ...data });
      toast.success('Promo code created');
    }

    setShowModal(false);
    resetForm();
  }

  function handleToggleStatus(id: string, currentStatus: PromoCode['status']) {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    update(id, { status: newStatus });
    toast.success(newStatus === 'paused' ? 'Promo paused' : 'Promo resumed');
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this promo code? This action cannot be undone.')) return;
    remove(id);
    toast.success('Promo code deleted');
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).then(
      () => toast.success('Code copied to clipboard'),
      () => toast.error('Failed to copy code')
    );
  }

  // Filtered promos
  const filteredPromos = useMemo(() => {
    let items = promos;
    if (statusFilter !== 'all') items = items.filter((p) => p.status === statusFilter);
    if (typeFilter !== 'all') items = items.filter((p) => p.type === typeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toUpperCase();
      items = items.filter((p) => p.code.includes(q));
    }
    return items;
  }, [promos, statusFilter, typeFilter, searchQuery]);

  // Derived stats
  const stats = useMemo(() => {
    const active = promos.filter((p) => p.status === 'active').length;
    const totalRedemptions = promos.reduce((sum, p) => sum + p.current_uses, 0);
    const totalDiscount = promos.reduce((sum, p) => {
      if (p.type === 'fixed') return sum + p.value * p.current_uses;
      if (p.type === 'percentage') return sum + (p.min_order || 30) * (p.value / 100) * p.current_uses;
      return sum + 10 * p.current_uses;
    }, 0);
    const totalMax = promos.reduce((sum, p) => sum + p.max_uses, 0);
    const avgRate = totalMax > 0 ? Math.round((totalRedemptions / totalMax) * 100) : 0;
    return {
      active_promos: active,
      total_redemptions: totalRedemptions,
      total_discount_given: totalDiscount,
      avg_redemption_rate: avgRate,
    };
  }, [promos]);

  return (
    <div className="space-y-8">
      {/* -- Header -------------------------------------------------------- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Ticket className="text-seat-red" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Promo Codes</h1>
            <p className="text-sm text-zinc-500">Create and manage promotional codes for your restaurant</p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} className="mr-1.5" />
          Create Promo
        </Button>
      </div>

      {/* -- Metric Cards -------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Active Promos" value={stats.active_promos} icon={<Ticket size={18} />} />
        <MetricCard title="Total Redemptions" value={stats.total_redemptions.toLocaleString()} icon={<Percent size={18} />} />
        <MetricCard title="Discount Given" value={formatCurrency(stats.total_discount_given)} icon={<DollarSign size={18} />} />
        <MetricCard title="Avg Redemption Rate" value={`${stats.avg_redemption_rate}%`} icon={<Ticket size={18} />} />
      </div>

      {/* -- Search & Filters ---------------------------------------------- */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder="Search by code..."
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-seat-card border border-seat-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-seat-red min-w-[140px]"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="paused">Paused</option>
          <option value="exhausted">Exhausted</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-seat-card border border-seat-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-seat-red min-w-[140px]"
        >
          <option value="all">All Types</option>
          <option value="percentage">% Off</option>
          <option value="fixed">$ Off</option>
          <option value="bogo">BOGO</option>
          <option value="free_item">Free Item</option>
        </select>
      </div>

      {/* -- Promo Cards --------------------------------------------------- */}
      {filteredPromos.length === 0 ? (
        <div className="bg-seat-card border border-seat-border rounded-xl px-5 py-12 text-center">
          <Ticket className="mx-auto text-zinc-600 mb-3" size={40} />
          <p className="text-zinc-400 font-medium">No promo codes found</p>
          <p className="text-zinc-600 text-sm mt-1">
            {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first promo code to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPromos.map((promo) => {
            const statusConfig = getStatusConfig(promo.status);
            const usagePct = promo.max_uses > 0
              ? Math.round((promo.current_uses / promo.max_uses) * 100)
              : 0;

            return (
              <div
                key={promo.id}
                className="bg-seat-card border border-seat-border rounded-xl p-5 hover:border-zinc-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white font-mono tracking-wider">{promo.code}</span>
                    <button onClick={() => copyCode(promo.code)} className="text-zinc-500 hover:text-white transition-colors" title="Copy code">
                      <Copy size={14} />
                    </button>
                  </div>
                  <span className={cn('inline-flex items-center text-[11px] px-2 py-0.5 rounded-full font-medium', statusConfig.className)}>
                    {statusConfig.label}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <span className="inline-flex items-center gap-1 text-xs text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                    {promo.type === 'percentage' ? <Percent size={10} /> : <DollarSign size={10} />}
                    {getTypeLabel(promo.type)}
                  </span>
                  <span className="text-sm font-semibold text-white">{formatPromoValue(promo.type, promo.value)}</span>
                  <span className="text-xs text-zinc-600">|</span>
                  <span className="text-xs text-zinc-500">{getApplicableLabel(promo.applicable_to)}</span>
                </div>

                {promo.min_order > 0 && (
                  <p className="text-xs text-zinc-500 mb-3">Min. order: {formatCurrency(promo.min_order)}</p>
                )}

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-500">Usage</span>
                    <span className="text-xs text-zinc-400">
                      {promo.current_uses.toLocaleString()} / {promo.max_uses.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', usagePct >= 100 ? 'bg-red-500' : usagePct >= 75 ? 'bg-amber-500' : 'bg-seat-red')}
                      style={{ width: `${Math.min(usagePct, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{usagePct}% redeemed</p>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-500 mb-4">
                  <span>{new Date(promo.start_date).toLocaleDateString()}</span>
                  <span className="text-zinc-700">-</span>
                  <span>{new Date(promo.end_date).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-zinc-800">
                  {(promo.status === 'active' || promo.status === 'paused') && (
                    <button
                      onClick={() => handleToggleStatus(promo.id, promo.status)}
                      className={cn(
                        'flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md transition-colors',
                        promo.status === 'active' ? 'text-blue-400 hover:bg-blue-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'
                      )}
                    >
                      {promo.status === 'active' ? <Pause size={12} /> : <Play size={12} />}
                      {promo.status === 'active' ? 'Pause' : 'Resume'}
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(promo)}
                    className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-md hover:bg-zinc-800 transition-colors"
                  >
                    <Pencil size={12} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(promo.id)}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-red-400 px-2.5 py-1.5 rounded-md hover:bg-red-500/10 transition-colors ml-auto"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* -- Create/Edit Modal --------------------------------------------- */}
      <EditModal
        open={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingId ? 'Edit Promo Code' : 'Create Promo Code'}
        maxWidth="lg"
        footer={
          <>
            <GhostButton onClick={() => { setShowModal(false); resetForm(); }}>Cancel</GhostButton>
            <PrimaryButton onClick={handleSave}>{editingId ? 'Save Changes' : 'Create Promo'}</PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Promo Code</FieldLabel>
            <div className="flex gap-2">
              <div className="flex-1">
                <TextInput value={formCode} onChange={(v) => setFormCode(v.toUpperCase())} placeholder="e.g., SUMMER20" />
              </div>
              <button
                type="button"
                onClick={() => setFormCode(generateRandomCode())}
                className="px-3 py-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg"
              >
                Auto
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Type</FieldLabel>
              <Select
                value={formType}
                onChange={setFormType}
                options={[
                  { label: 'Percentage Off', value: 'percentage' },
                  { label: 'Fixed Amount Off', value: 'fixed' },
                  { label: 'Buy One Get One', value: 'bogo' },
                  { label: 'Free Item', value: 'free_item' },
                ]}
              />
            </div>
            <div>
              <FieldLabel>
                {formType === 'percentage' ? 'Percentage' : formType === 'fixed' ? 'Amount ($)' : 'Value'}
              </FieldLabel>
              <TextInput
                type="number"
                value={formValue}
                onChange={setFormValue}
                placeholder={formType === 'percentage' ? 'e.g., 20' : 'e.g., 10'}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Min Order ($)</FieldLabel>
              <TextInput type="number" value={formMinOrder} onChange={setFormMinOrder} placeholder="e.g., 25" />
            </div>
            <div>
              <FieldLabel>Max Uses</FieldLabel>
              <TextInput type="number" value={formMaxUses} onChange={setFormMaxUses} placeholder="e.g., 500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Start Date</FieldLabel>
              <TextInput type="date" value={formStartDate} onChange={setFormStartDate} />
            </div>
            <div>
              <FieldLabel>End Date</FieldLabel>
              <TextInput type="date" value={formEndDate} onChange={setFormEndDate} />
            </div>
          </div>

          <div>
            <FieldLabel>Applicable To</FieldLabel>
            <Select
              value={formApplicable}
              onChange={setFormApplicable}
              options={[
                { label: 'All Channels', value: 'all' },
                { label: 'Dine-In Only', value: 'dine_in' },
                { label: 'Delivery Only', value: 'delivery' },
                { label: 'Takeout Only', value: 'takeout' },
              ]}
            />
          </div>
        </div>
      </EditModal>
    </div>
  );
}
