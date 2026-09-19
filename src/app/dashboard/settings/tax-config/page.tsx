'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { cn } from '@/lib/utils';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal,
  FieldLabel,
  TextInput,
  Select,
  PrimaryButton,
  GhostButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { Calculator, DollarSign, MapPin, Settings, Plus, Pencil, Trash2 } from 'lucide-react';

interface TaxRate {
  id: string;
  name: string;
  rate: number;
  type: 'sales' | 'alcohol' | 'service' | 'special';
  applies_to: string;
  active: boolean;
}

const DEFAULT_TAXES: TaxRate[] = [
  { id: 'T1', name: 'State Sales Tax', rate: 6.25, type: 'sales', applies_to: 'All items', active: true },
  { id: 'T2', name: 'City Sales Tax', rate: 1.50, type: 'sales', applies_to: 'All items', active: true },
  { id: 'T3', name: 'County Tax', rate: 0.75, type: 'sales', applies_to: 'All items', active: true },
  { id: 'T4', name: 'Alcohol Tax', rate: 2.50, type: 'alcohol', applies_to: 'Beer, Wine, Spirits', active: true },
  { id: 'T5', name: 'Service Charge', rate: 18.00, type: 'service', applies_to: 'Parties of 6+', active: true },
  { id: 'T6', name: 'Delivery Fee Tax', rate: 8.50, type: 'special', applies_to: 'Delivery orders', active: true },
  { id: 'T7', name: 'Tourism Tax', rate: 0.50, type: 'special', applies_to: 'All dine-in', active: false },
];

const TYPE_COLORS: Record<string, string> = {
  sales: 'bg-blue-500/10 text-blue-400',
  alcohol: 'bg-purple-500/10 text-purple-400',
  service: 'bg-green-500/10 text-green-400',
  special: 'bg-amber-500/10 text-amber-400',
};

const emptyForm = () => ({
  name: '',
  rate: 0,
  type: 'sales' as TaxRate['type'],
  applies_to: '',
  active: true,
});

