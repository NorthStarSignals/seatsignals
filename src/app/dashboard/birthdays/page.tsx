'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { useLocalStorageState, useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal, FieldLabel, TextInput, TextArea, Select, PrimaryButton, GhostButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { Cake, Calendar, Gift, Mail, MessageSquare, Pencil, Trash2, Send, Users } from 'lucide-react';

interface Offer {
  id: string;
  name: string;
  description: string;
  channel: 'email' | 'sms' | 'both';
  sendDaysBefore: number;
  active: boolean;
}

interface BirthdayGuest {
  id: string;
  name: string;
  email: string;
  birthday: string;
  lastContact: string;
  status: 'scheduled' | 'sent' | 'redeemed';
}

interface Config {
  automationEnabled: boolean;
  defaultChannel: 'email' | 'sms' | 'both';
}

const INITIAL_OFFERS: Offer[] = [
  { id: 'o1', name: 'Free Dessert', description: 'Complimentary dessert of your choice during your birthday week', channel: 'email', sendDaysBefore: 7, active: true },
  { id: 'o2', name: '20% Off Birthday Dinner', description: '20% off your entire check when celebrating your birthday', channel: 'both', sendDaysBefore: 14, active: true },
  { id: 'o3', name: 'Complimentary Champagne', description: 'Glass of bubbly on the house', channel: 'sms', sendDaysBefore: 3, active: false },
];

const INITIAL_GUESTS: BirthdayGuest[] = [
  { id: 'g1', name: 'Sarah Thompson', email: 'sarah.t@example.com', birthday: '2026-04-22', lastContact: '2026-04-15', status: 'scheduled' },
  { id: 'g2', name: 'Marcus Kim', email: 'marcus.kim@example.com', birthday: '2026-04-28', lastContact: '', status: 'scheduled' },
  { id: 'g3', name: 'Emma Rodriguez', email: 'emma.r@example.com', birthday: '2026-05-03', lastContact: '', status: 'scheduled' },
  { id: 'g4', name: 'David Chen', email: 'dchen@example.com', birthday: '2026-04-18', lastContact: '2026-04-11', status: 'sent' },
  { id: 'g5', name: 'Lisa Park', email: 'lpark@example.com', birthday: '2026-04-14', lastContact: '2026-04-07', status: 'redeemed' },
];

const statusBadge = (s: BirthdayGuest['status']) => ({
  scheduled: 'bg-amber-500/10 text-amber-400',
  sent: 'bg-blue-500/10 text-blue-400',
  redeemed: 'bg-green-500/10 text-green-400',
}[s]);

function emptyOffer(): Omit<Offer, 'id'> {
  return { name: '', description: '', channel: 'email', sendDaysBefore: 7, active: true };
}

