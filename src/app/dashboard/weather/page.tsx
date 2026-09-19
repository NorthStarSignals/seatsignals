'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal, FieldLabel, TextInput, Select, PrimaryButton, GhostButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { CloudSun, Plus, Pencil, Trash2, CloudRain, Sun, Snowflake, Thermometer } from 'lucide-react';

type Condition = 'sunny' | 'rainy' | 'cold' | 'hot' | 'snow';

interface WeatherRule {
  id: string;
  name: string;
  condition: Condition;
  trigger: string;
  action: string;
  channel: 'sms' | 'email' | 'both';
  enabled: boolean;
}

const INITIAL: WeatherRule[] = [
  { id: 'w1', name: 'Rainy Day Comfort Food', condition: 'rainy', trigger: '>0.3in rain forecast', action: '20% off soup + pasta 2-5pm', channel: 'both', enabled: true },
  { id: 'w2', name: 'Hot Day Patio Promo', condition: 'hot', trigger: '>85°F forecast', action: 'BOGO iced drinks on patio', channel: 'sms', enabled: true },
  { id: 'w3', name: 'Cold Day Warm-Up', condition: 'cold', trigger: '<40°F forecast', action: 'Free hot drink with entrée', channel: 'email', enabled: false },
  { id: 'w4', name: 'Perfect Weather Reservations Push', condition: 'sunny', trigger: '70-80°F, no rain', action: 'SMS regulars: "patio open tonight"', channel: 'sms', enabled: true },
];

const conditionIcon = (c: Condition) => ({
  sunny: <Sun size={14} />, rainy: <CloudRain size={14} />, cold: <Snowflake size={14} />,
  hot: <Thermometer size={14} />, snow: <Snowflake size={14} />,
}[c]);

const conditionColor = (c: Condition) => ({
  sunny: 'bg-amber-500/10 text-amber-400',
  rainy: 'bg-blue-500/10 text-blue-400',
  cold: 'bg-cyan-500/10 text-cyan-400',
  hot: 'bg-orange-500/10 text-orange-400',
  snow: 'bg-zinc-300/10 text-zinc-200',
}[c]);

function empty(): Omit<WeatherRule, 'id'> {
  return { name: '', condition: 'rainy', trigger: '', action: '', channel: 'sms', enabled: true };
}

export default function WeatherPage() {
  const { items: rules, add, update, remove } = useCrudList<WeatherRule>('seatsignals_weather_rules', INITIAL);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty());

  const openAdd = () => { setEditingId(null); setForm(empty()); setModalOpen(true); };
  const openEdit = (r: WeatherRule) => { setEditingId(r.id); const { id: _id, ...rest } = r; void _id; setForm(rest); setModalOpen(true); };
  const save = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (editingId) { update(editingId, form); toast.success('Rule updated'); }
    else { add({ id: `w${Date.now()}`, ...form }); toast.success('Rule created'); }
    setModalOpen(false);
  };
  const toggle = (r: WeatherRule) => {
    update(r.id, { enabled: !r.enabled });
    toast.success(r.enabled ? 'Paused' : 'Active');
  };
  const del = (r: WeatherRule) => {
    if (!confirm(`Delete "${r.name}"?`)) return;
    remove(r.id); toast.success('Deleted');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <CloudSun className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Weather Triggers</h1>
            <p className="text-sm text-zinc-500">Promotions that fire based on the forecast</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg text-sm font-medium">
          <Plus size={16} /> New Trigger
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Active Rules" value={rules.filter(r => r.enabled).length} subtitle={`${rules.length} total`} />
        <MetricCard title="Tomorrow" value="72°F" subtitle="Partly cloudy" />
        <MetricCard title="This Week" value="Rainy" subtitle="Mon & Thu" />
        <MetricCard title="Rules Matched" value="12" subtitle="last 30 days" />
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Weather Rules</h3>
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
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] ${conditionColor(r.condition)}`}>
                    {conditionIcon(r.condition)} {r.condition}
                  </span>
                  <span className="text-white font-medium">{r.name}</span>
                </div>
                <div className="text-xs text-zinc-400">
                  <span className="text-zinc-500">When:</span> {r.trigger} · <span className="text-zinc-500">Do:</span> {r.action} · {r.channel.toUpperCase()}
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
        title={editingId ? 'Edit Trigger' : 'New Weather Trigger'}
        footer={<><GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton><PrimaryButton onClick={save}>{editingId ? 'Save' : 'Create'}</PrimaryButton></>}
      >
        <div className="space-y-4">
          <div><FieldLabel>Rule Name</FieldLabel><TextInput value={form.name} onChange={(v) => setForm(f => ({ ...f, name: v }))} placeholder="Rainy Day Comfort Food" /></div>
          <div>
            <FieldLabel>Condition</FieldLabel>
            <Select value={form.condition} onChange={(v) => setForm(f => ({ ...f, condition: v as Condition }))} options={[
              { label: 'Rainy', value: 'rainy' }, { label: 'Sunny', value: 'sunny' },
              { label: 'Hot', value: 'hot' }, { label: 'Cold', value: 'cold' }, { label: 'Snow', value: 'snow' },
            ]} />
          </div>
          <div><FieldLabel>Trigger (when to fire)</FieldLabel><TextInput value={form.trigger} onChange={(v) => setForm(f => ({ ...f, trigger: v }))} placeholder=">0.3in rain forecast" /></div>
          <div><FieldLabel>Action (what happens)</FieldLabel><TextInput value={form.action} onChange={(v) => setForm(f => ({ ...f, action: v }))} placeholder="20% off soup + pasta 2-5pm" /></div>
          <div>
            <FieldLabel>Channel</FieldLabel>
            <Select value={form.channel} onChange={(v) => setForm(f => ({ ...f, channel: v as WeatherRule['channel'] }))} options={[
              { label: 'SMS', value: 'sms' }, { label: 'Email', value: 'email' }, { label: 'Both', value: 'both' },
            ]} />
          </div>
        </div>
      </EditModal>
    </div>
  );
}
