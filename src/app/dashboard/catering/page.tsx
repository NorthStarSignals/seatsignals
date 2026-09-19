'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { formatCurrency, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  Building2,
  Plus,
  Trash2,
  Pencil,
  CheckCircle,
} from 'lucide-react';
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

interface Lead {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  company_size: number;
  distance_miles: number;
  status: 'discovered' | 'contacted' | 'replied' | 'meeting' | 'order_placed' | 'recurring';
  order_value: number;
}

const INITIAL: Lead[] = [
  { id: 'l1', company_name: 'Deloitte - Dallas', contact_name: 'Alex Park', contact_email: 'alex@deloitte.com', company_size: 450, distance_miles: 1.2, status: 'recurring', order_value: 4800 },
  { id: 'l2', company_name: 'TechStart Ventures', contact_name: 'Jordan Wu', contact_email: 'jordan@techstart.vc', company_size: 45, distance_miles: 0.8, status: 'meeting', order_value: 2500 },
  { id: 'l3', company_name: 'Highland Park ISD', contact_name: 'Morgan Lee', contact_email: 'mlee@hpisd.org', company_size: 200, distance_miles: 2.1, status: 'replied', order_value: 0 },
  { id: 'l4', company_name: 'Oak Cliff Brewery', contact_name: 'Sam Rivera', contact_email: 'sam@ocb.com', company_size: 25, distance_miles: 3.4, status: 'contacted', order_value: 0 },
  { id: 'l5', company_name: 'Smith & Associates', contact_name: 'Taylor King', contact_email: 'tking@smith.law', company_size: 80, distance_miles: 1.5, status: 'discovered', order_value: 0 },
];

const STATUS_OPTIONS: Lead['status'][] = ['discovered', 'contacted', 'replied', 'meeting', 'order_placed', 'recurring'];

const STATUS_COLORS: Record<string, string> = {
  discovered: 'bg-zinc-500/10 text-zinc-400',
  contacted: 'bg-blue-500/10 text-blue-400',
  replied: 'bg-purple-500/10 text-purple-400',
  meeting: 'bg-red-500/10 text-red-400',
  order_placed: 'bg-emerald-500/10 text-emerald-400',
  recurring: 'bg-red-500/10 text-red-500',
};

type Draft = {
  id?: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  company_size: string;
  distance_miles: string;
  status: Lead['status'];
  order_value: string;
};

const emptyDraft = (): Draft => ({
  company_name: '', contact_name: '', contact_email: '',
  company_size: '0', distance_miles: '0', status: 'discovered', order_value: '0',
});

