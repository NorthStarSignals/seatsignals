'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal, FieldLabel, TextInput, TextArea, Select, PrimaryButton, GhostButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { Building2, Plus, Pencil, Trash2, DollarSign, Users, Calendar } from 'lucide-react';

type Status = 'prospect' | 'active' | 'dormant';

interface Account {
  id: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  employees: number;
  monthlySpend: number;
  status: Status;
  nextTouch: string;
  notes: string;
}

const INITIAL: Account[] = [
  { id: 'c1', company: 'Acme Tech', contact: 'Jordan Lee', email: 'jordan@acmetech.com', phone: '(415) 555-0120', employees: 240, monthlySpend: 12400, status: 'active', nextTouch: '2026-04-22', notes: 'Lunch orders M-W, quarterly dinners' },
  { id: 'c2', company: 'Bayside Marketing', contact: 'Casey Chen', email: 'casey@bayside.co', phone: '(415) 555-0191', employees: 68, monthlySpend: 4200, status: 'active', nextTouch: '2026-04-18', notes: '' },
  { id: 'c3', company: 'Northwest Legal LLP', contact: 'Pat Rivera', email: 'pat@nwlegal.com', phone: '(415) 555-0223', employees: 95, monthlySpend: 6800, status: 'active', nextTouch: '2026-04-29', notes: 'Friday team lunches' },
  { id: 'c4', company: 'Ridgeline Capital', contact: 'Morgan Park', email: 'morgan@ridgeline.vc', phone: '(415) 555-0345', employees: 24, monthlySpend: 0, status: 'prospect', nextTouch: '2026-04-16', notes: 'Pitched private dining, waiting for CFO approval' },
  { id: 'c5', company: 'Helix Biotech', contact: 'Riley Thompson', email: 'riley@helixbio.io', phone: '(415) 555-0402', employees: 180, monthlySpend: 0, status: 'prospect', nextTouch: '2026-04-20', notes: 'Summer kickoff event interest' },
  { id: 'c6', company: 'Crescent Partners', contact: 'Alex Morrison', email: 'alex@crescent.co', phone: '(415) 555-0510', employees: 45, monthlySpend: 0, status: 'dormant', nextTouch: '2026-05-01', notes: 'Last order Jan 2026' },
];

const statusBadge = (s: Status) => ({
  prospect: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  active: 'bg-green-500/10 text-green-400 border-green-500/30',
  dormant: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
}[s]);

function empty(): Omit<Account, 'id'> {
  return {
    company: '', contact: '', email: '', phone: '', employees: 0, monthlySpend: 0,
    status: 'prospect', nextTouch: new Date().toISOString().split('T')[0], notes: '',
  };
}

