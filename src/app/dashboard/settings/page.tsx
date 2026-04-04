'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useRestaurant } from '@/hooks/use-restaurant';
import { PLANS } from '@/lib/stripe';
import toast from 'react-hot-toast';
import {
  Download, QrCode, CreditCard, Zap, Pencil,
  Truck, Monitor, Mail, Star, Wifi, Copy, ExternalLink,
  ChevronDown, ChevronUp,
} from 'lucide-react';

interface IntegrationConfig {
  id: string;
  provider: string;
  status: string;
  config: Record<string, string>;
}

interface IntegrationDef {
  name: string;
  provider: string;
  desc: string;
}

interface IntegrationSection {
  title: string;
  icon: React.ReactNode;
  integrations: IntegrationDef[];
}

const INTEGRATION_SECTIONS: IntegrationSection[] = [
  {
    title: 'Delivery Platforms',
    icon: <Truck size={18} className="text-red-500" />,
    integrations: [
      { name: 'DoorDash', provider: 'doordash', desc: 'Sync orders, revenue, and ratings from DoorDash' },
      { name: 'Uber Eats', provider: 'uber_eats', desc: 'Sync orders, revenue, and ratings from Uber Eats' },
      { name: 'Grubhub', provider: 'grubhub', desc: 'Sync orders, revenue, and ratings from Grubhub' },
      { name: 'Postmates', provider: 'postmates', desc: 'Sync orders and revenue from Postmates' },
      { name: 'Caviar', provider: 'caviar', desc: 'Sync orders and revenue from Caviar' },
      { name: 'ChowNow', provider: 'chownow', desc: 'Sync orders from your ChowNow storefront' },
      { name: 'Toast Takeout', provider: 'toast_takeout', desc: 'Sync delivery orders from Toast Takeout' },
      { name: 'Olo', provider: 'olo', desc: 'Sync orders from your Olo dispatch channels' },
    ],
  },
  {
    title: 'POS Systems',
    icon: <Monitor size={18} className="text-red-500" />,
    integrations: [
      { name: 'Toast POS', provider: 'toast_pos', desc: 'Sync sales, menu items, and labor data' },
      { name: 'Square', provider: 'square', desc: 'Sync transactions, items, and customer data' },
      { name: 'Clover', provider: 'clover', desc: 'Sync orders, payments, and inventory' },
      { name: 'Lightspeed', provider: 'lightspeed', desc: 'Sync sales, inventory, and reporting data' },
      { name: 'Revel', provider: 'revel', desc: 'Sync POS data and reporting from Revel' },
      { name: 'Aloha (NCR)', provider: 'aloha_ncr', desc: 'Sync sales and labor data from Aloha POS' },
    ],
  },
  {
    title: 'CRM & Marketing',
    icon: <Mail size={18} className="text-red-500" />,
    integrations: [
      { name: 'Klaviyo', provider: 'klaviyo', desc: 'Sync customer data for email & SMS campaigns' },
      { name: 'HubSpot', provider: 'hubspot', desc: 'Sync contacts and deals to your CRM' },
      { name: 'Mailchimp', provider: 'mailchimp', desc: 'Sync customer emails for marketing campaigns' },
    ],
  },
  {
    title: 'Reviews',
    icon: <Star size={18} className="text-red-500" />,
    integrations: [
      { name: 'Google Business Profile', provider: 'google_business', desc: 'Auto-monitor and respond to Google reviews' },
      { name: 'Yelp', provider: 'yelp', desc: 'Monitor and respond to Yelp reviews' },
      { name: 'TripAdvisor', provider: 'tripadvisor', desc: 'Monitor TripAdvisor reviews and ratings' },
    ],
  },
  {
    title: 'WiFi & Analytics',
    icon: <Wifi size={18} className="text-red-500" />,
    integrations: [
      { name: 'WiFi Analytics', provider: 'wifi_analytics', desc: 'Power your capture form — collect customer data via WiFi login' },
    ],
  },
];