export default function CateringPage() {
  const { items: leads, add, update, remove } = useCrudList<Lead>('seatsignals_catering_leads', INITIAL);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Lead | null>(null);

  const openNew = () => setEditing(emptyDraft());
  const openEdit = (l: Lead) => setEditing({
    id: l.id,
    company_name: l.company_name,
    contact_name: l.contact_name,
    contact_email: l.contact_email,
    company_size: String(l.company_size),
    distance_miles: String(l.distance_miles),
    status: l.status,
    order_value: String(l.order_value),
  });

  const save = () => {
    if (!editing?.company_name.trim()) { toast.error('Company name required'); return; }
    const data = {
      company_name: editing.company_name.trim(),
      contact_name: editing.contact_name.trim(),
      contact_email: editing.contact_email.trim(),
      company_size: parseInt(editing.company_size) || 0,
      distance_miles: parseFloat(editing.distance_miles) || 0,
      status: editing.status,
      order_value: parseFloat(editing.order_value) || 0,
    };
    if (editing.id) {
      update(editing.id, data);
      toast.success('Lead updated');
    } else {
      add({ id: `l-${Date.now()}`, ...data });
      toast.success('Lead added');
    }
    setEditing(null);
  };

  const advance = (l: Lead) => {
    const idx = STATUS_OPTIONS.indexOf(l.status);
    const next = STATUS_OPTIONS[Math.min(idx + 1, STATUS_OPTIONS.length - 1)];
    update(l.id, { status: next });
    toast.success(`Status → ${next.replace('_', ' ')}`);
  };

  const doDelete = () => {
    if (!confirmDelete) return;
    remove(confirmDelete.id);
    toast.success('Lead removed');
    setConfirmDelete(null);
  };

  const stats = {
    total: leads.length,
    contacted: leads.filter(l => l.status !== 'discovered').length,
    converted: leads.filter(l => l.status === 'order_placed' || l.status === 'recurring').length,
    pipeline_value: leads.filter(l => l.status === 'meeting' || l.status === 'replied').reduce((s, l) => s + l.order_value, 0),
    total_revenue: leads.filter(l => l.status === 'order_placed' || l.status === 'recurring').reduce((s, l) => s + l.order_value, 0),
  };
  const conversionRate = stats.total > 0 ? Math.round((stats.converted / stats.total) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Catering Pipeline</h1>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90">
          <Plus size={14} /> Add Lead
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <MetricCard title="Total Leads" value={stats.total} />
        <MetricCard title="Contacted" value={stats.contacted} />
        <MetricCard title="Conversion Rate" value={`${conversionRate}%`} />
        <MetricCard title="Pipeline Value" value={formatCurrency(stats.pipeline_value)} />
        <MetricCard title="Catering Revenue" value={formatCurrency(stats.total_revenue)} />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {leads.length === 0 ? (
          <div className="p-12 text-center text-zinc-400">No leads yet. Click Add Lead to start.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left p-4 text-zinc-400 font-medium">Company</th>
                  <th className="text-left p-4 text-zinc-400 font-medium">Contact</th>
                  <th className="text-left p-4 text-zinc-400 font-medium">Size</th>
                  <th className="text-left p-4 text-zinc-400 font-medium">Distance</th>
                  <th className="text-left p-4 text-zinc-400 font-medium">Order Value</th>
                  <th className="text-left p-4 text-zinc-400 font-medium">Status</th>
                  <th className="text-right p-4 text-zinc-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(lead => (
                  <tr key={lead.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                    <td className="p-4">
                      <p className="text-white font-medium">{lead.company_name}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-zinc-300">{lead.contact_name}</p>
                      <p className="text-xs text-zinc-500">{lead.contact_email}</p>
                    </td>
                    <td className="p-4 text-zinc-300">{lead.company_size}</td>
                    <td className="p-4 text-zinc-300">{lead.distance_miles} mi</td>
                    <td className="p-4 text-zinc-300">{lead.order_value > 0 ? formatCurrency(lead.order_value) : '—'}</td>
                    <td className="p-4">
                      <span className={cn('px-2 py-1 rounded-full text-xs', STATUS_COLORS[lead.status])}>
                        {lead.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => advance(lead)}
                          className="text-xs px-2 py-1 bg-zinc-800 text-zinc-300 rounded hover:bg-zinc-700 flex items-center gap-1">
                          <CheckCircle size={12} /> Advance
                        </button>
                        <button onClick={() => openEdit(lead)} className="p-1.5 text-zinc-500 hover:text-white">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setConfirmDelete(lead)} className="p-1.5 text-zinc-500 hover:text-red-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EditModal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit Lead' : 'Add Lead'}
        maxWidth="lg"
        footer={
          <>
            <GhostButton onClick={() => setEditing(null)}>Cancel</GhostButton>
            <PrimaryButton onClick={save}>{editing?.id ? 'Save' : 'Add'}</PrimaryButton>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <div>
              <FieldLabel>Company Name</FieldLabel>
              <TextInput value={editing.company_name} onChange={(v) => setEditing({ ...editing, company_name: v })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Contact Name</FieldLabel>
                <TextInput value={editing.contact_name} onChange={(v) => setEditing({ ...editing, contact_name: v })} />
              </div>
              <div>
                <FieldLabel>Contact Email</FieldLabel>
                <TextInput value={editing.contact_email} onChange={(v) => setEditing({ ...editing, contact_email: v })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <FieldLabel>Company Size</FieldLabel>
                <TextInput type="number" value={editing.company_size} onChange={(v) => setEditing({ ...editing, company_size: v })} />
              </div>
              <div>
                <FieldLabel>Distance (mi)</FieldLabel>
                <TextInput type="number" value={editing.distance_miles} onChange={(v) => setEditing({ ...editing, distance_miles: v })} />
              </div>
              <div>
                <FieldLabel>Order Value ($)</FieldLabel>
                <TextInput type="number" value={editing.order_value} onChange={(v) => setEditing({ ...editing, order_value: v })} />
              </div>
            </div>
            <div>
              <FieldLabel>Status</FieldLabel>
              <Select
                value={editing.status}
                onChange={(v) => setEditing({ ...editing, status: v as Lead['status'] })}
                options={STATUS_OPTIONS.map(s => ({ label: s.replace('_', ' '), value: s }))}
              />
            </div>
          </div>
        )}
      </EditModal>

      <EditModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Lead?"
        footer={
          <>
            <GhostButton onClick={() => setConfirmDelete(null)}>Cancel</GhostButton>
            <DangerButton onClick={doDelete}>Delete</DangerButton>
          </>
        }
      >
        <p className="text-sm text-zinc-400">
          Remove {confirmDelete?.company_name}? <Building2 className="inline w-3 h-3" />
        </p>
      </EditModal>
    </div>
  );
}
