'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal, FieldLabel, TextInput, Select, PrimaryButton, GhostButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { ShoppingBag, DollarSign, Clock, CheckCircle2, X, Plus } from 'lucide-react';

type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'picked_up' | 'cancelled';
type Channel = 'direct' | 'doordash' | 'ubereats' | 'grubhub' | 'toast';

interface Order {
  id: string;
  customer: string;
  channel: Channel;
  total: number;
  items: number;
  status: OrderStatus;
  placedAt: string;
  pickupAt: string;
}

const INITIAL: Order[] = [
  { id: '#A2014', customer: 'Alicia M.', channel: 'direct', total: 48.50, items: 3, status: 'preparing', placedAt: '7:18 PM', pickupAt: '7:45 PM' },
  { id: '#A2015', customer: 'Jordan K.', channel: 'doordash', total: 67.20, items: 4, status: 'pending', placedAt: '7:24 PM', pickupAt: '7:50 PM' },
  { id: '#A2016', customer: 'Sara T.', channel: 'ubereats', total: 32.40, items: 2, status: 'accepted', placedAt: '7:26 PM', pickupAt: '7:52 PM' },
  { id: '#A2017', customer: 'Dev P.', channel: 'direct', total: 112.00, items: 6, status: 'ready', placedAt: '7:08 PM', pickupAt: '7:38 PM' },
  { id: '#A2018', customer: 'Maria L.', channel: 'grubhub', total: 58.75, items: 3, status: 'picked_up', placedAt: '6:52 PM', pickupAt: '7:22 PM' },
  { id: '#A2019', customer: 'Kevin W.', channel: 'toast', total: 24.95, items: 1, status: 'pending', placedAt: '7:29 PM', pickupAt: '7:55 PM' },
];

const channelLabel = (c: Channel) => ({
  direct: 'Direct', doordash: 'DoorDash', ubereats: 'Uber Eats', grubhub: 'Grubhub', toast: 'Toast',
}[c]);

const channelColor = (c: Channel) => ({
  direct: 'bg-seat-red/10 text-seat-red',
  doordash: 'bg-red-500/10 text-red-400',
  ubereats: 'bg-green-500/10 text-green-400',
  grubhub: 'bg-orange-500/10 text-orange-400',
  toast: 'bg-zinc-500/10 text-zinc-400',
}[c]);

const statusBadge = (s: OrderStatus) => ({
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  accepted: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  preparing: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  ready: 'bg-green-500/10 text-green-400 border-green-500/30',
  picked_up: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/30',
}[s]);

function empty(): Omit<Order, 'id'> {
  return {
    customer: '', channel: 'direct', total: 0, items: 1, status: 'pending',
    placedAt: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    pickupAt: '',
  };
}