export default function BirthdaysPage() {
  const [config, setConfig] = useLocalStorageState<Config>('seatsignals_birthdays_config', { automationEnabled: true, defaultChannel: 'email' });
  const { items: offers, add: addOffer, update: updateOffer, remove: removeOffer } = useCrudList<Offer>('seatsignals_birthday_offers', INITIAL_OFFERS);
  const { items: guests, update: updateGuest } = useCrudList<BirthdayGuest>('seatsignals_birthdays', INITIAL_GUESTS);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [offerForm, setOfferForm] = useState(emptyOffer());

  const upcoming = guests.filter(g => g.status === 'scheduled').length;
  const thisWeek = guests.filter(g => {
    const d = new Date(g.birthday);
    const now = new Date();
    const diff = (d.getTime() - now.getTime()) / 86400000;
    return diff >= 0 && diff <= 7;
  }).length;
  const redeemed = guests.filter(g => g.status === 'redeemed').length;
  const redemptionRate = guests.length ? Math.round((redeemed / guests.length) * 100) : 0;

  const openAddOffer = () => { setEditingId(null); setOfferForm(emptyOffer()); setModalOpen(true); };
  const openEditOffer = (o: Offer) => {
    setEditingId(o.id);
    setOfferForm({ name: o.name, description: o.description, channel: o.channel, sendDaysBefore: o.sendDaysBefore, active: o.active });
    setModalOpen(true);
  };
  const saveOffer = () => {
    if (!offerForm.name.trim()) { toast.error('Name required'); return; }
    if (editingId) { updateOffer(editingId, offerForm); toast.success('Offer updated'); }
    else { addOffer({ id: `o${Date.now()}`, ...offerForm }); toast.success('Offer added'); }
    setModalOpen(false);
  };
  const delOffer = (o: Offer) => {
    if (!confirm(`Delete "${o.name}"?`)) return;
    removeOffer(o.id); toast.success('Deleted');
  };
  const toggleOffer = (o: Offer) => {
    updateOffer(o.id, { active: !o.active });
    toast.success(o.active ? 'Offer paused' : 'Offer active');
  };
  const sendNow = (g: BirthdayGuest) => {
    updateGuest(g.id, { status: 'sent', lastContact: new Date().toISOString().split('T')[0] });
    toast.success(`Birthday offer sent to ${g.name}`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Cake className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Birthday Automation</h1>
            <p className="text-sm text-zinc-500">Send personalized offers to guests before their birthday</p>
          </div>
        </div>
        <button
          onClick={() => { setConfig(c => ({ ...c, automationEnabled: !c.automationEnabled })); toast.success(config.automationEnabled ? 'Automation paused' : 'Automation active'); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            config.automationEnabled
              ? 'bg-green-500/10 text-green-400 border border-green-500/30'
              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
          }`}
        >
          {config.automationEnabled ? '● Automation Active' : '○ Paused'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Upcoming" value={upcoming} icon={<Calendar size={18} />} />
        <MetricCard title="This Week" value={thisWeek} />
        <MetricCard title="Redemption Rate" value={`${redemptionRate}%`} icon={<Gift size={18} />} trend={{ value: 7, positive: true }} />
        <MetricCard title="Total Guests" value={guests.length} icon={<Users size={18} />} />
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Offer Templates</h3>
          <button onClick={openAddOffer} className="text-xs text-seat-red hover:underline">+ Add Offer</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {offers.map(o => (
            <div key={o.id} className="bg-seat-black border border-seat-border/50 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-white font-medium">{o.name}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">Sends {o.sendDaysBefore}d before · {o.channel.toUpperCase()}</div>
                </div>
                <button
                  onClick={() => toggleOffer(o)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${o.active ? 'bg-seat-red' : 'bg-seat-border'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${o.active ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>
              <p className="text-xs text-zinc-400 mb-3">{o.description}</p>
              <div className="flex justify-end gap-1">
                <button onClick={() => openEditOffer(o)} className="p-1 text-zinc-500 hover:text-white rounded"><Pencil size={12} /></button>
                <button onClick={() => delOffer(o)} className="p-1 text-zinc-500 hover:text-red-400 rounded"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Upcoming Birthdays</h3>
        <div className="space-y-2">
          {guests.map(g => (
            <div key={g.id} className="flex items-center gap-3 p-3 bg-seat-black border border-seat-border/50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-seat-red/10 text-seat-red flex items-center justify-center">
                <Cake size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium">{g.name}</div>
                <div className="text-xs text-zinc-500">{g.email} · Birthday {g.birthday}</div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${statusBadge(g.status)}`}>{g.status}</span>
              {g.status === 'scheduled' && (
                <button onClick={() => sendNow(g)} className="flex items-center gap-1 px-2.5 py-1 text-xs bg-seat-red hover:bg-seat-red/90 text-white rounded">
                  <Send size={11} /> Send now
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <EditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Offer' : 'New Birthday Offer'}
        footer={<><GhostButton onClick={() => setModalOpen(false)}>Cancel</GhostButton><PrimaryButton onClick={saveOffer}>{editingId ? 'Save' : 'Create'}</PrimaryButton></>}
      >
        <div className="space-y-4">
          <div><FieldLabel>Offer Name</FieldLabel><TextInput value={offerForm.name} onChange={(v) => setOfferForm(f => ({ ...f, name: v }))} placeholder="Free Dessert" /></div>
          <div><FieldLabel>Description</FieldLabel><TextArea value={offerForm.description} onChange={(v) => setOfferForm(f => ({ ...f, description: v }))} placeholder="What the guest will receive" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Channel</FieldLabel>
              <Select value={offerForm.channel} onChange={(v) => setOfferForm(f => ({ ...f, channel: v as Offer['channel'] }))} options={[
                { label: 'Email', value: 'email' }, { label: 'SMS', value: 'sms' }, { label: 'Both', value: 'both' },
              ]} />
            </div>
            <div><FieldLabel>Send (days before)</FieldLabel><TextInput type="number" value={offerForm.sendDaysBefore} onChange={(v) => setOfferForm(f => ({ ...f, sendDaysBefore: parseInt(v) || 0 }))} /></div>
          </div>
        </div>
      </EditModal>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-zinc-500">
        <div className="flex items-center gap-2"><Mail size={14} /> Email delivery ~96% within 30 minutes</div>
        <div className="flex items-center gap-2"><MessageSquare size={14} /> SMS delivery ~99% within 5 minutes</div>
      </div>
    </div>
  );
}
