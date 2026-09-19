'use client';

import { useState, useEffect } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal, FieldLabel, TextInput, Select, PrimaryButton, GhostButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { ChefHat, Clock, Timer, CheckCircle2, Flame, Plus, Trash2 } from 'lucide-react';

type Station = 'grill' | 'saute' | 'fry' | 'cold' | 'pastry';
type Status = 'fired' | 'cooking' | 'ready' | 'served';

interface TicketItem {
  name: string;
  modifiers: string;
  station: Station;
}

interface Ticket {
  id: string;
  tableNumber: number;
  server: string;
  firedAt: number;
  items: TicketItem[];
  status: Status;
  priority: 'normal' | 'rush' | 'vip';
}

const now = () => Date.now();

const INITIAL: Ticket[] = [
  {
    id: 'k1', tableNumber: 12, server: 'Marco', firedAt: now() - 240000, priority: 'rush',
    items: [
      { name: 'Pan-Seared Sea Bass', modifiers: 'MR, no capers', station: 'saute' },
      { name: 'Caesar Salad', modifiers: 'add anchovies', station: 'cold' },
      { name: 'Ribeye 16oz', modifiers: 'MR, on-the-side sauce', station: 'grill' },
    ],
    status: 'cooking',
  },
  {
    id: 'k2', tableNumber: 7, server: 'Emma', firedAt: now() - 120000, priority: 'normal',
    items: [
      { name: 'Truffle Pasta', modifiers: '', station: 'saute' },
      { name: 'Burrata Starter', modifiers: '', station: 'cold' },
    ],
    status: 'cooking',
  },
  {
    id: 'k3', tableNumber: 4, server: 'Sarah', firedAt: now() - 60000, priority: 'vip',
    items: [
      { name: "Chef's Tasting", modifiers: 'no shellfish', station: 'saute' },
      { name: 'Foie Gras Terrine', modifiers: '', station: 'cold' },
    ],
    status: 'fired',
  },
  {
    id: 'k4', tableNumber: 9, server: 'Marco', firedAt: now() - 480000, priority: 'normal',
    items: [
      { name: 'French Fries', modifiers: '', station: 'fry' },
      { name: 'Burger', modifiers: 'medium, no onion', station: 'grill' },
    ],
    status: 'ready',
  },
];

function emptyTicket(): Omit<Ticket, 'id' | 'firedAt'> {
  return { tableNumber: 1, server: '', items: [{ name: '', modifiers: '', station: 'saute' }], status: 'fired', priority: 'normal' };
}

const statusColor = (s: Status) => ({
  fired: 'border-seat-red bg-seat-red/5',
  cooking: 'border-amber-500/50 bg-amber-500/5',
  ready: 'border-green-500/50 bg-green-500/5',
  served: 'border-zinc-700 bg-zinc-900/50',
}[s]);

const stationLabel = (s: Station) => ({
  grill: '🔥 Grill', saute: '🍳 Sauté', fry: '🍟 Fry', cold: '🥗 Cold', pastry: '🍰 Pastry',
}[s]);

