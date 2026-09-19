'use client';

import { useMemo, useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { cn } from '@/lib/utils';
import {
  Award, AlertTriangle, CheckCircle2, Clock, Plus, Pencil, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal, FieldLabel, TextInput, Select, PrimaryButton, GhostButton, DangerButton,
} from '@/components/dashboard/edit-modal';

interface Certification {
  id: string;
  employee: string;
  cert: string;
  issued: string; // YYYY-MM-DD
  expires: string; // YYYY-MM-DD
  required: boolean;
}

const STATUS_CONFIG = {
  valid: { color: 'bg-green-500/10 text-green-400', label: 'Valid' },
  expiring: { color: 'bg-amber-500/10 text-amber-400', label: 'Expiring Soon' },
  expired: { color: 'bg-red-500/10 text-red-400', label: 'Expired' },
};

function statusOf(exp: string): keyof typeof STATUS_CONFIG {
  const now = new Date();
  const e = new Date(exp);
  if (e < now) return 'expired';
  const days = (e.getTime() - now.getTime()) / 86400000;
  if (days <= 60) return 'expiring';
  return 'valid';
}

const INITIAL: Certification[] = [
  { id: 'c1', employee: 'Chef Mike', cert: 'ServSafe Manager', issued: '2025-01-15', expires: '2030-01-15', required: true },
  { id: 'c2', employee: 'Chef Mike', cert: 'Food Handler', issued: '2025-03-10', expires: '2028-03-10', required: true },
  { id: 'c3', employee: 'Maria S.', cert: 'TIPS Alcohol', issued: '2025-06-01', expires: '2028-06-01', required: true },
  { id: 'c4', employee: 'Jake T.', cert: 'TIPS Alcohol', issued: '2023-05-20', expires: '2026-05-20', required: true },
  { id: 'c5', employee: 'Carlos D.', cert: 'Food Handler', issued: '2025-08-10', expires: '2028-08-10', required: true },
  { id: 'c6', employee: 'Tom W.', cert: 'TIPS Alcohol', issued: '2023-02-01', expires: '2026-02-01', required: true },
  { id: 'c7', employee: 'Tom W.', cert: 'Mixology Level 2', issued: '2024-11-10', expires: '2027-11-10', required: false },
  { id: 'c8', employee: 'Ana P.', cert: 'Food Handler', issued: '2023-06-05', expires: '2026-06-05', required: true },
];

const CERT_TYPES = ['ServSafe Manager', 'Food Handler', 'TIPS Alcohol', 'CPR/First Aid', 'Mixology Level 2'];

function emptyCert(): Certification {
  return {
    id: '',
    employee: '',
    cert: 'Food Handler',
    issued: new Date().toISOString().split('T')[0],
    expires: new Date(Date.now() + 365 * 86400000 * 3).toISOString().split('T')[0],
    required: true,
  };
}

export default function CertificationsPage() {
  const { items: certs, add, update, remove } = useCrudList<Certification>(
    'seatsignals_staff_certifications',
    INITIAL,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Certification | null>(null);
  const [form, setForm] = useState<Certification>(emptyCert());

  const enriched = useMemo(() => certs.map((c) => ({ ...c, status: statusOf(c.expires) })), [certs]);

  const validCount = enriched.filter((c) => c.status === 'valid').length;
  const expiringCount = enriched.filter((c) => c.status === 'expiring').length;
  const expiredCount = enriched.filter((c) => c.status === 'expired').length;
  const complianceRate = certs.length ? Math.round((validCount / certs.length) * 100) : 0;

  const openAdd = () => { setEditing(null); setForm(emptyCert()); setModalOpen(true); };
  const openEdit = (c: Certification) => { setEditing(c); setForm(c); setModalOpen(true); };
  const save = () => {
    if (!form.employee.trim() || !form.cert.trim()) { toast.error('Employee and cert are required'); return; }
    if (editing) { update(editing.id, form); toast.success('Certification updated'); }
    else { add({ ...form, id: Date.now().toString() }); toast.success('Certification added'); }
    setModalOpen(false);
  };
  const del = (c: Certification) => {
    if (!confirm(`Delete ${c.cert} for ${c.employee}?`)) return;
    remove(c.id);
    toast.success('Certification removed');
  };

  const renew = (c: Certification) => {
    const newExpiry = new Date(Date.now() + 365 * 86400000 * 3).toISOString().split('T')[0];
    update(c.id, { issued: new Date().toISOString().split('T')[0], expires: newExpiry });
    toast.success(`${c.cert} renewed`);
  };

  const sorted = [...enriched].sort((a, b) => {
    const order = { expired: 0, expiring: 1, valid: 2 };
    return order[a.status] - order[b.status];
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Award className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Certifications</h1>
            <p className="text-sm text-zinc-500">Track staff licenses, certifications, and compliance</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 transition">
          <Plus size={16} /> Add Certification
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Compliance Rate" value={`${complianceRate}%`} icon={<CheckCircle2 size={18} />} />
        <MetricCard title="Valid" value={validCount} icon={<Award size={18} />} />
        <MetricCard title="Expiring Soon" value={expiringCount} icon={<Clock size={18} />} />
        <MetricCard title="Expired" value={expiredCount} icon={<AlertTriangle size={18} />} />
      </div>

      {(expiredCount > 0 || expiringCount > 0) && (
        <div className="space-y-2">
          {enriched.filter((c) => c.status === 'expired').map((c) => (
            <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border bg-red-500/5 border-red-500/20">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-400" />
                <p className="text-sm text-zinc-300"><strong className="text-white">{c.employee}</strong> — {c.cert} expired {c.expires}</p>
              </div>
              <button onClick={() => renew(c)} className="text-xs px-3 py-1 bg-red-500/20 text-red-400 rounded-lg font-medium hover:bg-red-500/30 transition">Renew</button>
            </div>
          ))}
          {enriched.filter((c) => c.status === 'expiring').map((c) => (
            <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border bg-amber-500/5 border-amber-500/20">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-amber-400" />
                <p className="text-sm text-zinc-300"><strong className="text-white">{c.employee}</strong> — {c.cert} expires {c.expires}</p>
              </div>
              <button onClick={() => renew(c)} className="text-xs px-3 py-1 bg-amber-500/20 text-amber-400 rounded-lg font-medium hover:bg-amber-500/30 transition">Renew</button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">All Certifications</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-zinc-500 uppercase border-b border-seat-border">
              <th className="text-left py-2 px-3">Employee</th>
              <th className="text-left py-2 px-3">Certification</th>
              <th className="text-left py-2 px-3">Issued</th>
              <th className="text-left py-2 px-3">Expires</th>
              <th className="text-center py-2 px-3">Required</th>
              <th className="text-center py-2 px-3">Status</th>
              <th className="text-right py-2 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr key={c.id} className="border-b border-seat-border/30">
                <td className="py-2.5 px-3 text-white font-medium">{c.employee}</td>
                <td className="py-2.5 px-3 text-zinc-300">{c.cert}</td>
                <td className="py-2.5 px-3 text-zinc-400">{c.issued}</td>
                <td className={cn('py-2.5 px-3', c.status === 'expired' ? 'text-red-400' : c.status === 'expiring' ? 'text-amber-400' : 'text-zinc-400')}>
                  {c.expires}
                </td>
                <td className="py-2.5 px-3 text-center">
                  {c.required ? <span className="text-green-400">✓</span> : <span className="text-zinc-600">—</span>}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', STATUS_CONFIG[c.status].color)}>
                    {STATUS_CONFIG[c.status].label}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <button onClick={() => openEdit(c)} className="p-1 text-zinc-400 hover:text-white"><Pencil size={12} /></button>
                  <button onClick={() => del(c)} className="p-1 text-zinc-500 hover:text-red-400 ml-1"><Trash2 size={12} /></button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-zinc-500">No certifications recorded</td></tr>}
          </tbody>
        </table>
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Certification' : 'Add Certification'}
        maxWidth="lg"
        footer={
          <>
            <GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton>
            {editing && <DangerButton onClick={() => { del(editing); setModalOpen(false); }}>Delete</DangerButton>}
            <PrimaryButton onClick={save}>{editing ? 'Save' : 'Add'}</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Employee</FieldLabel>
            <TextInput value={form.employee} onChange={(v) => setForm({ ...form, employee: v })} />
          </div>
          <div>
            <FieldLabel>Certification</FieldLabel>
            <Select value={form.cert} onChange={(v) => setForm({ ...form, cert: v })} options={CERT_TYPES.map((c) => ({ label: c, value: c }))} />
          </div>
          <div>
            <FieldLabel>Issued</FieldLabel>
            <TextInput value={form.issued} onChange={(v) => setForm({ ...form, issued: v })} type="date" />
          </div>
          <div>
            <FieldLabel>Expires</FieldLabel>
            <TextInput value={form.expires} onChange={(v) => setForm({ ...form, expires: v })} type="date" />
          </div>
          <div className="md:col-span-2 flex items-end">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={form.required} onChange={(e) => setForm({ ...form, required: e.target.checked })} className="rounded border-zinc-600 bg-zinc-800 text-seat-red" />
              Required
            </label>
          </div>
        </div>
      </EditModal>
    </div>
  );
}
