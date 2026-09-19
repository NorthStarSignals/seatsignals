'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { cn } from '@/lib/utils';
import {
  MessageSquare, Users, Bell, Hash, Pin, Send, Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useLocalStorageState } from '@/hooks/use-local-storage-state';
import {
  EditModal, FieldLabel, TextInput, PrimaryButton, GhostButton,
} from '@/components/dashboard/edit-modal';

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  pinned?: boolean;
}

interface Channel {
  id: string;
  name: string;
  members: number;
  messages: Message[];
}

const INITIAL: Channel[] = [
  {
    id: 'general', name: 'general', members: 24,
    messages: [
      { id: 'g1', sender: 'Malik Alexander', text: 'Team meeting moved to 3 PM today. Please confirm attendance.', timestamp: '10:32 AM', pinned: true },
      { id: 'g2', sender: 'Sarah Chen', text: "Confirmed, I'll be there.", timestamp: '10:35 AM' },
      { id: 'g3', sender: 'James Rodriguez', text: 'Works for me. Should I bring the sales report?', timestamp: '10:38 AM' },
    ],
  },
  {
    id: 'kitchen', name: 'kitchen', members: 8,
    messages: [
      { id: 'k1', sender: 'Chef Marcus', text: 'New seasonal menu items are prepped and ready for tasting at 2 PM.', timestamp: '9:15 AM', pinned: true },
      { id: 'k2', sender: 'Lisa Wong', text: "We're running low on salmon. Need to reorder by end of day.", timestamp: '9:45 AM' },
    ],
  },
  {
    id: 'front-of-house', name: 'front-of-house', members: 12,
    messages: [
      { id: 'f1', sender: 'Rachel Kim', text: 'VIP reservation at table 7 tonight.', timestamp: '8:30 AM', pinned: true },
    ],
  },
  {
    id: 'management', name: 'management', members: 5,
    messages: [
      { id: 'm1', sender: 'Malik Alexander', text: 'Q2 revenue targets updated in the dashboard.', timestamp: '8:00 AM', pinned: true },
    ],
  },
];

