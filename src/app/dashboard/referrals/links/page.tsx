'use client';

import { useState, useEffect, useCallback } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import {
  Link2,
  Copy,
  Users,
  DollarSign,
  Plus,
  Trash2,
  QrCode,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ReferralLink {
  id: string;
  code: string;
  url: string;
  name: string;
  reward_type: string;
  reward_value: string;
  clicks: number;
  conversions: number;
  revenue: number;
  created_at: string;
  status: 'active' | 'paused' | 'expired';
}

function generateLinks(): ReferralLink[] {
  const links = [
    { name: 'General Referral', code: 'REFER10', reward_type: '10% off', reward_value: '10%', clicks: 342, conversions: 48, revenue: 3840 },
    { name: 'VIP Invite', code: 'VIPINVITE', reward_type: 'Free appetizer', reward_value: '$15', clicks: 128, conversions: 32, revenue: 2560 },
    { name: 'Birthday Special', code: 'BDAY25', reward_type: '25% off', reward_value: '25%', clicks: 89, conversions: 22, revenue: 1540 },
    { name: 'Happy Hour Share', code: 'HAPPYHOUR', reward_type: 'Free drink', reward_value: '$12', clicks: 215, conversions: 45, revenue: 2700 },
    { name: 'Date Night', code: 'DATENIGHT', reward_type: '$20 off $100+', reward_value: '$20', clicks: 156, conversions: 28, revenue: 2800 },
    { name: 'Family Dinner', code: 'FAMILY15', reward_type: '15% off', reward_value: '15%', clicks: 98, conversions: 18, revenue: 1260 },
  ];

  return links.map((l, i) => ({
    id: `rl-${i}`,
    ...l,
    url: `https://seatsignals.app/ref/${l.code}`,
    created_at: new Date(Date.now() - (i * 7 + 3) * 86400000).toISOString(),
    status: i < 5 ? 'active' as const : 'paused' as const,
  }));
}

export default function ReferralLinksPage() {
  const [links, setLinks] = useState<ReferralLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newReward, setNewReward] = useState('10% off');

  const fetchData = useCallback(() => {
    setTimeout(() => { setLinks(generateLinks()); setLoading(false); }, 300);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied!');
  };

  const createLink = () => {
    if (!newName || !newCode) return;
    const link: ReferralLink = {
      id: `rl-${Date.now()}`,
      code: newCode.toUpperCase().replace(/\s/g, ''),
      url: `https://seatsignals.app/ref/${newCode.toUpperCase().replace(/\s/g, '')}`,
      name: newName,
      reward_type: newReward,
      reward_value: newReward,
      clicks: 0,
      conversions: 0,
      revenue: 0,
      created_at: new Date().toISOString(),
      status: 'active',
    };
    setLinks([link, ...links]);
    setShowCreate(false);
    setNewName('');
    setNewCode('');
    toast.success('Referral link created');
  };

  if (loading) {
    return (<div className="p-6 space-y-6"><div className="animate-pulse space-y-4"><div className="h-8 bg-zinc-800 rounded w-64" /><div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i=><div key={i} className="h-28 bg-zinc-800/50 rounded-xl" />)}</div></div></div>);
  }

  const totalClicks = links.reduce((s, l) => s + l.clicks, 0);
  const totalConversions = links.reduce((s, l) => s + l.conversions, 0);
  const totalRevenue = links.reduce((s, l) => s + l.revenue, 0);
  const convRate = totalClicks > 0 ? Math.round((totalConversions / totalClicks) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-seat-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Referral Links</h1>
            <p className="text-sm text-zinc-500">Create and track referral campaigns</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90">
          <Plus size={16} /> New Link
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total Clicks" value={totalClicks} icon={<Link2 size={18} />} />
        <MetricCard title="Conversions" value={totalConversions} icon={<Users size={18} />} />
        <MetricCard title="Revenue" value={formatCurrency(totalRevenue)} icon={<DollarSign size={18} />} />
        <MetricCard title="Conv. Rate" value={`${convRate}%`} icon={<Users size={18} />} />
      </div>

      {showCreate && (
        <div className="bg-seat-card border border-seat-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Create Referral Link</h3>
          <div className="grid grid-cols-3 gap-4">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Link name"
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-seat-red" />
            <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="Code (e.g., SUMMER20)"
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-seat-red" />
            <select value={newReward} onChange={e => setNewReward(e.target.value)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-seat-red">
              <option>10% off</option>
              <option>15% off</option>
              <option>25% off</option>
              <option>Free appetizer</option>
              <option>Free drink</option>
              <option>$10 off</option>
              <option>$20 off</option>
            </select>
          </div>
          <button onClick={createLink} disabled={!newName || !newCode}
            className="px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 disabled:opacity-50">Create</button>
        </div>
      )}

      <div className="space-y-3">
        {links.map(link => (
          <div key={link.id} className="bg-seat-card border border-seat-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-seat-red/10 flex items-center justify-center">
                  <Link2 size={14} className="text-seat-red" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{link.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <code className="text-[11px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-300 font-mono">{link.code}</code>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium',
                      link.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-zinc-800 text-zinc-400')}>
                      {link.status}
                    </span>
                    <span className="text-[10px] text-zinc-500">{link.reward_type}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => copyLink(link.url)} className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded-lg text-xs hover:text-white">
                  <Copy size={12} /> Copy Link
                </button>
                <button className="p-1.5 text-zinc-400 hover:text-white"><QrCode size={14} /></button>
                <button onClick={() => setLinks(links.filter(l => l.id !== link.id))} className="p-1.5 text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 bg-zinc-800/30 rounded-lg p-3">
              <div className="text-center">
                <p className="text-[10px] text-zinc-500">Clicks</p>
                <p className="text-sm font-bold text-white">{link.clicks}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-zinc-500">Conversions</p>
                <p className="text-sm font-bold text-green-400">{link.conversions}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-zinc-500">Revenue</p>
                <p className="text-sm font-bold text-white">{formatCurrency(link.revenue)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
