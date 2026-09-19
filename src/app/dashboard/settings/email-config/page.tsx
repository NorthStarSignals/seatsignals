'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { cn } from '@/lib/utils';
import { useLocalStorageState } from '@/hooks/use-local-storage-state';
import {
  EditModal,
  FieldLabel,
  TextInput,
  TextArea,
  PrimaryButton,
  GhostButton,
} from '@/components/dashboard/edit-modal';
import toast from 'react-hot-toast';
import { Mail, Send, Settings, CheckCircle2, Pencil } from 'lucide-react';

interface SenderSettings {
  from_name: string;
  from_email: string;
  reply_to: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  trigger: string;
  subject: string;
  body: string;
  enabled: boolean;
  last_sent: string;
  open_rate: number;
}

const DEFAULT_SENDER: SenderSettings = {
  from_name: 'The Grand Kitchen',
  from_email: 'hello@thegrandkitchen.com',
  reply_to: 'reservations@thegrandkitchen.com',
};

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  { id: 'tpl-1', name: 'Reservation Confirmation', trigger: 'On booking', subject: 'Your reservation is confirmed!', body: 'Hi {first_name},\n\nYour reservation for {party_size} on {date} at {time} is confirmed.', enabled: true, last_sent: '2 hours ago', open_rate: 78 },
  { id: 'tpl-2', name: 'Pre-Visit Reminder', trigger: '24h before reservation', subject: 'See you tomorrow!', body: 'Hi {first_name},\n\nJust a reminder — we look forward to seeing you tomorrow at {time}.', enabled: true, last_sent: '3 hours ago', open_rate: 65 },
  { id: 'tpl-3', name: 'Post-Visit Thank You', trigger: '2h after visit', subject: 'Thanks for dining with us', body: 'Hi {first_name},\n\nThanks for visiting! We hope you enjoyed your meal.', enabled: true, last_sent: '5 hours ago', open_rate: 42 },
  { id: 'tpl-4', name: 'Review Request', trigger: '24h after visit', subject: 'How was your experience?', body: 'Hi {first_name},\n\nWe\'d love to hear your thoughts: {review_link}', enabled: true, last_sent: '1 day ago', open_rate: 35 },
  { id: 'tpl-5', name: 'Birthday Greeting', trigger: 'On birthday', subject: 'Happy Birthday from us!', body: 'Happy Birthday, {first_name}! Celebrate with a free dessert on your next visit.', enabled: true, last_sent: '2 days ago', open_rate: 58 },
  { id: 'tpl-6', name: 'Win-Back Campaign', trigger: '30 days inactive', subject: 'We miss you', body: 'Hi {first_name},\n\nIt\'s been a while — come back for 15% off your next visit.', enabled: true, last_sent: '3 days ago', open_rate: 28 },
  { id: 'tpl-7', name: 'Loyalty Points Update', trigger: 'Weekly digest', subject: 'Your loyalty points update', body: 'Hi {first_name},\n\nYou now have {points} points. Keep it up!', enabled: false, last_sent: 'Never', open_rate: 0 },
  { id: 'tpl-8', name: 'Gift Card Delivery', trigger: 'On purchase', subject: 'Your gift card is here', body: 'Your gift card for ${amount} is attached. Enjoy!', enabled: true, last_sent: '5 days ago', open_rate: 92 },
];

