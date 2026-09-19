'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { cn } from '@/lib/utils';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal,
  FieldLabel,
  TextInput,
  TextArea,
  PrimaryButton,
  GhostButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { MessageSquare, Send, Settings, CheckCircle2, Plus, Pencil, Trash2 } from 'lucide-react';

interface SmsTemplate {
  id: string;
  name: string;
  template: string;
  enabled: boolean;
  sent_this_month: number;
}

const DEFAULT_TEMPLATES: SmsTemplate[] = [
  { id: 'sms-1', name: 'Reservation Confirmation', template: 'Hi {name}! Your reservation at {restaurant} on {date} at {time} for {party_size} is confirmed. See you soon!', enabled: true, sent_this_month: 820 },
  { id: 'sms-2', name: 'Waitlist Ready', template: '{name}, your table is ready! Please check in at the host stand within 10 minutes. Reply DONE when seated.', enabled: true, sent_this_month: 340 },
  { id: 'sms-3', name: 'Order Ready (Pickup)', template: 'Your order #{order_num} from {restaurant} is ready for pickup! Please come to the pickup counter.', enabled: true, sent_this_month: 580 },
  { id: 'sms-4', name: 'Review Request', template: 'Thanks for dining at {restaurant}, {name}! We\'d love your feedback: {review_link}', enabled: true, sent_this_month: 650 },
  { id: 'sms-5', name: 'Birthday Wish', template: 'Happy Birthday, {name}! Enjoy a complimentary dessert on your next visit. Show this text to your server!', enabled: true, sent_this_month: 45 },
  { id: 'sms-6', name: 'Flash Deal Alert', template: 'FLASH DEAL at {restaurant}! {deal_details}. Today only. Reply STOP to opt out.', enabled: false, sent_this_month: 0 },
];

const emptyForm = () => ({
  name: '',
  template: '',
  enabled: true,
  sent_this_month: 0,
});

export default function SmsConfigPage() {
  const { items: templates, add, update, remove } = useCrudList<SmsTemplate>(
    'seatsignals_settings_sms_templates',
    DEFAULT_TEMPLATES
  );
  const [testNumber, setTestNumber] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  const activeTemplates = templates.filter(t => t.enabled).length;
  const totalSent = templates.reduce((s, t) => s + t.sent_this_month, 0);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (t: SmsTemplate) => {
    setEditingId(t.id);
    setForm({ name: t.name, template: t.template, enabled: t.enabled, sent_this_month: t.sent_this_month });
    setShowModal(true);
  };

  const saveTemplate = () => {
    if (!form.name.trim() || !form.template.trim()) {
      toast.error('Name and message body are required');
      return;
    }
    if (editingId) {
      update(editingId, form);
      toast.success('Template updated');
    } else {
      add({ id: `sms-${Date.now()}`, ...form });
      toast.success('Template added');
    }
    setShowModal(false);
  };

  const deleteTemplate = (id: string) => {
    if (!confirm('Delete this template?')) return;
    remove(id);
    toast.success('Deleted');
  };

  const toggleEnabled = (t: SmsTemplate) => {
    update(t.id, { enabled: !t.enabled });
  };

  const sendTest = (t: SmsTemplate) => {
    if (!testNumber.trim()) {
      toast.error('Enter a test phone number first');
      return;
    }
    toast.success(`Test SMS "${t.name}" sent to ${testNumber}`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">SMS Configuration</h1>
            <p className="text-sm text-zinc-500">Manage SMS templates and delivery settings</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90"
        >
          <Plus size={14} /> Add Template
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Active Templates" value={activeTemplates} icon={<MessageSquare size={18} />} />
        <MetricCard title="Sent This Month" value={totalSent.toLocaleString()} icon={<Send size={18} />} />
        <MetricCard title="Provider" value="Twilio" icon={<Settings size={18} />} />
        <MetricCard title="Status" value="Active" icon={<CheckCircle2 size={18} />} />
      </div>

      {/* Provider Settings */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Provider Settings</h3>
        <div className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Phone Number</label>
            <input
              type="text"
              defaultValue="+1 (555) 867-5309"
              readOnly
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Monthly SMS Limit</label>
            <input
              type="text"
              defaultValue="5,000"
              readOnly
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Test Phone Number</label>
            <input
              type="tel"
              value={testNumber}
              onChange={e => setTestNumber(e.target.value)}
              placeholder="+1 (555) 555-1234"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-seat-red"
            />
            <p className="text-[10px] text-zinc-500 mt-1">Used by the &quot;Test&quot; button on each template below.</p>
          </div>
        </div>
      </div>

      {/* Templates */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">SMS Templates</h3>
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.id} className="border border-seat-border/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-white">{t.name}</h4>
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium',
                    t.enabled ? 'bg-green-500/10 text-green-400' : 'bg-zinc-800 text-zinc-500')}>
                    {t.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500">{t.sent_this_month.toLocaleString()} sent</span>
                  <button
                    onClick={() => toggleEnabled(t)}
                    className={cn('w-8 h-5 rounded-full flex items-center px-0.5',
                      t.enabled ? 'bg-green-500/20 justify-end' : 'bg-zinc-700 justify-start')}
                  >
                    <div className={cn('w-4 h-4 rounded-full', t.enabled ? 'bg-green-400' : 'bg-zinc-500')} />
                  </button>
                </div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-xs text-zinc-300 font-mono leading-relaxed">{t.template}</p>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => openEdit(t)}
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-1 bg-zinc-800 text-zinc-300 rounded border border-zinc-700 hover:text-white"
                >
                  <Pencil size={10} /> Edit
                </button>
                <button
                  onClick={() => sendTest(t)}
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-1 bg-zinc-800 text-zinc-300 rounded border border-zinc-700 hover:text-white"
                >
                  <Send size={10} /> Test
                </button>
                <button
                  onClick={() => deleteTemplate(t.id)}
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-1 bg-red-900/20 text-red-400 rounded border border-red-900/40 hover:bg-red-900/40"
                >
                  <Trash2 size={10} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <EditModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit SMS Template' : 'Add SMS Template'}
        maxWidth="lg"
        footer={
          <>
            <GhostButton onClick={() => setShowModal(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={saveTemplate}>{editingId ? 'Save Changes' : 'Add'}</PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <FieldLabel>Name</FieldLabel>
            <TextInput value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Birthday Wish" />
          </div>
          <div>
            <FieldLabel>Message Body</FieldLabel>
            <TextArea
              value={form.template}
              onChange={v => setForm(f => ({ ...f, template: v }))}
              placeholder="Hi {name}! ..."
              rows={6}
            />
            <p className="text-[10px] text-zinc-500 mt-1">Use {'{name}'}, {'{restaurant}'}, {'{date}'}, {'{time}'} as placeholders.</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))}
              className="w-4 h-4 rounded border-zinc-600 bg-seat-black"
            />
            <span className="text-sm text-white">Enabled</span>
          </label>
        </div>
      </EditModal>
    </div>
  );
}