const elapsed = (firedAt: number) => {
  const secs = Math.floor((Date.now() - firedAt) / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function KitchenPage() {
  const { items: tickets, add, update, remove } = useCrudList<Ticket>('seatsignals_kitchen_tickets', INITIAL);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyTicket());
  const [, tick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => tick(n => n + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const active = tickets.filter(t => t.status !== 'served');
  const avgTime = active.length ? Math.round(active.reduce((s, t) => s + (Date.now() - t.firedAt) / 1000, 0) / active.length) : 0;
  const rush = tickets.filter(t => t.priority === 'rush' && t.status !== 'served').length;

  const openAdd = () => { setForm(emptyTicket()); setModalOpen(true); };
  const save = () => {
    if (!form.items[0].name.trim()) { toast.error('Add at least one item'); return; }
    add({ id: `k${Date.now()}`, firedAt: Date.now(), ...form });
    toast.success('Ticket fired to kitchen');
    setModalOpen(false);
  };
  const setStatus = (t: Ticket, s: Status) => {
    update(t.id, { status: s });
    toast.success(`Table ${t.tableNumber} → ${s}`);
  };
  const del = (t: Ticket) => {
    if (!confirm('Remove ticket?')) return;
    remove(t.id); toast.success('Removed');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Kitchen Display</h1>
            <p className="text-sm text-zinc-500">Live tickets with station routing and speed tracking</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg text-sm font-medium">
          <Plus size={16} /> Fire Ticket
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Active Tickets" value={active.length} icon={<ChefHat size={18} />} />
        <MetricCard title="Rush / VIP" value={rush} icon={<Flame size={18} />} />
        <MetricCard title="Avg Ticket Time" value={`${Math.floor(avgTime / 60)}:${(avgTime % 60).toString().padStart(2, '0')}`} icon={<Timer size={18} />} />
        <MetricCard title="Ready" value={tickets.filter(t => t.status === 'ready').length} icon={<CheckCircle2 size={18} />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {active.map(t => (
          <div key={t.id} className={`border-2 rounded-xl p-4 ${statusColor(t.status)}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white">Table {t.tableNumber}</span>
                  {t.priority === 'rush' && <span className="px-1.5 py-0.5 rounded bg-seat-red text-white text-[9px] font-bold">RUSH</span>}
                  {t.priority === 'vip' && <span className="px-1.5 py-0.5 rounded bg-amber-500 text-black text-[9px] font-bold">VIP</span>}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">{t.server}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs">
                  <Clock size={11} className="text-zinc-500" />
                  <span className="text-white font-mono">{elapsed(t.firedAt)}</span>
                </div>
                <button onClick={() => del(t)} className="text-zinc-600 hover:text-red-400"><Trash2 size={12} /></button>
              </div>
            </div>
            <div className="space-y-2 mb-3">
              {t.items.map((item, i) => (
                <div key={i} className="text-xs">
                  <div className="text-white font-medium">{item.name}</div>
                  <div className="text-zinc-500 flex items-center gap-2">
                    <span>{stationLabel(item.station)}</span>
                    {item.modifiers && <span className="italic">· {item.modifiers}</span>}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-1.5 pt-2 border-t border-seat-border/50">
              {t.status === 'fired' && <button onClick={() => setStatus(t, 'cooking')} className="flex-1 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded text-xs font-medium">Start</button>}
              {t.status === 'cooking' && <button onClick={() => setStatus(t, 'ready')} className="flex-1 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded text-xs font-medium">Ready</button>}
              {t.status === 'ready' && <button onClick={() => setStatus(t, 'served')} className="flex-1 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-xs font-medium">Served</button>}
            </div>
          </div>
        ))}
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Fire New Ticket"
        maxWidth="lg"
        footer={<><GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton><PrimaryButton onClick={save}>Fire</PrimaryButton></>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div><FieldLabel>Table</FieldLabel><TextInput type="number" value={form.tableNumber} onChange={(v) => setForm(f => ({ ...f, tableNumber: parseInt(v) || 1 }))} /></div>
            <div><FieldLabel>Server</FieldLabel><TextInput value={form.server} onChange={(v) => setForm(f => ({ ...f, server: v }))} /></div>
            <div>
              <FieldLabel>Priority</FieldLabel>
              <Select value={form.priority} onChange={(v) => setForm(f => ({ ...f, priority: v as Ticket['priority'] }))} options={[
                { label: 'Normal', value: 'normal' }, { label: 'Rush', value: 'rush' }, { label: 'VIP', value: 'vip' },
              ]} />
            </div>
          </div>
          <div>
            <FieldLabel>Items</FieldLabel>
            <div className="space-y-2">
              {form.items.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_120px_auto] gap-2">
                  <TextInput value={item.name} onChange={(v) => setForm(f => ({ ...f, items: f.items.map((x, j) => j === i ? { ...x, name: v } : x) }))} placeholder="Item name" />
                  <TextInput value={item.modifiers} onChange={(v) => setForm(f => ({ ...f, items: f.items.map((x, j) => j === i ? { ...x, modifiers: v } : x) }))} placeholder="Modifiers" />
                  <Select
                    value={item.station}
                    onChange={(v) => setForm(f => ({ ...f, items: f.items.map((x, j) => j === i ? { ...x, station: v as Station } : x) }))}
                    options={[
                      { label: 'Grill', value: 'grill' }, { label: 'Sauté', value: 'saute' }, { label: 'Fry', value: 'fry' },
                      { label: 'Cold', value: 'cold' }, { label: 'Pastry', value: 'pastry' },
                    ]}
                  />
                  {form.items.length > 1 && (
                    <button onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) }))} className="p-2 text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setForm(f => ({ ...f, items: [...f.items, { name: '', modifiers: '', station: 'saute' }] }))}
                className="text-xs text-seat-red hover:underline"
              >
                + Add item
              </button>
            </div>
          </div>
        </div>
      </EditModal>
    </div>
  );
}