export default function EmailConfigPage() {
  const [sender, setSender] = useLocalStorageState<SenderSettings>(
    'seatsignals_settings_email_sender',
    DEFAULT_SENDER
  );
  const [templates, setTemplates] = useLocalStorageState<EmailTemplate[]>(
    'seatsignals_settings_email_templates',
    DEFAULT_TEMPLATES
  );

  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [senderForm, setSenderForm] = useState<SenderSettings>(sender);

  const activeEmails = templates.filter(t => t.enabled).length;
  const scored = templates.filter(t => t.enabled && t.open_rate > 0);
  const avgOpenRate = scored.length > 0
    ? Math.round(scored.reduce((s, e) => s + e.open_rate, 0) / scored.length)
    : 0;

  const saveSender = () => {
    setSender(senderForm);
    toast.success('Sender settings saved');
  };

  const sendTest = () => {
    toast.success('Test email sent');
  };

  const toggleTemplate = (id: string) => {
    setTemplates(prev => prev.map(t => (t.id === id ? { ...t, enabled: !t.enabled } : t)));
  };

  const saveTemplate = (patch: EmailTemplate) => {
    setTemplates(prev => prev.map(t => (t.id === patch.id ? patch : t)));
    toast.success('Template saved');
    setEditingTemplate(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
          <Mail className="w-5 h-5 text-seat-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Email Configuration</h1>
          <p className="text-sm text-zinc-500">Manage email settings and automated campaigns</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Active Emails" value={activeEmails} icon={<Mail size={18} />} />
        <MetricCard title="Avg Open Rate" value={`${avgOpenRate}%`} icon={<Send size={18} />} />
        <MetricCard title="Provider" value="SendGrid" icon={<Settings size={18} />} />
        <MetricCard title="Status" value="Connected" icon={<CheckCircle2 size={18} />} />
      </div>

      {/* Sender Settings */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Sender Settings</h3>
        <div className="space-y-4 max-w-lg">
          <div>
            <FieldLabel>From Name</FieldLabel>
            <TextInput value={senderForm.from_name} onChange={v => setSenderForm(s => ({ ...s, from_name: v }))} />
          </div>
          <div>
            <FieldLabel>From Email</FieldLabel>
            <TextInput type="email" value={senderForm.from_email} onChange={v => setSenderForm(s => ({ ...s, from_email: v }))} />
          </div>
          <div>
            <FieldLabel>Reply-To</FieldLabel>
            <TextInput type="email" value={senderForm.reply_to} onChange={v => setSenderForm(s => ({ ...s, reply_to: v }))} />
          </div>
          <div className="flex items-center gap-3">
            <PrimaryButton onClick={saveSender}>Save Settings</PrimaryButton>
            <button
              onClick={sendTest}
              className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm border border-zinc-700 hover:text-white"
            >
              Send Test Email
            </button>
          </div>
        </div>
      </div>

      {/* Templates */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Automated Emails</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-zinc-500 uppercase border-b border-seat-border">
              <th className="text-left py-2 px-3">Email</th>
              <th className="text-left py-2 px-3">Trigger</th>
              <th className="text-right py-2 px-3">Open Rate</th>
              <th className="text-left py-2 px-3">Last Sent</th>
              <th className="text-center py-2 px-3">Enabled</th>
              <th className="text-center py-2 px-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {templates.map(e => (
              <tr key={e.id} className="border-b border-seat-border/30">
                <td className="py-2.5 px-3 text-white font-medium">{e.name}</td>
                <td className="py-2.5 px-3 text-zinc-400">{e.trigger}</td>
                <td className={cn('py-2.5 px-3 text-right font-medium',
                  e.open_rate >= 50 ? 'text-green-400' : e.open_rate >= 30 ? 'text-amber-400' : 'text-zinc-500')}>
                  {e.open_rate > 0 ? `${e.open_rate}%` : '—'}
                </td>
                <td className="py-2.5 px-3 text-zinc-500">{e.last_sent}</td>
                <td className="py-2.5 px-3 text-center">
                  <button
                    onClick={() => toggleTemplate(e.id)}
                    className={cn('w-8 h-5 rounded-full flex items-center mx-auto px-0.5',
                      e.enabled ? 'bg-green-500/20 justify-end' : 'bg-zinc-700 justify-start')}
                  >
                    <div className={cn('w-4 h-4 rounded-full', e.enabled ? 'bg-green-400' : 'bg-zinc-500')} />
                  </button>
                </td>
                <td className="py-2.5 px-3 text-center">
                  <button
                    onClick={() => setEditingTemplate(e)}
                    className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingTemplate && (
        <TemplateEditModal
          template={editingTemplate}
          onCancel={() => setEditingTemplate(null)}
          onSave={saveTemplate}
        />
      )}
    </div>
  );
}

function TemplateEditModal({
  template,
  onCancel,
  onSave,
}: {
  template: EmailTemplate;
  onCancel: () => void;
  onSave: (t: EmailTemplate) => void;
}) {
  const [form, setForm] = useState(template);

  return (
    <EditModal
      open={true}
      onClose={onCancel}
      title={`Edit Template: ${template.name}`}
      maxWidth="xl"
      footer={
        <>
          <GhostButton onClick={onCancel}>Cancel</GhostButton>
          <PrimaryButton onClick={() => onSave(form)}>Save Template</PrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <FieldLabel>Name</FieldLabel>
          <TextInput value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
        </div>
        <div>
          <FieldLabel>Trigger</FieldLabel>
          <TextInput value={form.trigger} onChange={v => setForm(f => ({ ...f, trigger: v }))} />
        </div>
        <div>
          <FieldLabel>Subject Line</FieldLabel>
          <TextInput value={form.subject} onChange={v => setForm(f => ({ ...f, subject: v }))} />
        </div>
        <div>
          <FieldLabel>Body</FieldLabel>
          <TextArea value={form.body} onChange={v => setForm(f => ({ ...f, body: v }))} rows={8} />
        </div>
      </div>
    </EditModal>
  );
}