export default function OnlineOrderingPage() {
  const { items: orders, add, update, remove } = useCrudList<Order>('seatsignals_online_orders', INITIAL);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty());
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');

  const active = orders.filter(o => o.status !== 'picked_up' && o.status !== 'cancelled');
  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const pending = orders.filter(o => o.status === 'pending').length;

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  const openAdd = () => { setForm(empty()); setModalOpen(true); };
  const save = () => {
    if (!form.customer.trim()) { toast.error('Customer name required'); return; }
    add({ id: `#A${2020 + orders.length}`, ...form });
    toast.success('Order added');
    setModalOpen(false);
  };
  const advance = (o: Order) => {
    const map: Record<OrderStatus, OrderStatus> = {
      pending: 'accepted', accepted: 'preparing', preparing: 'ready',
      ready: 'picked_up', picked_up: 'picked_up', cancelled: 'cancelled',
    };
    update(o.id, { status: map[o.status] });
    toast.success(`Order ${o.id} → ${map[o.status].replace('_', ' ')}`);
  };
  const cancel = (o: Order) => {
    if (!confirm(`Cancel order ${o.id}?`)) return;
    update(o.id, { status: 'cancelled' });
    toast.success('Cancelled');
  };
  const del = (o: Order) => {
    if (!confirm(`Delete order ${o.id}?`)) return;
    remove(o.id); toast.success('Deleted');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Online Orders</h1>
            <p className="text-sm text-zinc-500">Unified inbox across all ordering channels</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg text-sm font-medium">
          <Plus size={16} /> Manual Order
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Active Orders" value={active.length} icon={<ShoppingBag size={18} />} />
        <MetricCard title="Pending Accept" value={pending} icon={<Clock size={18} />} />
        <MetricCard title="Today's Revenue" value={`$${revenue.toFixed(2)}`} icon={<DollarSign size={18} />} />
        <MetricCard title="Fulfilled" value={orders.filter(o => o.status === 'picked_up').length} icon={<CheckCircle2 size={18} />} />
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'pending', 'accepted', 'preparing', 'ready', 'picked_up'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
              filter === s ? 'bg-seat-red text-white' : 'bg-seat-card border border-seat-border text-zinc-400 hover:text-white'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-zinc-500 uppercase border-b border-seat-border">
              <th className="text-left py-2 px-3">Order</th>
              <th className="text-left py-2 px-3">Customer</th>
              <th className="text-center py-2 px-3">Channel</th>
              <th className="text-center py-2 px-3">Items</th>
              <th className="text-right py-2 px-3">Total</th>
              <th className="text-center py-2 px-3">Pickup</th>
              <th className="text-center py-2 px-3">Status</th>
              <th className="text-right py-2 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} className="border-b border-seat-border/30 hover:bg-seat-black/50">
                <td className="py-2.5 px-3 text-white font-mono text-xs">{o.id}</td>
                <td className="py-2.5 px-3 text-white">{o.customer}</td>
                <td className="py-2.5 px-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${channelColor(o.channel)}`}>{channelLabel(o.channel)}</span>
                </td>
                <td className="py-2.5 px-3 text-center text-zinc-300">{o.items}</td>
                <td className="py-2.5 px-3 text-right text-white font-medium">${o.total.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-center text-xs text-zinc-400">{o.pickupAt}</td>
                <td className="py-2.5 px-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${statusBadge(o.status)}`}>{o.status.replace('_', ' ')}</span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {o.status !== 'picked_up' && o.status !== 'cancelled' && (
                      <button onClick={() => advance(o)} className="px-2 py-1 bg-seat-red/10 text-seat-red hover:bg-seat-red/20 rounded text-[10px]">Advance</button>
                    )}
                    {o.status !== 'cancelled' && o.status !== 'picked_up' && (
                      <button onClick={() => cancel(o)} className="p-1 text-zinc-500 hover:text-red-400"><X size={12} /></button>
                    )}
                    <button onClick={() => del(o)} className="p-1 text-zinc-500 hover:text-red-400 text-[10px]">del</button>
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
        title="Add Manual Order"
        footer={<><GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton><PrimaryButton onClick={save}>Add</PrimaryButton></>}
      >
        <div className="space-y-4">
          <div><FieldLabel>Customer Name</FieldLabel><TextInput value={form.customer} onChange={(v) => setForm(f => ({ ...f, customer: v }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Channel</FieldLabel>
              <Select value={form.channel} onChange={(v) => setForm(f => ({ ...f, channel: v as Channel }))} options={[
                { label: 'Direct', value: 'direct' }, { label: 'DoorDash', value: 'doordash' },
                { label: 'Uber Eats', value: 'ubereats' }, { label: 'Grubhub', value: 'grubhub' }, { label: 'Toast', value: 'toast' },
              ]} />
            </div>
            <div><FieldLabel>Items</FieldLabel><TextInput type="number" value={form.items} onChange={(v) => setForm(f => ({ ...f, items: parseInt(v) || 1 }))} /></div>
            <div><FieldLabel>Total</FieldLabel><TextInput type="number" value={form.total} onChange={(v) => setForm(f => ({ ...f, total: parseFloat(v) || 0 }))} /></div>
            <div><FieldLabel>Pickup Time</FieldLabel><TextInput value={form.pickupAt} onChange={(v) => setForm(f => ({ ...f, pickupAt: v }))} placeholder="7:30 PM" /></div>
          </div>
        </div>
      </EditModal>
    </div>
  );
}
