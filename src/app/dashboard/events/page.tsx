'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { useCrudApi } from '@/hooks/use-crud-api';
import {
  EditModal, FieldLabel, TextInput, TextArea, Select, PrimaryButton, GhostButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { PartyPopper, Plus, Pencil, Trash2, Calendar, DollarSign, Users, MapPin } from 'lucide-react';

type EventStatus = 'draft' | 'confirmed' | 'completed' | 'cancelled';
type EventType = 'private' | 'wine_dinner' | 'tasting' | 'holiday' | 'live_music' | 'other';

interface Event {
  id: string;
  name: string;
  type: EventType;
  date: string;
  time: string;
  guests: number;
  pricePerPerson: number;
  section: string;
  status: EventStatus;
  description: string;
  contact: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const INITIAL: Event[] = [
  { id: 'e1', name: "Anniversary Wine Dinner", type: 'wine_dinner', date: '2026-04-18', time: '7:00 PM', guests: 60, pricePerPerson: 150, section: 'Private Room', status: 'confirmed', description: '5-course wine pairing with sommelier', contact: 'Linda Chen' },
  { id: 'e2', name: "Mother's Day Brunch", type: 'holiday', date: '2026-05-10', time: '10:00 AM', guests: 140, pricePerPerson: 75, section: 'Whole Restaurant', status: 'confirmed', description: 'Live harp music, rose champagne toast', contact: '' },
  { id: 'e3', name: 'Tech Summit Reception', type: 'private', date: '2026-04-22', time: '6:00 PM', guests: 80, pricePerPerson: 110, section: 'Patio + Bar', status: 'confirmed', description: 'Cocktail reception with passed apps', contact: 'Acme Tech' },
  { id: 'e4', name: 'Monthly Tasting Menu', type: 'tasting', date: '2026-04-25', time: '7:30 PM', guests: 30, pricePerPerson: 200, section: 'Chef\'s Counter', status: 'confirmed', description: '7-course chef tasting', contact: '' },
  { id: 'e5', name: 'Jazz Night', type: 'live_music', date: '2026-04-19', time: '8:00 PM', guests: 50, pricePerPerson: 25, section: 'Bar Lounge', status: 'draft', description: 'Trio plays 8-11pm', contact: '' },
];

function empty(): Omit<Event, 'id'> {
  return {
    name: '', type: 'private', date: new Date().toISOString().split('T')[0], time: '7:00 PM',
    guests: 20, pricePerPerson: 75, section: 'Main', status: 'draft', description: '', contact: '',
  };
}

const statusBadge = (s: EventStatus) => ({
  draft: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
  confirmed: 'bg-green-500/10 text-green-400 border-green-500/30',
  completed: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/30',
}[s]);

const typeLabel = (t: EventType) => ({
  private: 'Private Event',
  wine_dinner: 'Wine Dinner',
  tasting: 'Tasting Menu',
  holiday: 'Holiday',
  live_music: 'Live Music',
  other: 'Other',
}[t]);

export default function EventsPage() {
  const { items: events, add, update, remove } = useCrudApi<Event>('/api/events');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty());

  const upcoming = events.filter(e => e.status === 'confirmed' || e.status === 'draft').length;
  const totalRevenue = events.filter(e => e.status === 'confirmed').reduce((s, e) => s + e.guests * e.pricePerPerson, 0);
  const totalGuests = events.filter(e => e.status === 'confirmed').reduce((s, e) => s + e.guests, 0);
  const thisMonth = events.filter(e => e.date.startsWith('2026-04') && e.status === 'confirmed').length;

  const openAdd = () => { setEditingId(null); setForm(empty()); setModalOpen(true); };
  const openEdit = (e: Event) => { setEditingId(e.id); const { id: _id, ...rest } = e; void _id; setForm(rest); setModalOpen(true); };
  const save = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (editingId) { update(editingId, form); toast.success('Event updated'); }
    else { add({ ...form }); toast.success('Event created'); }
    setModalOpen(false);
  };
  const del = (e: Event) => {
    if (!confirm(`Delete "${e.name}"?`)) return;
    remove(e.id); toast.success('Deleted');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <PartyPopper className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Events</h1>
            <p className="text-sm text-zinc-500">Private events, wine dinners, tastings, and more</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg text-sm font-medium">
          <Plus size={16} /> New Event
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Upcoming Events" value={upcoming} icon={<Calendar size={18} />} />
        <MetricCard title="This Month" value={thisMonth} />
        <MetricCard title="Event Revenue" value={`$${(totalRevenue / 1000).toFixed(1)}K`} icon={<DollarSign size={18} />} />
        <MetricCard title="Total Guests" value={totalGuests.toLocaleString()} icon={<Users size={18} />} />
      </div>

      <div className="space-y-3">
        {events.map(e => (
          <div key={e.id} className="bg-seat-card border border-seat-border rounded-xl p-5">
            <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-white">{e.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${statusBadge(e.status)}`}>{e.status}</span>
                </div>
                <div className="text-xs text-zinc-500 mt-1">{typeLabel(e.type)}</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(e)} className="p-1.5 text-zinc-500 hover:text-white rounded"><Pencil size={14} /></button>
                <button onClick={() => del(e)} className="p-1.5 text-zinc-500 hover:text-red-400 rounded"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div><div className="text-zinc-500 flex items-center gap-1"><Calendar size={10} /> Date</div><div className="text-white mt-0.5">{e.date} · {e.time}</div></div>
              <div><div className="text-zinc-500 flex items-center gap-1"><Users size={10} /> Guests</div><div className="text-white mt-0.5">{e.guests}</div></div>
              <div><div className="text-zinc-500 flex items-center gap-1"><DollarSign size={10} /> Per Person</div><div className="text-white mt-0.5">${e.pricePerPerson}</div></div>
              <div><div className="text-zinc-500 flex items-center gap-1"><MapPin size={10} /> Section</div><div className="text-white mt-0.5">{e.section}</div></div>
            </div>
            {e.description && <div className="text-xs text-zinc-400 mt-3 pt-3 border-t border-seat-border/50">{e.description}</div>}
          </div>
        ))}
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Event' : 'New Event'}
        maxWidth="lg"
        footer={<><GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton><PrimaryButton onClick={save}>{editingId ? 'Save' : 'Create'}</PrimaryButton></>}
      >
        <div className="space-y-4">
          <div><FieldLabel>Name</FieldLabel><TextInput value={form.name} onChange={(v) => setForm(f => ({ ...f, name: v }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Type</FieldLabel>
              <Select value={form.type} onChange={(v) => setForm(f => ({ ...f, type: v as EventType }))} options={[
                { label: 'Private Event', value: 'private' },
                { label: 'Wine Dinner', value: 'wine_dinner' },
                { label: 'Tasting Menu', value: 'tasting' },
                { label: 'Holiday', value: 'holiday' },
                { label: 'Live Music', value: 'live_music' },
                { label: 'Other', value: 'other' },
              ]} />
            </div>
            <div>
              <FieldLabel>Status</FieldLabel>
              <Select value={form.status} onChange={(v) => setForm(f => ({ ...f, status: v as EventStatus }))} options={[
                { label: 'Draft', value: 'draft' },
                { label: 'Confirmed', value: 'confirmed' },
                { label: 'Completed', value: 'completed' },
                { label: 'Cancelled', value: 'cancelled' },
              ]} />
            </div>
            <div><FieldLabel>Date</FieldLabel><TextInput type="date" value={form.date} onChange={(v) => setForm(f => ({ ...f, date: v }))} /></div>
            <div><FieldLabel>Time</FieldLabel><TextInput value={form.time} onChange={(v) => setForm(f => ({ ...f, time: v }))} placeholder="7:00 PM" /></div>
            <div><FieldLabel>Guests</FieldLabel><TextInput type="number" value={form.guests} onChange={(v) => setForm(f => ({ ...f, guests: parseInt(v) || 0 }))} /></div>
            <div><FieldLabel>Price Per Person</FieldLabel><TextInput type="number" value={form.pricePerPerson} onChange={(v) => setForm(f => ({ ...f, pricePerPerson: parseFloat(v) || 0 }))} /></div>
            <div className="col-span-2"><FieldLabel>Section</FieldLabel><TextInput value={form.section} onChange={(v) => setForm(f => ({ ...f, section: v }))} /></div>
            <div className="col-span-2"><FieldLabel>Contact</FieldLabel><TextInput value={form.contact} onChange={(v) => setForm(f => ({ ...f, contact: v }))} /></div>
          </div>
          <div><FieldLabel>Description</FieldLabel><TextArea value={form.description} onChange={(v) => setForm(f => ({ ...f, description: v }))} /></div>
        </div>
      </EditModal>
    </div>
  );
}