export default function CorporatePage() {
  const { items: accounts, add, update, remove } = useCrudList<Account>('seatsignals_corporate', INITIAL);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty());

  const totalMonthly = accounts.filter(a => a.status === 'active').reduce((s, a) => s + a.monthlySpend, 0);
  const prospects = accounts.filter(a => a.status === 'prospect').length;
  const active = accounts.filter(a => a.status === 'active').length;

  const openAdd = () => { setEditingId(null); setForm(empty()); setModalOpen(true); };
  const openEdit = (a: Account) => { setEditingId(a.id); const { id: _id, ...rest } = a; void _id; setForm(rest); setModalOpen(true); };
  const save = () => {
    if (!form.company.trim()) { toast.error('Company name required'); return; }
    if (editingId) { update(editingId, form); toast.success('Account updated'); }
    else { add({ id: `c${Date.now()}`, ...form }); toast.success('Account added'); }
    setModalOpen(false);
  };
  const del = (a: Account) => {
    if (!confirm(`Delete ${a.company}?`)) return;
    remove(a.id); toast.success('Deleted');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Corporate Accounts</h1>
            <p className="text-sm text-zinc-500">Recurring B2B relationships for lunches, dinners, and events</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg text-sm font-medium">
          <Plus size={16} /> New Account
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Active Accounts" value={active} icon={<Building2 size={18} />} />
        <MetricCard title="Prospects" value={prospects} icon={<Users size={18} />} />
        <MetricCard title="Monthly Recurring" value={`$${(totalMonthly / 1000).toFixed(1)}K`} icon={<DollarSign size={18} />} />
        <MetricCard title="Total Accounts" value={accounts.length} />
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-zinc-500 uppercase border-b border-seat-border">
              <th className="text-left py-3 px-3">Company</th>
              <th className="text-left py-3 px-3">Contact</th>
              <th className="text-right py-3 px-3">Employees</th>
              <th className="text-right py-3 px-3">Monthly</th>
              <th className="text-center py-3 px-3">Status</th>
              <th className="text-center py-3 px-3">Next Touch</th>
              <th className="text-right py-3 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map(a => (
              <tr key={a.id} className="border-b border-seat-border/30 hover:bg-seat-black/50">
                <td className="py-3 px-3">
                  <div className="text-white font-medium">{a.company}</div>
                  {a.notes && <div className="text-[10px] text-zinc-500 mt-0.5 max-w-xs truncate">{a.notes}</div>}
                </td>
                <td className="py-3 px-3">
                  <div className="text-white">{a.contact}</div>
                  <div className="text-[10px] text-zinc-500">{a.email}</div>
                </td>
                <td className="py-3 px-3 text-right text-zinc-300">{a.employees}</td>
                <td className="py-3 px-3 text-right text-white">${a.monthlySpend.toLocaleString()}</td>
                <td className="py-3 px-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] border ${statusBadge(a.status)}`}>{a.status}</span>
                </td>
                <td className="py-3 px-3 text-center text-xs text-zinc-400"><Calendar size={11} className="inline mr-1" />{a.nextTouch}</td>
                <td className="py-3 px-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(a)} className="p-1.5 text-zinc-500 hover:text-white rounded"><Pencil size={13} /></button>
                    <button onClick={() => del(a)} className="p-1.5 text-zinc-500 hover:text-red-400 rounded"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Account' : 'New Corporate Account'}
        maxWidth="lg"
        footer={<><GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton><PrimaryButton onClick={save}>{editingId ? 'Save' : 'Add'}</PrimaryButton></>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><FieldLabel>Company</FieldLabel><TextInput value={form.company} onChange={(v) => setForm(f => ({ ...f, company: v }))} /></div>
            <div>
              <FieldLabel>Status</FieldLabel>
              <Select value={form.status} onChange={(v) => setForm(f => ({ ...f, status: v as Status }))} options={[
                { label: 'Prospect', value: 'prospect' }, { label: 'Active', value: 'active' }, { label: 'Dormant', value: 'dormant' },
              ]} />
            </div>
            <div><FieldLabel>Contact Name</FieldLabel><TextInput value={form.contact} onChange={(v) => setForm(f => ({ ...f, contact: v }))} /></div>
            <div><FieldLabel>Email</FieldLabel><TextInput value={form.email} onChange={(v) => setForm(f => ({ ...f, email: v }))} /></div>
            <div><FieldLabel>Phone</FieldLabel><TextInput value={form.phone} onChange={(v) => setForm(f => ({ ...f, phone: v }))} /></div>
            <div><FieldLabel>Employees</FieldLabel><TextInput type="number" value={form.employees} onChange={(v) => setForm(f => ({ ...f, employees: parseInt(v) || 0 }))} /></div>
            <div><FieldLabel>Monthly Spend</FieldLabel><TextInput type="number" value={form.monthlySpend} onChange={(v) => setForm(f => ({ ...f, monthlySpend: parseFloat(v) || 0 }))} /></div>
            <div><FieldLabel>Next Touch</FieldLabel><TextInput type="date" value={form.nextTouch} onChange={(v) => setForm(f => ({ ...f, nextTouch: v }))} /></div>
          </div>
          <div><FieldLabel>Notes</FieldLabel><TextArea value={form.notes} onChange={(v) => setForm(f => ({ ...f, notes: v }))} /></div>
        </div>
      </EditModal>
    </div>
  );
}