function getInitials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() || '').join('');
}
const AVATAR_COLORS = ['bg-rose-600', 'bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-purple-600', 'bg-cyan-600', 'bg-pink-600', 'bg-indigo-600'];
function hashColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function nowStamp() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function StaffMessagingPage() {
  const [channels, setChannels] = useLocalStorageState<Channel[]>('seatsignals_staff_messaging', INITIAL);
  const [activeId, setActiveId] = useState<string>(INITIAL[0].id);
  const [composer, setComposer] = useState('');
  const [newChanOpen, setNewChanOpen] = useState(false);
  const [newChanName, setNewChanName] = useState('');

  const channel = channels.find((c) => c.id === activeId) || channels[0];
  const pinned = channel?.messages.filter((m) => m.pinned) || [];
  const totalMessages = channels.reduce((s, c) => s + c.messages.length, 0);

  const send = () => {
    const text = composer.trim();
    if (!text || !channel) return;
    const msg: Message = {
      id: Date.now().toString(),
      sender: 'You',
      text,
      timestamp: nowStamp(),
    };
    setChannels((prev) => prev.map((c) => c.id === channel.id ? { ...c, messages: [...c.messages, msg] } : c));
    setComposer('');
  };

  const createChannel = () => {
    const name = newChanName.trim().toLowerCase().replace(/\s+/g, '-');
    if (!name) { toast.error('Channel name required'); return; }
    if (channels.some((c) => c.id === name)) { toast.error('Channel already exists'); return; }
    setChannels((prev) => [...prev, { id: name, name, members: 1, messages: [] }]);
    toast.success(`Created #${name}`);
    setActiveId(name);
    setNewChanOpen(false);
    setNewChanName('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#E11D48]/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-[#E11D48]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Team Messaging</h1>
            <p className="text-sm text-zinc-400">Communicate with your team across channels</p>
          </div>
        </div>
        <button onClick={() => setNewChanOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 transition">
          <Plus size={16} /> New Channel
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Active Channels" value={channels.length} subtitle="All channels active" icon={<Hash className="w-4 h-4" />} />
        <MetricCard title="Messages" value={totalMessages} subtitle="total in log" icon={<MessageSquare className="w-4 h-4" />} />
        <MetricCard title="Team Online" value="18 / 24" subtitle="75% availability" icon={<Users className="w-4 h-4" />} />
        <MetricCard title="Pinned" value={channels.reduce((s, c) => s + c.messages.filter((m) => m.pinned).length, 0)} icon={<Bell className="w-4 h-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 rounded-xl bg-[#1C1C21] border border-[#27272A] p-4">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Channels</h2>
          <div className="space-y-1">
            {channels.map((ch) => (
              <button key={ch.id} onClick={() => setActiveId(ch.id)} className={cn('w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition', activeId === ch.id ? 'bg-[#E11D48]/10 border border-[#E11D48]/30 text-white' : 'text-zinc-400 hover:bg-[#09090B] hover:text-zinc-200 border border-transparent')}>
                <div className="flex items-center gap-2 min-w-0">
                  <Hash className="w-4 h-4 shrink-0 text-zinc-500" />
                  <span className="text-sm font-medium truncate">{ch.name}</span>
                </div>
                <span className="text-[10px] text-zinc-600">{ch.messages.length}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 rounded-xl bg-[#1C1C21] border border-[#27272A] flex flex-col">
          <div className="px-5 py-4 border-b border-[#27272A] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-zinc-500" />
              <h2 className="text-lg font-semibold text-zinc-100">{channel?.name}</h2>
              <span className="text-xs text-zinc-500 ml-1">{channel?.members} members</span>
            </div>
          </div>

          {pinned.length > 0 && (
            <div className="px-5 py-3 border-b border-[#27272A] bg-[#E11D48]/5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-[#E11D48] mb-2">
                <Pin className="w-3.5 h-3.5" /> Pinned ({pinned.length})
              </div>
              <div className="space-y-1.5">
                {pinned.map((msg) => (
                  <div key={msg.id} className="text-xs text-zinc-300 leading-relaxed">
                    <span className="font-semibold text-zinc-200">{msg.sender}:</span> {msg.text}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 max-h-[480px]">
            {channel?.messages.map((msg) => (
              <div key={msg.id} className="flex items-start gap-3">
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0', hashColor(msg.sender))}>
                  {getInitials(msg.sender)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-zinc-200">{msg.sender}</span>
                    <span className="text-[10px] text-zinc-600">{msg.timestamp}</span>
                    {msg.pinned && <Pin className="w-3 h-3 text-[#E11D48] opacity-60" />}
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed mt-0.5">{msg.text}</p>
                </div>
              </div>
            ))}
            {channel?.messages.length === 0 && <p className="text-sm text-zinc-600 text-center py-8">No messages yet</p>}
          </div>

          <div className="px-5 py-4 border-t border-[#27272A]">
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder={`Message #${channel?.name}...`}
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
                className="flex-1 bg-[#09090B] border border-[#27272A] rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-[#E11D48]/50 focus:ring-1 focus:ring-[#E11D48]/20 transition"
              />
              <button
                onClick={send}
                disabled={!composer.trim()}
                className={cn('flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition', composer.trim() ? 'bg-[#E11D48] text-white hover:bg-[#E11D48]/90' : 'bg-[#27272A] text-zinc-500 cursor-not-allowed')}
              >
                <Send className="w-4 h-4" /> Send
              </button>
            </div>
          </div>
        </div>
      </div>

      <EditModal
        open={newChanOpen}
        onClose={() => setNewChanOpen(false)}
        title="Create Channel"
        footer={
          <>
            <GhostButton onClick={() => setNewChanOpen(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={createChannel}>Create</PrimaryButton>
          </>
        }
      >
        <div>
          <FieldLabel>Channel Name</FieldLabel>
          <TextInput value={newChanName} onChange={setNewChanName} placeholder="e.g. events" />
          <p className="text-xs text-zinc-500 mt-2">Spaces will be converted to dashes.</p>
        </div>
      </EditModal>
    </div>
  );
}
