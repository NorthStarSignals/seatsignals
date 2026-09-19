'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal, FieldLabel, TextInput, Select, PrimaryButton, GhostButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { Truck, MapPin, Clock, DollarSign, Plus, Pencil, Trash2, UserCheck } from 'lucide-react';

type DeliveryStatus = 'queued' | 'assigned' | 'in_transit' | 'delivered' | 'failed';

interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  available: boolean;
  deliveries: number;
}

interface Delivery {
  id: string;
  orderRef: string;
  address: string;
  customer: string;
  total: number;
  driverId: string | null;
  status: DeliveryStatus;
  placedAt: string;
  promisedBy: string;
  distance: number;
}

const INITIAL_DRIVERS: Driver[] = [
  { id: 'dr1', name: 'Tom Rivera', phone: '(415) 555-0190', vehicle: 'Honda Civic', available: true, deliveries: 14 },
  { id: 'dr2', name: 'Maya Patel', phone: '(415) 555-0221', vehicle: 'E-Bike', available: true, deliveries: 22 },
  { id: 'dr3', name: 'Jalen Ford', phone: '(415) 555-0308', vehicle: 'Scooter', available: false, deliveries: 18 },
];

const INITIAL_DELIVERIES: Delivery[] = [
  { id: 'd1', orderRef: '#A2014', address: '240 Market St Apt 3', customer: 'Alicia M.', total: 48.50, driverId: 'dr1', status: 'in_transit', placedAt: '7:18 PM', promisedBy: '7:55 PM', distance: 1.2 },
  { id: 'd2', orderRef: '#A2015', address: '88 Folsom St', customer: 'Jordan K.', total: 67.20, driverId: 'dr2', status: 'assigned', placedAt: '7:24 PM', promisedBy: '8:00 PM', distance: 0.8 },
  { id: 'd3', orderRef: '#A2017', address: '1 Harrison St Unit 14', customer: 'Dev P.', total: 112.00, driverId: null, status: 'queued', placedAt: '7:28 PM', promisedBy: '8:10 PM', distance: 2.1 },
  { id: 'd4', orderRef: '#A2010', address: '320 Spear St', customer: 'Kim L.', total: 41.40, driverId: 'dr1', status: 'delivered', placedAt: '6:48 PM', promisedBy: '7:20 PM', distance: 1.5 },
];

function emptyDelivery(): Omit<Delivery, 'id'> {
  return {
    orderRef: '', address: '', customer: '', total: 0, driverId: null, status: 'queued',
    placedAt: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    promisedBy: '', distance: 1.0,
  };
}

function emptyDriver(): Omit<Driver, 'id'> {
  return { name: '', phone: '', vehicle: 'Car', available: true, deliveries: 0 };
}

const statusBadge = (s: DeliveryStatus) => ({
  queued: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
  assigned: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  in_transit: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  delivered: 'bg-green-500/10 text-green-400 border-green-500/30',
  failed: 'bg-red-500/10 text-red-400 border-red-500/30',
}[s]);

