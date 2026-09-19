'use client';

import { useState, useMemo } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import {
  Send,
  Mail,
  MessageSquare,
  CheckCircle,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal,
  FieldLabel,
  TextInput,
  TextArea,
  Select,
  PrimaryButton,
  GhostButton,
} from '@/components/dashboard/edit-modal';

interface OutreachContact {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  channel: 'email' | 'sms' | 'both';
  stage: 'prospect' | 'contacted' | 'engaged' | 'converted' | 'lost';
  notes: string;
  created_at: string;
  last_touched: string;
}

const STAGES: { value: OutreachContact['stage']; label: string; color: string }[] = [
  { value: 'prospect', label: 'Prospect', color: 'bg-zinc-500/10 text-zinc-400' },
  { value: 'contacted', label: 'Contacted', color: 'bg-blue-500/10 text-blue-400' },
  { value: 'engaged', label: 'Engaged', color: 'bg-amber-500/10 text-amber-400' },
  { value: 'converted', label: 'Converted', color: 'bg-emerald-500/10 text-emerald-400' },
  { value: 'lost', label: 'Lost', color: 'bg-red-500/10 text-red-400' },
];

const initialContacts: OutreachContact[] = [
  {
    id: 'o1',
    name: 'Marcus Chen',
    company: 'Chen Catering Co.',
    email: 'marcus@chencatering.com',
    phone: '+1 415 555 0123',
    channel: 'email',
    stage: 'engaged',
    notes: 'Interested in catering partnership. Follow up next week.',
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    last_touched: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'o2',
    name: 'Priya Shah',
    company: 'Corporate HR',
    email: 'priya.shah@techco.com',
    phone: '+1 212 555 0198',
    channel: 'both',
    stage: 'contacted',
    notes: 'Asked about private event capacity (50+ guests).',
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    last_touched: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'o3',
    name: 'Diego Alvarez',
    company: 'Food Blogger',
    email: 'diego@foodreview.net',
    phone: '',
    channel: 'email',
    stage: 'converted',
    notes: 'Reviewed us. Offering ongoing comp for quarterly features.',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    last_touched: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'o4',
    name: 'Rachel Kim',
    company: 'Local Press',
    email: 'r.kim@localpress.com',
    phone: '+1 310 555 0100',
    channel: 'email',
    stage: 'prospect',
    notes: 'Intro via networking event. Send pitch deck.',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    last_touched: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

export default function OutreachPage() {
  const { items: contacts, add, update, remove } = useCrudList<OutreachContact>(
    'seatsignals_outreach',
    initialContacts
  );

  const [filter, setFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [channel, setChannel] = useState<OutreachContact['channel']>('email');
  const [stage, setStage] = useState<OutreachContact['stage']>('prospect');
  const [notes, setNotes] = useState('');

  function resetForm() {
    setName('');
    setCompany('');
    setEmail('');
    setPhone('');
    setChannel('email');
    setStage('prospect');
    setNotes('');
    setEditingId(null);
  }

  function openCreate() {
    resetForm();
    setShowModal(true);
  }

  function openEdit(c: OutreachContact) {
    setEditingId(c.id);
    setName(c.name);
    setCompany(c.company);
    setEmail(c.email);
    setPhone(c.phone);
    setChannel(c.channel);
    setStage(c.stage);
    setNotes(c.notes);
    setShowModal(true);
  }

  function handleSave() {
    if (!name.trim()) {
      toast.error('Contact name is required');
      return;
    }
    if (editingId) {
      update(editingId, {
        name,
        company,
        email,
        phone,
        channel,
        stage,
        notes,
        last_touched: new Date().toISOString(),
      });
      toast.success('Contact updated');
    } else {
      add({
        id: `oc_${Date.now()}`,
        name,
        company,
        email,
        phone,
        channel,
        stage,
        notes,
        created_at: new Date().toISOString(),
        last_touched: new Date().toISOString(),
      });
      toast.success('Contact added');
    }
    setShowModal(false);
    resetForm();
  }

  function handleStageChange(id: string, newStage: OutreachContact['stage']) {
    update(id, { stage: newStage, last_touched: new Date().toISOString() });
    toast.success('Stage updated');
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this contact?')) return;
    remove(id);
    toast.success('Contact deleted');
  }

  const filtered = useMemo(() => {
    return filter === 'all' ? contacts : contacts.filter((c) => c.stage === filter);
  }, [contacts, filter]);

  const stats = useMemo(() => {
    return {
      total: contacts.length,
      engaged: contacts.filter((c) => c.stage === 'engaged' || c.stage === 'contacted').length,
      converted: contacts.filter((c) => c.stage === 'converted').length,
      lost: contacts.filter((c) => c.stage === 'lost').length,
    };
  }, [contacts]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Send className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Outreach Pipeline</h1>
            <p className="text-sm text-zinc-500">Track prospects, partners, and press</p>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 transition-colors">
          <Plus size={16} /> Add Contact
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total Contacts" value={stats.total} icon={<Send size={18} />} />
        <MetricCard title="In Progress" value={stats.engaged} icon={<Mail size={18} />} />
        <MetricCard title="Converted" value={stats.converted} icon={<CheckCircle size={18} />} />
        <MetricCard title="Lost" value={stats.lost} icon={<MessageSquare size={18} />} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={cn('px-3 py-1.5 rounded-full text-xs font-medium border', filter === 'all' ? 'bg-white text-black border-white' : 'bg-zinc-800 text-zinc-400 border-zinc-700')}
        >
          All ({contacts.length})
        </button>
        {STAGES.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium border', filter === s.value ? 'bg-white text-black border-white' : 'bg-zinc-800 text-zinc-400 border-zinc-700')}
          >
            {s.label} ({contacts.filter((c) => c.stage === s.value).length})
          </button>
        ))}
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-seat-border">
              <th className="text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Name</th>
              <th className="text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Company</th>
              <th className="text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Channel</th>
              <th className="text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Stage</th>
              <th className="text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Last Touched</th>
              <th className="text-right text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const stageCfg = STAGES.find((s) => s.value === c.stage)!;
              return (
                <tr key={c.id} className="border-b border-seat-border/50 hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-white font-medium">{c.name}</p>
                      <p className="text-xs text-zinc-500">{c.email || c.phone}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{c.company || '--'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {c.channel === 'sms' ? (
                        <MessageSquare size={12} className="text-zinc-400" />
                      ) : (
                        <Mail size={12} className="text-zinc-400" />
                      )}
                      <span className="text-xs text-zinc-400 capitalize">{c.channel}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={c.stage}
                      onChange={(e) => handleStageChange(c.id, e.target.value as OutreachContact['stage'])}
                      className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium border-0 outline-none cursor-pointer', stageCfg.color)}
                    >
                      {STAGES.map((s) => (
                        <option key={s.value} value={s.value} className="bg-seat-card text-white">{s.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{new Date(c.last_touched).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded text-zinc-500 hover:text-white hover:bg-zinc-800">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Send size={32} className="mx-auto text-zinc-700 mb-2" />
            <p className="text-sm text-zinc-500">No contacts in this stage</p>
          </div>
        )}
      </div>

      <EditModal
        open={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingId ? 'Edit Contact' : 'Add Contact'}
        maxWidth="lg"
        footer={
          <>
            <GhostButton onClick={() => { setShowModal(false); resetForm(); }}>Cancel</GhostButton>
            <PrimaryButton onClick={handleSave}>{editingId ? 'Save Changes' : 'Add Contact'}</PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Name</FieldLabel>
              <TextInput value={name} onChange={setName} placeholder="e.g., Marcus Chen" />
            </div>
            <div>
              <FieldLabel>Company</FieldLabel>
              <TextInput value={company} onChange={setCompany} placeholder="Company or publication" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Email</FieldLabel>
              <TextInput value={email} onChange={setEmail} placeholder="name@example.com" />
            </div>
            <div>
              <FieldLabel>Phone</FieldLabel>
              <TextInput value={phone} onChange={setPhone} placeholder="+1 555 555 0000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Preferred Channel</FieldLabel>
              <Select
                value={channel}
                onChange={(v) => setChannel(v as OutreachContact['channel'])}
                options={[
                  { label: 'Email', value: 'email' },
                  { label: 'SMS', value: 'sms' },
                  { label: 'Both', value: 'both' },
                ]}
              />
            </div>
            <div>
              <FieldLabel>Stage</FieldLabel>
              <Select
                value={stage}
                onChange={(v) => setStage(v as OutreachContact['stage'])}
                options={STAGES.map((s) => ({ label: s.label, value: s.value }))}
              />
            </div>
          </div>
          <div>
            <FieldLabel>Notes</FieldLabel>
            <TextArea value={notes} onChange={setNotes} placeholder="Context, next steps, etc." rows={3} />
          </div>
        </div>
      </EditModal>
    </div>
  );
}
