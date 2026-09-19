'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal, FieldLabel, TextInput, Select, PrimaryButton, GhostButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { CreditCard, Plus, Pencil, Trash2, DollarSign, AlertTriangle } from 'lucide-react';

type RuleType = 'party_size' | 'day_of_week' | 'special_event';

interface Rule {
  id: string;
  name: string;
  type: RuleType;
  trigger: string;
  amount: number;
  chargeAt: 'booking' | 'hours_before' | 'no_show';
  refundable: boolean;
  enabled: boolean;
}

const INITIAL: Rule[] = [
  { id: 'r1', name: 'Large party deposit', type: 'party_size', trigger: 'Parties of 8+', amount: 25, chargeAt: 'booking', refundable: true, enabled: true },
  { id: 'r2', name: 'Friday/Saturday premium', type: 'day_of_week', trigger: 'Fri–Sat 7–9pm', amount: 20, chargeAt: 'booking', refundable: true, enabled: true },
  { id: 'r3', name: 'Tasting menu commitment', type: 'special_event', trigger: 'Tasting Menu bookings', amount: 50, chargeAt: 'booking', refundable: false, enabled: true },
  { id: 'r4', name: 'No-show fee', type: 'party_size', trigger: 'All parties', amount: 25, chargeAt: 'no_show', refundable: false, enabled: true },
];

function empty(): Omit<Rule, 'id'> {
  return { name: '', type: 'party_size', trigger: '', amount: 20, chargeAt: 'booking', refundable: true, enabled: true };
}

const typeLabel = (t: RuleType) => ({ party_size: 'Party Size', day_of_week: 'Day', special_event: 'Event' }[t]);

export default function DepositsPage() {
  const { items: rules, add, update, remove } = useCrudList<Rule>('seatsignals_deposit_rules', INITIAL);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty());

  const openAdd = () => { setEditingId(null); setForm(empty()); setModalOpen(true); };
  const openEdit = (r: Rule) => { setEditingId(r.id); const { id: _id, ...rest } = r; void _id; setForm(rest); setModalOpen(true); };
  const save = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (editingId) { update(editingId, form); toast.success('Rule updated'); }
    else { add({ id: `r${Date.now()}`, ...form }); toast.success('Rule added'); }
    setModalOpen(false);
  };
  const toggle = (r: Rule) => { update(r.id, { enabled: !r.enabled }); toast.success(r.enabled ? 'Paused' : 'Active'); };
  const del = (r: Rule) => {
    if (!confirm(`Delete "${r.name}"?`)) return;
    remove(r.id); toast.success('Deleted');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Deposits</h1>
            <p className="text-sm text-zinc-500">Hold cards, charge no-show fees, commit guests</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg text-sm font-medium">
          <Plus size={16} /> New Rule
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Active Rules" value={rules.filter(r => r.enabled).length} subtitle={`${rules.length} total`} icon={<CreditCard size={18} />} />
        <MetricCard title="Deposits Collected (30d)" value="$2,840" icon={<DollarSign size={18} />} />
        <MetricCard title="No-Show Charges" value="$625" icon={<AlertTriangle size={18} />} />
        <MetricCard title="Avg Deposit" value="$22" />
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Deposit Rules</h3>
        <div className="space-y-2">
          {rules.map(r => (
            <div key={r.id} className="flex items-center gap-3 p-4 bg-seat-black border border-seat-border/50 rounded-lg">
              <button
                onClick={() => toggle(r)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${r.enabled ? 'bg-seat-red' : 'bg-seat-border'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${r.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-medium">{r.name}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-seat-red/10 text-seat-red">{typeLabel(r.type)}</span>
                  {!r.refundable && <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400">non-refundable</span>}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {r.trigger} · <span className="text-white">${r.amount}</span> · charged {r.chargeAt.replace('_', ' ')}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(r)} className="p-1.5 text-zinc-500 hover:text-white rounded"><Pencil size={14} /></button>
                <button onClick={() => del(r)} className="p-1.5 text-zinc-500 hover:text-red-400 rounded"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Rule' : 'New Deposit Rule'}
        footer={<><GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton><PrimaryButton onClick={save}>{editingId ? 'Save' : 'Create'}</PrimaryButton></>}
      >
        <div className="space-y-4">
          <div><FieldLabel>Name</FieldLabel><TextInput value={form.name} onChange={(v) => setForm(f => ({ ...f, name: v }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Type</FieldLabel>
              <Select value={form.type} onChange={(v) => setForm(f => ({ ...f, type: v as RuleType }))} options={[
                { label: 'Party Size', value: 'party_size' }, { label: 'Day of Week', value: 'day_of_week' }, { label: 'Special Event', value: 'special_event' },
              ]} />
            </div>
            <div><FieldLabel>Amount ($)</FieldLabel><TextInput type="number" value={form.amount} onChange={(v) => setForm(f => ({ ...f, amount: parseFloat(v) || 0 }))} /></div>
          </div>
          <div><FieldLabel>Trigger (when)</FieldLabel><TextInput value={form.trigger} onChange={(v) => setForm(f => ({ ...f, trigger: v }))} placeholder="Parties of 8+, Fri-Sat 7-9pm..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Charge At</FieldLabel>
              <Select value={form.chargeAt} onChange={(v) => setForm(f => ({ ...f, chargeAt: v as Rule['chargeAt'] }))} options={[
                { label: 'Booking', value: 'booking' }, { label: 'X Hours Before', value: 'hours_before' }, { label: 'On No-Show', value: 'no_show' },
              ]} />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setForm(f => ({ ...f, refundable: !f.refundable }))}
                className={`w-full px-3 py-2 rounded-lg text-sm border ${form.refundable ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}
              >
                {form.refundable ? 'Refundable' : 'Non-refundable'}
              </button>
            </div>
          </div>
        </div>
      </EditModal>
    </div>
  );
}