export default function DeliveryPage() {
  const { items: drivers, add: addDriver, update: updateDriver, remove: removeDriver } = useCrudList<Driver>('seatsignals_delivery_drivers', INITIAL_DRIVERS);
  const { items: deliveries, add: addDel, update: updateDel, remove: removeDel } = useCrudList<Delivery>('seatsignals_delivery', INITIAL_DELIVERIES);

  const [delModalOpen, setDelModalOpen] = useState(false);
  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [delForm, setDelForm] = useState(emptyDelivery());
  const [driverForm, setDriverForm] = useState(emptyDriver());
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);

  const active = deliveries.filter(d => d.status !== 'delivered' && d.status !== 'failed');
  const avgDistance = deliveries.length ? deliveries.reduce((s, d) => s + d.distance, 0) / deliveries.length : 0;
  const revenue = deliveries.reduce((s, d) => s + d.total, 0);

  const openAddDel = () => { setDelForm(emptyDelivery()); setDelModalOpen(true); };
  const saveDel = () => {
    if (!delForm.customer.trim()) { toast.error('Customer required'); return; }
    addDel({ id: `d${Date.now()}`, ...delForm });
    toast.success('Delivery queued');
    setDelModalOpen(false);
  };
  const assign = (del: Delivery, driverId: string) => {
    updateDel(del.id, { driverId, status: 'assigned' });
    toast.success('Driver assigned');
  };
  const advance = (del: Delivery) => {
    const next: DeliveryStatus = del.status === 'queued' ? 'assigned' : del.status === 'assigned' ? 'in_transit' : 'delivered';
    updateDel(del.id, { status: next });
    toast.success(`${del.orderRef} → ${next.replace('_', ' ')}`);
  };
  const delDelivery = (d: Delivery) => {
    if (!confirm('Remove delivery?')) return;
    removeDel(d.id); toast.success('Removed');
  };

  const openAddDriver = () => { setEditingDriverId(null); setDriverForm(emptyDriver()); setDriverModalOpen(true); };
  const openEditDriver = (d: Driver) => {
    setEditingDriverId(d.id);
    setDriverForm({ name: d.name, phone: d.phone, vehicle: d.vehicle, available: d.available, deliveries: d.deliveries });
    setDriverModalOpen(true);
  };
  const saveDriver = () => {
    if (!driverForm.name.trim()) { toast.error('Name required'); return; }
    if (editingDriverId) { updateDriver(editingDriverId, driverForm); toast.success('Driver updated'); }
    else { addDriver({ id: `dr${Date.now()}`, ...driverForm }); toast.success('Driver added'); }
    setDriverModalOpen(false);
  };
  const delDriver = (d: Driver) => {
    if (!confirm(`Remove ${d.name}?`)) return;
    removeDriver(d.id); toast.success('Removed');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Truck className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Delivery</h1>
            <p className="text-sm text-zinc-500">Drivers, routes, and live delivery status</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={openAddDriver} className="flex items-center gap-2 px-3 py-2 bg-seat-card border border-seat-border hover:border-zinc-600 text-white rounded-lg text-sm font-medium">
            <UserCheck size={16} /> Add Driver
          </button>
          <button onClick={openAddDel} className="flex items-center gap-2 px-4 py-2 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg text-sm font-medium">
            <Plus size={16} /> New Delivery
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Active Deliveries" value={active.length} icon={<Truck size={18} />} />
        <MetricCard title="Drivers Online" value={drivers.filter(d => d.available).length} icon={<UserCheck size={18} />} />
        <MetricCard title="Avg Distance" value={`${avgDistance.toFixed(1)} mi`} icon={<MapPin size={18} />} />
        <MetricCard title="Today's Revenue" value={`$${revenue.toFixed(0)}`} icon={<DollarSign size={18} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-seat-card border border-seat-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Drivers</h3>
          <div className="space-y-2">
            {drivers.map(d => (
              <div key={d.id} className="p-3 bg-seat-black border border-seat-border/50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{d.name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] ${d.available ? 'bg-green-500/10 text-green-400' : 'bg-zinc-700 text-zinc-400'}`}>
                        {d.available ? 'online' : 'off'}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">{d.vehicle} · {d.phone}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">{d.deliveries} deliveries today</div>
                  </div>
                  <div className="flex gap-0.5">
                    <button onClick={() => openEditDriver(d)} className="p-1 text-zinc-500 hover:text-white"><Pencil size={12} /></button>
                    <button onClick={() => delDriver(d)} className="p-1 text-zinc-500 hover:text-red-400"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-seat-card border border-seat-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Deliveries</h3>
          <div className="space-y-2">
            {deliveries.map(d => (
              <div key={d.id} className="p-3 bg-seat-black border border-seat-border/50 rounded-lg">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-mono text-xs">{d.orderRef}</span>
                      <span className="text-white font-medium">{d.customer}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] border ${statusBadge(d.status)}`}>{d.status.replace('_', ' ')}</span>
                    </div>
                    <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1"><MapPin size={11} /> {d.address}</div>
                    <div className="flex items-center gap-4 text-[11px] text-zinc-500 mt-1">
                      <span><Clock size={10} className="inline mr-1" /> Placed {d.placedAt} · Due {d.promisedBy}</span>
                      <span>{d.distance} mi</span>
                      <span>${d.total.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.status === 'queued' && drivers.filter(dr => dr.available).length > 0 && (
                      <select
                        defaultValue=""
                        onChange={(e) => e.target.value && assign(d, e.target.value)}
                        className="bg-seat-black border border-seat-border rounded px-2 py-1 text-xs text-white"
                      >
                        <option value="">Assign driver</option>
                        {drivers.filter(dr => dr.available).map(dr => <option key={dr.id} value={dr.id}>{dr.name}</option>)}
                      </select>
                    )}
                    {d.driverId && (
                      <span className="text-[11px] text-zinc-400">{drivers.find(dr => dr.id === d.driverId)?.name}</span>
                    )}
                    {d.status !== 'delivered' && d.status !== 'failed' && (
                      <button onClick={() => advance(d)} className="px-2 py-1 bg-seat-red/10 text-seat-red hover:bg-seat-red/20 rounded text-[11px]">Advance</button>
                    )}
                    <button onClick={() => delDelivery(d)} className="p-1 text-zinc-500 hover:text-red-400"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <EditModal
        open={delModalOpen}
        onClose={() => setDelModalOpen(false)}
        title="New Delivery"
        footer={<><GhostButton onClick={() => setDelModalOpen(false)}>Cancel</GhostButton><PrimaryButton onClick={saveDel}>Create</PrimaryButton></>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><FieldLabel>Order Ref</FieldLabel><TextInput value={delForm.orderRef} onChange={(v) => setDelForm(f => ({ ...f, orderRef: v }))} placeholder="#A2020" /></div>
            <div><FieldLabel>Customer</FieldLabel><TextInput value={delForm.customer} onChange={(v) => setDelForm(f => ({ ...f, customer: v }))} /></div>
          </div>
          <div><FieldLabel>Address</FieldLabel><TextInput value={delForm.address} onChange={(v) => setDelForm(f => ({ ...f, address: v }))} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><FieldLabel>Total</FieldLabel><TextInput type="number" value={delForm.total} onChange={(v) => setDelForm(f => ({ ...f, total: parseFloat(v) || 0 }))} /></div>
            <div><FieldLabel>Distance (mi)</FieldLabel><TextInput type="number" value={delForm.distance} onChange={(v) => setDelForm(f => ({ ...f, distance: parseFloat(v) || 0 }))} /></div>
            <div><FieldLabel>Promised By</FieldLabel><TextInput value={delForm.promisedBy} onChange={(v) => setDelForm(f => ({ ...f, promisedBy: v }))} placeholder="8:00 PM" /></div>
          </div>
        </div>
      </EditModal>

      <EditModal
        open={driverModalOpen}
        onClose={() => setDriverModalOpen(false)}
        title={editingDriverId ? 'Edit Driver' : 'Add Driver'}
        footer={<><GhostButton onClick={() => setDriverModalOpen(false)}>Cancel</GhostButton><PrimaryButton onClick={saveDriver}>{editingDriverId ? 'Save' : 'Add'}</PrimaryButton></>}
      >
        <div className="space-y-4">
          <div><FieldLabel>Name</FieldLabel><TextInput value={driverForm.name} onChange={(v) => setDriverForm(f => ({ ...f, name: v }))} /></div>
          <div><FieldLabel>Phone</FieldLabel><TextInput value={driverForm.phone} onChange={(v) => setDriverForm(f => ({ ...f, phone: v }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Vehicle</FieldLabel>
              <Select value={driverForm.vehicle} onChange={(v) => setDriverForm(f => ({ ...f, vehicle: v }))} options={[
                { label: 'Car', value: 'Car' }, { label: 'Honda Civic', value: 'Honda Civic' },
                { label: 'E-Bike', value: 'E-Bike' }, { label: 'Scooter', value: 'Scooter' }, { label: 'Van', value: 'Van' },
              ]} />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setDriverForm(f => ({ ...f, available: !f.available }))}
                className={`w-full px-3 py-2 rounded-lg text-sm border ${driverForm.available ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}
              >
                {driverForm.available ? 'Available' : 'Unavailable'}
              </button>
            </div>
          </div>
        </div>
      </EditModal>
    </div>
  );
}