export default function SettingsPage() {
  const { restaurant, loading, mutate } = useRestaurant();
  const [qrSvg, setQrSvg] = useState('');
  const [captureUrl, setCaptureUrl] = useState('');
  const [testMode, setTestMode] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', cuisine_type: '', brand_voice: '' });
  const [connectedIntegrations, setConnectedIntegrations] = useState<IntegrationConfig[]>([]);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [savingIntegration, setSavingIntegration] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations');
      if (res.ok) {
        const data = await res.json();
        setConnectedIntegrations(data.integrations || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchIntegrations(); }, [fetchIntegrations]);

  const isConnected = (provider: string) =>
    connectedIntegrations.some(i => i.provider === provider && i.status === 'connected');

  const connectedCount = (providers: string[]) =>
    providers.filter(p => isConnected(p)).length;

  const handleConnect = async (provider: string) => {
    if (!apiKey.trim()) { toast.error('Please enter an API key'); return; }
    setSavingIntegration(true);
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, api_key: apiKey }),
      });
      if (res.ok) {
        toast.success('Integration connected');
        setConnectingProvider(null);
        setApiKey('');
        fetchIntegrations();
      } else {
        toast.error('Failed to connect integration');
      }
    } catch { toast.error('Failed to connect integration'); }
    finally { setSavingIntegration(false); }
  };

  const handleDisconnect = async (provider: string) => {
    try {
      const res = await fetch('/api/integrations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      if (res.ok) {
        toast.success('Integration disconnected');
        fetchIntegrations();
      } else {
        toast.error('Failed to disconnect');
      }
    } catch { toast.error('Failed to disconnect'); }
  };

  useEffect(() => {
    if (restaurant) {
      setForm({
        name: restaurant.name || '',
        address: restaurant.address || '',
        cuisine_type: restaurant.cuisine_type || '',
        brand_voice: restaurant.brand_voice || '',
      });
    }
  }, [restaurant]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/restaurant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success('Profile updated');
        setEditing(false);
        mutate();
      } else {
        toast.error('Failed to update profile');
      }
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (restaurant) {
      setForm({
        name: restaurant.name || '',
        address: restaurant.address || '',
        cuisine_type: restaurant.cuisine_type || '',
        brand_voice: restaurant.brand_voice || '',
      });
    }
    setEditing(false);
  };

  const generateQR = async () => {
    const res = await fetch('/api/qrcode');
    if (res.ok) {
      const data = await res.json();
      setQrSvg(data.svg);
      setCaptureUrl(data.url);
    }
  };

  useEffect(() => {
    if (!loading && restaurant) {
      generateQR();
    }
  }, [loading, restaurant]);

  const subscribeToPlan = async (plan: string) => {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } else {
      toast.error('Failed to create checkout session');
    }
  };

  const toggleSection = (title: string) => {
    setCollapsedSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loading) return <div className="text-zinc-400">Loading settings...</div>;

  const totalConnected = connectedIntegrations.filter(i => i.status === 'connected').length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Restaurant Profile */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Restaurant Profile</h2>
            {restaurant && !editing && (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
                <Pencil size={13} /> Edit Profile
              </button>
            )}
          </div>
          {restaurant ? (
            editing ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-600 mb-1 block">Name</label>
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm px-4 py-2.5 w-full" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-600 mb-1 block">Address</label>
                    <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm px-4 py-2.5 w-full" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-600 mb-1 block">Cuisine</label>
                    <input value={form.cuisine_type} onChange={e => setForm({ ...form, cuisine_type: e.target.value })} className="bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm px-4 py-2.5 w-full" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-600 mb-1 block">Subscription</label>
                    <p className="text-white capitalize text-sm px-4 py-2.5">{restaurant.subscription_tier} Plan</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-600 mb-1 block">Brand Voice</label>
                    <input value={form.brand_voice} onChange={e => setForm({ ...form, brand_voice: e.target.value })} className="bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm px-4 py-2.5 w-full" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="cta" size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
                  <Button variant="secondary" size="sm" onClick={handleCancel}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Name</p>
                  <p className="text-white">{restaurant.name}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Address</p>
                  <p className="text-white">{restaurant.address}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Cuisine</p>
                  <p className="text-white">{restaurant.cuisine_type}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Subscription</p>
                  <p className="text-white capitalize">{restaurant.subscription_tier} Plan</p>
                </div>
                {restaurant.brand_voice && (
                  <div className="md:col-span-2">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Brand Voice</p>
                    <p className="text-zinc-300 text-sm">{restaurant.brand_voice}</p>
                  </div>
                )}
              </div>
            )
          ) : (
            <p className="text-zinc-400">Complete onboarding to set up your profile.</p>
          )}
        </div>

        {/* WiFi Capture Setup */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wifi size={20} className="text-red-500" />
            <h2 className="text-lg font-semibold text-white">WiFi Capture Setup</h2>
          </div>
          {restaurant ? (
            <div className="space-y-5">
              <p className="text-sm text-zinc-300">
                Share this link or print QR codes for table tents to capture customer data. When guests scan the QR code or visit the link, they&apos;ll see your branded WiFi capture page where they can opt in for offers.
              </p>

              {/* Capture URL */}
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-2 block">Capture Form URL</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-300 font-mono break-all">
                    {captureUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/capture/${restaurant.restaurant_id}`}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => copyToClipboard(captureUrl || `${window.location.origin}/capture/${restaurant.restaurant_id}`)}
                  >
                    <Copy size={14} className="mr-1" /> Copy Link
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open(captureUrl || `/capture/${restaurant.restaurant_id}`, '_blank')}
                  >
                    <ExternalLink size={14} className="mr-1" /> Preview
                  </Button>
                </div>
              </div>

              {/* QR Code + Print */}
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {qrSvg ? (
                  <div className="bg-white p-4 rounded-lg" dangerouslySetInnerHTML={{ __html: qrSvg }} />
                ) : (
                  <div className="w-[150px] h-[150px] bg-zinc-800 rounded-lg flex items-center justify-center">
                    <QrCode size={40} className="text-zinc-600" />
                  </div>
                )}
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-white mb-1">Table Tent Message</p>
                    <p className="text-sm text-zinc-400">
                      &quot;Scan for free WiFi + 10% off your next visit.&quot;
                    </p>
                  </div>
                  <Button variant="cta" size="sm" onClick={() => {
                    const w = window.open('', '_blank');
                    if (w) {
                      w.document.write(`
                        <html><head><title>SeatSignals QR Codes</title>
                        <style>body{margin:0;padding:20px;font-family:sans-serif}
                        .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:800px;margin:0 auto}
                        .card{border:2px solid #ccc;border-radius:12px;padding:20px;text-align:center}
                        .card h3{margin:0 0 10px;font-size:18px}
                        .card p{margin:5px 0;color:#666;font-size:14px}
                        svg{width:150px;height:150px}
                        @media print{.grid{gap:10px}.card{border:1px solid #999}}</style></head>
                        <body><div class="grid">
                        ${[1,2,3,4].map(() => `<div class="card"><h3>${restaurant?.name || 'Restaurant'}</h3>${qrSvg}<p>Scan for free WiFi + 10% off your next visit</p></div>`).join('')}
                        </div></body></html>
                      `);
                      w.document.close();
                      w.print();
                    }
                  }}>
                    <Download size={16} className="mr-1" /> Print Table Tents (4 per page)
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-zinc-400 text-sm">Complete onboarding to set up WiFi capture.</p>
          )}
        </div>

        {/* Integrations */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={20} className="text-red-500" />
            <h2 className="text-lg font-semibold text-white">Integrations</h2>
            {totalConnected > 0 && (
              <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full ml-2">
                {totalConnected} connected
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-400 mb-5">Connect your platforms to automatically sync data into SeatSignals.</p>

          <div className="space-y-6">
            {INTEGRATION_SECTIONS.map((section) => {
              const sectionProviders = section.integrations.map(i => i.provider);
              const sectionConnected = connectedCount(sectionProviders);
              const isCollapsed = collapsedSections[section.title] ?? false;

              return (
                <div key={section.title}>
                  <button
                    onClick={() => toggleSection(section.title)}
                    className="flex items-center justify-between w-full mb-3 group"
                  >
                    <div className="flex items-center gap-2">
                      {section.icon}
                      <h3 className="text-sm font-semibold text-white uppercase tracking-wider">{section.title}</h3>
                      {sectionConnected > 0 && (
                        <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full">
                          {sectionConnected}/{section.integrations.length}
                        </span>
                      )}
                    </div>
                    {isCollapsed ? (
                      <ChevronDown size={16} className="text-zinc-500 group-hover:text-white transition-colors" />
                    ) : (
                      <ChevronUp size={16} className="text-zinc-500 group-hover:text-white transition-colors" />
                    )}
                  </button>

                  {!isCollapsed && (
                    <div className="space-y-2">
                      {section.integrations.map((integration) => {
                        const connected = isConnected(integration.provider);
                        const isExpanded = connectingProvider === integration.provider;
                        return (
                          <div key={integration.provider} className="p-4 bg-zinc-800 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-white font-medium text-sm">{integration.name}</p>
                                    {connected && (
                                      <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full flex-shrink-0">Connected</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-zinc-400 mt-0.5">{integration.desc}</p>
                                </div>
                              </div>
                              <div className="flex-shrink-0 ml-4">
                                {connected ? (
                                  <Button variant="secondary" size="sm" onClick={() => handleDisconnect(integration.provider)}>Disconnect</Button>
                                ) : (
                                  <Button variant="secondary" size="sm" onClick={() => { setConnectingProvider(isExpanded ? null : integration.provider); setApiKey(''); }}>
                                    {isExpanded ? 'Cancel' : 'Connect'}
                                  </Button>
                                )}
                              </div>
                            </div>
                            {isExpanded && !connected && (
                              <div className="mt-3 flex items-center gap-2">
                                <input
                                  type="password"
                                  placeholder="Enter your API key"
                                  value={apiKey}
                                  onChange={e => setApiKey(e.target.value)}
                                  className="bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm px-4 py-2.5 w-full"
                                />
                                <Button variant="cta" size="sm" onClick={() => handleConnect(integration.provider)} disabled={savingIntegration}>
                                  {savingIntegration ? 'Saving...' : 'Save'}
                                </Button>
                                <Button variant="secondary" size="sm" onClick={() => { setConnectingProvider(null); setApiKey(''); }}>Cancel</Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Test Mode Toggle */}
            <div className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg">
              <div>
                <p className="text-white font-medium">Test Mode</p>
                <p className="text-xs text-zinc-400">Use demo data when platforms aren&apos;t connected yet</p>
              </div>
              <button
                onClick={() => { const next = !testMode; setTestMode(next); toast.success('Test mode ' + (next ? 'enabled' : 'disabled')); }}
                className={`relative w-12 h-6 rounded-full transition-colors ${testMode ? 'bg-red-500' : 'bg-zinc-700'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${testMode ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Billing */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={20} className="text-red-500" />
            <h2 className="text-lg font-semibold text-white">Billing</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.entries(PLANS) as [string, typeof PLANS[keyof typeof PLANS]][]).map(([key, plan]) => (
              <div
                key={key}
                className={`border rounded-xl p-6 ${
                  restaurant?.subscription_tier === key
                    ? 'border-red-500 bg-red-500/5'
                    : 'border-zinc-800'
                }`}
              >
                <h3 className="text-white font-bold text-lg">{plan.name}</h3>
                <p className="text-2xl font-bold text-red-400 mt-1">{plan.priceDisplay}</p>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((f, i) => (
                    <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">&#10003;</span> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={restaurant?.subscription_tier === key ? 'secondary' : 'cta'}
                  className="w-full mt-4"
                  onClick={() => subscribeToPlan(key)}
                  disabled={restaurant?.subscription_tier === key}
                >
                  {restaurant?.subscription_tier === key ? 'Current Plan' : 'Upgrade'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