export default function TaxConfigPage() {
  const { items: taxRates, add, update, remove } = useCrudList<TaxRate>(
    'seatsignals_settings_taxes',
    DEFAULT_TAXES
  );
  const [showInactive, setShowInactive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  const activeTaxes = taxRates.filter(t => t.active);
  const totalSalesRate = activeTaxes.filter(t => t.type === 'sales').reduce((s, t) => s + t.rate, 0);
  const filtered = showInactive ? taxRates : activeTaxes;

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (t: TaxRate) => {
    setEditingId(t.id);
    setForm({ name: t.name, rate: t.rate, type: t.type, applies_to: t.applies_to, active: t.active });
    setShowModal(true);
  };

  const saveRate = () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (editingId) {
      update(editingId, form);
      toast.success('Tax rate updated');
    } else {
      add({ id: `T-${Date.now()}`, ...form });
      toast.success('Tax rate added');
    }
    setShowModal(false);
  };

  const deleteRate = (id: string) => {
    if (!confirm('Delete this tax rate?')) return;
    remove(id);
    toast.success('Deleted');
  };

  const toggleActive = (t: TaxRate) => {
    update(t.id, { active: !t.active });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-seat-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Tax Configuration</h1>
          <p className="text-sm text-zinc-500">Manage tax rates, service charges, and special fees</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Combined Sales Tax" value={`${totalSalesRate.toFixed(2)}%`} icon={<DollarSign size={18} />} />
        <MetricCard title="Active Taxes" value={activeTaxes.length} icon={<Calculator size={18} />} />
        <MetricCard title="Jurisdiction" value="TX, USA" icon={<MapPin size={18} />} />
        <MetricCard title="Last Updated" value="Apr 1, 2026" icon={<Settings size={18} />} />
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90"
        >
          <Plus size={14} /> Add Tax Rate
        </button>
        <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={e => setShowInactive(e.target.checked)}
            className="rounded border-zinc-600"
          />
          Show inactive
        </label>
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Tax Rates</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-zinc-500 uppercase border-b border-seat-border">
              <th className="text-left py-2 px-3">Name</th>
              <th className="text-center py-2 px-3">Type</th>
              <th className="text-right py-2 px-3">Rate</th>
              <th className="text-left py-2 px-3">Applies To</th>
              <th className="text-center py-2 px-3">Status</th>
              <th className="text-center py-2 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id} className="border-b border-seat-border/30">
                <td className="py-3 px-3 text-white font-medium">{t.name}</td>
                <td className="py-3 px-3 text-center">
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium capitalize', TYPE_COLORS[t.type])}>
                    {t.type}
                  </span>
                </td>
                <td className="py-3 px-3 text-right text-white font-bold text-base">{t.rate}%</td>
                <td className="py-3 px-3 text-zinc-400">{t.applies_to}</td>
                <td className="py-3 px-3 text-center">
                  <button
                    onClick={() => toggleActive(t)}
                    className={cn('w-8 h-5 rounded-full flex items-center mx-auto px-0.5',
                      t.active ? 'bg-green-500/20 justify-end' : 'bg-zinc-700 justify-start')}
                  >
                    <div className={cn('w-4 h-4 rounded-full', t.active ? 'bg-green-400' : 'bg-zinc-500')} />
                  </button>
                </td>
                <td className="py-3 px-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => openEdit(t)}
                      className="p-1.5 text-zinc-400 hover:text-white"
                      aria-label="Edit"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => deleteRate(t.id)}
                      className="p-1.5 text-zinc-400 hover:text-red-400"
                      aria-label="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-zinc-500 text-xs">
                  No tax rates {showInactive ? '' : 'active'}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Example Check Breakdown</h3>
        <div className="max-w-md space-y-2">
          <div className="flex justify-between py-1.5">
            <span className="text-zinc-400">Subtotal (food)</span>
            <span className="text-white">$85.00</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-zinc-400">Subtotal (alcohol)</span>
            <span className="text-white">$32.00</span>
          </div>
          <div className="border-t border-seat-border my-1" />
          {activeTaxes.filter(t => t.type === 'sales').map(t => (
            <div key={t.id} className="flex justify-between py-1">
              <span className="text-zinc-500 text-sm">{t.name} ({t.rate}%)</span>
              <span className="text-zinc-300 text-sm">${((85 + 32) * t.rate / 100).toFixed(2)}</span>
            </div>
          ))}
          {activeTaxes.filter(t => t.type === 'alcohol').map(t => (
            <div key={t.id} className="flex justify-between py-1">
              <span className="text-zinc-500 text-sm">{t.name} ({t.rate}%)</span>
              <span className="text-zinc-300 text-sm">${(32 * t.rate / 100).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      <EditModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit Tax Rate' : 'Add Tax Rate'}
        footer={
          <>
            <GhostButton onClick={() => setShowModal(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={saveRate}>{editingId ? 'Save Changes' : 'Add'}</PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Name</FieldLabel>
            <TextInput value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Hotel Occupancy Tax" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Rate (%)</FieldLabel>
              <TextInput
                type="number"
                value={form.rate}
                onChange={v => setForm(f => ({ ...f, rate: parseFloat(v) || 0 }))}
              />
            </div>
            <div>
              <FieldLabel>Type</FieldLabel>
              <Select
                value={form.type}
                onChange={v => setForm(f => ({ ...f, type: v as TaxRate['type'] }))}
                options={[
                  { label: 'Sales', value: 'sales' },
                  { label: 'Alcohol', value: 'alcohol' },
                  { label: 'Service', value: 'service' },
                  { label: 'Special', value: 'special' },
                ]}
              />
            </div>
          </div>
          <div>
            <FieldLabel>Applies To</FieldLabel>
            <TextInput value={form.applies_to} onChange={v => setForm(f => ({ ...f, applies_to: v }))} placeholder="e.g. All items" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
              className="w-4 h-4 rounded border-zinc-600 bg-seat-black"
            />
            <span className="text-sm text-white">Active</span>
          </label>
        </div>
      </EditModal>
    </div>
  );
}
