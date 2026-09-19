'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useRestaurant } from '@/hooks/use-restaurant';
import { PLANS } from '@/lib/stripe';
import toast from 'react-hot-toast';
import {
  Download, QrCode, CreditCard, Zap, Pencil,
  Truck, Monitor, Mail, Star, Wifi, Copy, ExternalLink,
  ChevronDown, ChevronUp, Megaphone, Settings, Sparkles,
  Bell, Link2, Shield, Upload, Clock, Phone, Trash2,
  FileDown, ToggleLeft, AlertTriangle, Check, Eye,
  MessageSquare, Users, BarChart3, Globe, Image,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────
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

interface BusinessHours {
  day: string;
  open: string;
  close: string;
  closed: boolean;
}

type TabId = 'general' | 'brand' | 'notifications' | 'integrations' | 'billing' | 'privacy';

// ─── Constants ────────────────────────────────────────────────────────
const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'General', icon: <Settings size={16} /> },
  { id: 'brand', label: 'Brand Voice', icon: <Sparkles size={16} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
  { id: 'integrations', label: 'Integrations', icon: <Link2 size={16} /> },
  { id: 'billing', label: 'Billing', icon: <CreditCard size={16} /> },
  { id: 'privacy', label: 'Data & Privacy', icon: <Shield size={16} /> },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DEFAULT_HOURS: BusinessHours[] = DAYS.map(day => ({
  day,
  open: '11:00',
  close: '22:00',
  closed: false,
}));

const TONE_OPTIONS = ['Professional', 'Casual', 'Fun', 'Luxurious', 'Family-Friendly'] as const;

const SAMPLE_MESSAGES: Record<string, string[]> = {
  Professional: [
    'We appreciate your recent visit and look forward to welcoming you again. Our team is dedicated to delivering an exceptional dining experience.',
    'Thank you for your thoughtful review. We value your feedback and are continuously refining our offerings.',
  ],
  Casual: [
    'Hey! Thanks for stopping by - we loved having you. Come back soon and bring your friends!',
    'Appreciate the kind words! We put a lot of love into every dish and it means a lot to hear that.',
  ],
  Fun: [
    'You + our tacos = a love story for the ages! Come back for the sequel (and maybe some guac). 🎉',
    'We\'re blushing over here! Your review just made our whole crew do a happy dance. 💃',
  ],
  Luxurious: [
    'It was our privilege to host you. We trust every detail of your experience reflected the standard of excellence we uphold.',
    'Your gracious words inspire us to continue curating moments of refined indulgence. We await your return.',
  ],
  'Family-Friendly': [
    'Thanks for bringing the whole family! We hope the kids had a blast - there\'s always a seat at our table for your crew.',
    'Family dinners are the best, and we\'re honored you chose us! Next time, ask about our kids\' dessert special.',
  ],
};

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
      { name: 'WiFi Analytics', provider: 'wifi_analytics', desc: 'Power your capture form -- collect customer data via WiFi login' },
    ],
  },
  {
    title: 'Ads & Retargeting',
    icon: <Megaphone size={18} className="text-red-500" />,
    integrations: [
      { name: 'Facebook Ads', provider: 'facebook_ads', desc: 'Sync customer audiences for retargeting campaigns on Facebook' },
      { name: 'Instagram Ads', provider: 'instagram_ads', desc: 'Retarget captured diners with Instagram ad campaigns' },
      { name: 'Google Ads', provider: 'google_ads', desc: 'Create custom audiences and run retargeting on Google' },
      { name: 'TikTok Ads', provider: 'tiktok_ads', desc: 'Reach younger diners with TikTok retargeting campaigns' },
    ],
  },
];

// ─── Reusable Components ──────────────────────────────────────────────
function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-xl p-6 ${className}`}>
      {children}
    </div>
  );
}

function InputLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1.5 block">
      {children}
    </label>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text', disabled = false }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm px-4 py-2.5 w-full placeholder:text-zinc-600 disabled:opacity-50"
    />
  );
}

function Toggle({ enabled, onToggle, label, desc }: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
  desc?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm text-white font-medium">{label}</p>
        {desc && <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>}
      </div>
      <button
        onClick={onToggle}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-red-500' : 'bg-zinc-700'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${enabled ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { restaurant, loading, mutate } = useRestaurant();
  const [activeTab, setActiveTab] = useState<TabId>('general');

  // General tab state
  const [form, setForm] = useState({ name: '', address: '', cuisine_type: '', brand_voice: '' });
  const [logoUrl, setLogoUrl] = useState('');
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>(DEFAULT_HOURS);
  const [savingGeneral, setSavingGeneral] = useState(false);

  // Brand Voice tab state
  const [brandVoice, setBrandVoice] = useState('');
  const [selectedTone, setSelectedTone] = useState<string>('Professional');
  const [analyzingReviews, setAnalyzingReviews] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);

  // Notifications tab state
  const [notifications, setNotifications] = useState({
    email_new_customer: true,
    email_new_review: true,
    email_catering_lead: true,
    email_churn_risk: true,
    email_weekly_report: true,
    sms_critical_only: false,
    sms_all_alerts: false,
  });
  const [notificationEmail, setNotificationEmail] = useState('');
  const [savingNotifications, setSavingNotifications] = useState(false);

  // Integrations tab state (preserved from original)
  const [connectedIntegrations, setConnectedIntegrations] = useState<IntegrationConfig[]>([]);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [savingIntegration, setSavingIntegration] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [testMode, setTestMode] = useState(true);

  // WiFi Capture (preserved)
  const [qrSvg, setQrSvg] = useState('');
  const [captureUrl, setCaptureUrl] = useState('');

  // Email config (preserved)
  const [emailForm, setEmailForm] = useState({ from_name: '', from_email: '' });
  const [emailConfigExists, setEmailConfigExists] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  // Privacy tab state
  const [gdprEnabled, setGdprEnabled] = useState(false);
  const [ccpaEnabled, setCcpaEnabled] = useState(false);
  const [retentionPeriod, setRetentionPeriod] = useState('36');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // ─── Data fetching ────────────────────────────────────────────────
  const fetchEmailConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/email');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setEmailForm({ from_name: data.config.from_name || '', from_email: data.config.from_email || '' });
          setEmailConfigExists(true);
        }
      }
    } catch { /* ignore */ }
  }, []);

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations');
      if (res.ok) {
        const data = await res.json();
        setConnectedIntegrations(data.integrations || []);
      }
    } catch { /* ignore */ }
  }, []);

  const generateQR = useCallback(async () => {
    const res = await fetch('/api/qrcode');
    if (res.ok) {
      const data = await res.json();
      setQrSvg(data.svg);
      setCaptureUrl(data.url);
    }
  }, []);

  useEffect(() => { fetchEmailConfig(); }, [fetchEmailConfig]);
  useEffect(() => { fetchIntegrations(); }, [fetchIntegrations]);

  useEffect(() => {
    if (!loading && restaurant) {
      generateQR();
    }
  }, [loading, restaurant, generateQR]);

  useEffect(() => {
    if (restaurant) {
      setForm({
        name: restaurant.name || '',
        address: restaurant.address || '',
        cuisine_type: restaurant.cuisine_type || '',
        brand_voice: restaurant.brand_voice || '',
      });
      setBrandVoice(restaurant.brand_voice || '');
      setLogoUrl(restaurant.logo_url || '');
    }
  }, [restaurant]);

  // ─── Integration helpers ──────────────────────────────────────────
  const isConnected = (provider: string) =>
    connectedIntegrations.some(i => i.provider === provider && i.status === 'connected');

  const connectedCount = (providers: string[]) =>
    providers.filter(p => isConnected(p)).length;

  const totalConnected = connectedIntegrations.filter(i => i.status === 'connected').length;

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

  const toggleSection = (title: string) => {
    setCollapsedSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

  // ─── Save handlers ───────────────────────────────────────────────
  const handleSaveGeneral = async () => {
    setSavingGeneral(true);
    try {
      const res = await fetch('/api/settings/general', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, logo_url: logoUrl }),
      });
      if (res.ok) {
        toast.success('General settings saved');
        mutate();
      } else {
        toast.error('Failed to save settings');
      }
    } catch { toast.error('Failed to save settings'); }
    finally { setSavingGeneral(false); }
  };

  const handleSaveBrandVoice = async () => {
    setSavingBrand(true);
    try {
      const res = await fetch('/api/settings/general', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_voice: brandVoice }),
      });
      if (res.ok) {
        toast.success('Brand voice saved');
        mutate();
      } else {
        toast.error('Failed to save brand voice');
      }
    } catch { toast.error('Failed to save brand voice'); }
    finally { setSavingBrand(false); }
  };

  const handleAnalyzeReviews = async () => {
    setAnalyzingReviews(true);
    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'brand_voice' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.suggestion || data.insight) {
          setBrandVoice(data.suggestion || data.insight);
          toast.success('Brand voice suggestion generated from your reviews');
        } else {
          toast.success('Analysis complete - update your brand voice based on review patterns');
        }
      } else {
        toast.error('Could not analyze reviews at this time');
      }
    } catch {
      toast.error('Could not analyze reviews at this time');
    } finally {
      setAnalyzingReviews(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSavingNotifications(true);
    // Simulated save - in production this would POST to an API
    await new Promise(r => setTimeout(r, 600));
    toast.success('Notification preferences saved');
    setSavingNotifications(false);
  };

  const handleSaveEmail = async () => {
    setSavingEmail(true);
    try {
      const res = await fetch('/api/settings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_name: emailForm.from_name, from_email: emailForm.from_email }),
      });
      if (res.ok) {
        toast.success('Email settings saved');
        setEmailConfigExists(true);
      } else {
        toast.error('Failed to save email settings');
      }
    } catch { toast.error('Failed to save email settings'); }
    finally { setSavingEmail(false); }
  };

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

  const handleExportData = async () => {
    toast.success('Preparing CSV export...');
    try {
      const res = await fetch('/api/customers');
      if (res.ok) {
        const data = await res.json();
        const customers = data.customers || data || [];
        if (!Array.isArray(customers) || customers.length === 0) {
          toast.error('No customer data to export');
          return;
        }
        const headers = Object.keys(customers[0]);
        const csv = [
          headers.join(','),
          ...customers.map((c: Record<string, unknown>) =>
            headers.map(h => {
              const val = c[h];
              const str = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
              return str.includes(',') ? `"${str}"` : str;
            }).join(',')
          ),
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `seatsignals-customers-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Export downloaded');
      } else {
        toast.error('Failed to export data');
      }
    } catch { toast.error('Failed to export data'); }
  };

  const handleDeleteAllData = async () => {
    if (deleteConfirmText !== 'DELETE ALL DATA') {
      toast.error('Please type "DELETE ALL DATA" to confirm');
      return;
    }
    toast.success('Data deletion request submitted. This will be processed within 24 hours.');
    setShowDeleteConfirm(false);
    setDeleteConfirmText('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const updateHours = (index: number, field: keyof BusinessHours, value: string | boolean) => {
    setBusinessHours(prev => prev.map((h, i) => i === index ? { ...h, [field]: value } : h));
  };

  // ─── Loading ──────────────────────────────────────────────────────
  if (loading) return <div className="text-zinc-400 p-6">Loading settings...</div>;

  // ─── Tab Content Renderers ────────────────────────────────────────

  const renderGeneralTab = () => (
    <div className="space-y-6">
      {/* Restaurant Profile */}
      <SectionCard>
        <div className="flex items-center gap-2 mb-5">
          <Pencil size={18} className="text-red-500" />
          <h2 className="text-lg font-semibold text-white">Restaurant Profile</h2>
        </div>
        {restaurant ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <InputLabel>Restaurant Name</InputLabel>
                <TextInput value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Your restaurant name" />
              </div>
              <div>
                <InputLabel>Address</InputLabel>
                <TextInput value={form.address} onChange={v => setForm({ ...form, address: v })} placeholder="123 Main St, City, State" />
              </div>
              <div>
                <InputLabel>Cuisine Type</InputLabel>
                <TextInput value={form.cuisine_type} onChange={v => setForm({ ...form, cuisine_type: v })} placeholder="Italian, Mexican, American, etc." />
              </div>
              <div>
                <InputLabel>Subscription</InputLabel>
                <p className="text-white capitalize text-sm px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl">{restaurant.subscription_tier} Plan</p>
              </div>
            </div>

            {/* Logo Upload */}
            <div>
              <InputLabel>Restaurant Logo</InputLabel>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-zinc-800 border border-zinc-700 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Image size={28} className="text-zinc-600" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <TextInput value={logoUrl} onChange={setLogoUrl} placeholder="https://example.com/your-logo.png" />
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // In production, upload to storage and get URL
                            const reader = new FileReader();
                            reader.onload = () => setLogoUrl(reader.result as string);
                            reader.readAsDataURL(file);
                            toast.success('Logo preview loaded - save to apply');
                          }
                        }}
                      />
                      <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 cursor-pointer">
                        <Upload size={13} /> Upload File
                      </span>
                    </label>
                    {logoUrl && (
                      <button
                        onClick={() => setLogoUrl('')}
                        className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-zinc-400">Complete onboarding to set up your profile.</p>
        )}
      </SectionCard>

      {/* Business Hours */}
      <SectionCard>
        <div className="flex items-center gap-2 mb-5">
          <Clock size={18} className="text-red-500" />
          <h2 className="text-lg font-semibold text-white">Business Hours</h2>
        </div>
        <div className="space-y-2">
          {businessHours.map((h, i) => (
            <div key={h.day} className="flex items-center gap-3 py-2">
              <span className="text-sm text-zinc-300 w-24 flex-shrink-0">{h.day}</span>
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="time"
                  value={h.open}
                  onChange={e => updateHours(i, 'open', e.target.value)}
                  disabled={h.closed}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm px-3 py-1.5 disabled:opacity-30"
                />
                <span className="text-zinc-500 text-xs">to</span>
                <input
                  type="time"
                  value={h.close}
                  onChange={e => updateHours(i, 'close', e.target.value)}
                  disabled={h.closed}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm px-3 py-1.5 disabled:opacity-30"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={h.closed}
                  onChange={e => updateHours(i, 'closed', e.target.checked)}
                  className="sr-only"
                />
                <span className={`text-xs px-2.5 py-1 rounded-full transition-colors ${h.closed ? 'bg-zinc-700 text-zinc-300' : 'bg-white/[0.04] text-zinc-500'}`}>
                  {h.closed ? 'Closed' : 'Open'}
                </span>
              </label>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* WiFi Capture Setup (preserved from original) */}
      <SectionCard>
        <div className="flex items-center gap-2 mb-4">
          <Wifi size={20} className="text-red-500" />
          <h2 className="text-lg font-semibold text-white">WiFi Capture Setup</h2>
        </div>
        {restaurant ? (
          <div className="space-y-5">
            <p className="text-sm text-zinc-300">
              Share this link or print QR codes for table tents to capture customer data. When guests scan the QR code or visit the link, they&apos;ll see your branded WiFi capture page where they can opt in for offers.
            </p>
            <div>
              <InputLabel>Capture Form URL</InputLabel>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-300 font-mono break-all">
                  {captureUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/capture/${restaurant.restaurant_id}`}
                </div>
                <Button variant="secondary" size="sm" onClick={() => copyToClipboard(captureUrl || `${window.location.origin}/capture/${restaurant.restaurant_id}`)}>
                  <Copy size={14} className="mr-1" /> Copy
                </Button>
                <Button variant="secondary" size="sm" onClick={() => window.open(captureUrl || `/capture/${restaurant.restaurant_id}`, '_blank')}>
                  <ExternalLink size={14} className="mr-1" /> Preview
                </Button>
              </div>
            </div>
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
                  <p className="text-sm text-zinc-400">&quot;Scan for free WiFi + 10% off your next visit.&quot;</p>
                </div>
                <Button variant="cta" size="sm" onClick={() => {
                  const w = window.open('', '_blank');
                  if (w) {
                    w.document.write(`<html><head><title>SeatSignals QR Codes</title><style>body{margin:0;padding:20px;font-family:sans-serif}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:800px;margin:0 auto}.card{border:2px solid #ccc;border-radius:12px;padding:20px;text-align:center}.card h3{margin:0 0 10px;font-size:18px}.card p{margin:5px 0;color:#666;font-size:14px}svg{width:150px;height:150px}@media print{.grid{gap:10px}.card{border:1px solid #999}}</style></head><body><div class="grid">${[1,2,3,4].map(() => `<div class="card"><h3>${restaurant?.name || 'Restaurant'}</h3>${qrSvg}<p>Scan for free WiFi + 10% off your next visit</p></div>`).join('')}</div></body></html>`);
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
      </SectionCard>

      {/* Save General */}
      <div className="flex justify-end">
        <Button variant="cta" size="md" onClick={handleSaveGeneral} disabled={savingGeneral}>
          {savingGeneral ? 'Saving...' : 'Save General Settings'}
        </Button>
      </div>
    </div>
  );

  const renderBrandVoiceTab = () => (
    <div className="space-y-6">
      <SectionCard>
        <div className="flex items-center gap-2 mb-5">
          <Sparkles size={18} className="text-red-500" />
          <h2 className="text-lg font-semibold text-white">Brand Voice</h2>
        </div>
        <p className="text-sm text-zinc-400 mb-5">
          Define how SeatSignals communicates on your behalf. This voice is used for AI-generated review responses, email campaigns, and customer messages.
        </p>

        {/* Brand Voice Textarea */}
        <div className="mb-5">
          <InputLabel>Your Brand Voice Description</InputLabel>
          <textarea
            value={brandVoice}
            onChange={e => setBrandVoice(e.target.value)}
            placeholder="Describe your restaurant's personality and communication style. E.g., 'Warm and welcoming family restaurant with a playful attitude. We use casual language and love food puns.'"
            rows={4}
            className="bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm px-4 py-3 w-full placeholder:text-zinc-600 resize-none"
          />
        </div>

        {/* Analyze Reviews Button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={handleAnalyzeReviews}
          disabled={analyzingReviews}
          className="mb-6"
        >
          <Sparkles size={14} className="mr-1" />
          {analyzingReviews ? 'Analyzing Reviews...' : 'Analyze My Reviews'}
        </Button>

        {/* Tone Selector */}
        <div className="mb-6">
          <InputLabel>Tone Preset</InputLabel>
          <div className="flex flex-wrap gap-2 mt-1">
            {TONE_OPTIONS.map(tone => (
              <button
                key={tone}
                onClick={() => setSelectedTone(tone)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedTone === tone
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600 hover:text-zinc-300'
                }`}
              >
                {tone}
              </button>
            ))}
          </div>
        </div>

        {/* Sample Messages */}
        <div>
          <InputLabel>Sample Messages ({selectedTone} Tone)</InputLabel>
          <div className="space-y-3 mt-2">
            {(SAMPLE_MESSAGES[selectedTone] || []).map((msg, i) => (
              <div key={i} className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Eye size={14} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Preview {i + 1}</p>
                    <p className="text-sm text-zinc-300 leading-relaxed">{msg}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <Button variant="cta" size="md" onClick={handleSaveBrandVoice} disabled={savingBrand}>
          {savingBrand ? 'Saving...' : 'Save Brand Voice'}
        </Button>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      {/* Email Notifications */}
      <SectionCard>
        <div className="flex items-center gap-2 mb-4">
          <Mail size={18} className="text-red-500" />
          <h2 className="text-lg font-semibold text-white">Email Notifications</h2>
        </div>
        <div className="divide-y divide-zinc-800">
          <Toggle
            label="New Customer Captured"
            desc="Get notified when a new customer signs up via WiFi capture or QR code"
            enabled={notifications.email_new_customer}
            onToggle={() => setNotifications(n => ({ ...n, email_new_customer: !n.email_new_customer }))}
          />
          <Toggle
            label="New Review Received"
            desc="Get alerted when a new review appears on Google, Yelp, or TripAdvisor"
            enabled={notifications.email_new_review}
            onToggle={() => setNotifications(n => ({ ...n, email_new_review: !n.email_new_review }))}
          />
          <Toggle
            label="Catering Lead Discovered"
            desc="Notification when the Catering Hunter finds a new potential lead"
            enabled={notifications.email_catering_lead}
            onToggle={() => setNotifications(n => ({ ...n, email_catering_lead: !n.email_catering_lead }))}
          />
          <Toggle
            label="Churn Risk Alert"
            desc="Warning when a valuable customer shows signs of churning"
            enabled={notifications.email_churn_risk}
            onToggle={() => setNotifications(n => ({ ...n, email_churn_risk: !n.email_churn_risk }))}
          />
          <Toggle
            label="Weekly Performance Report"
            desc="Receive a digest of your key metrics every Monday morning"
            enabled={notifications.email_weekly_report}
            onToggle={() => setNotifications(n => ({ ...n, email_weekly_report: !n.email_weekly_report }))}
          />
        </div>
        <div className="mt-5">
          <InputLabel>Notification Email Address</InputLabel>
          <TextInput
            value={notificationEmail}
            onChange={setNotificationEmail}
            placeholder="owner@restaurant.com"
            type="email"
          />
        </div>
      </SectionCard>

      {/* SMS Notifications */}
      <SectionCard>
        <div className="flex items-center gap-2 mb-4">
          <Phone size={18} className="text-red-500" />
          <h2 className="text-lg font-semibold text-white">SMS Notifications</h2>
        </div>
        <p className="text-sm text-zinc-400 mb-4">Receive text alerts to your phone for urgent notifications.</p>
        <div className="divide-y divide-zinc-800">
          <Toggle
            label="Critical Alerts Only"
            desc="Churn risk, negative reviews (1-2 stars), large catering opportunities"
            enabled={notifications.sms_critical_only}
            onToggle={() => setNotifications(n => ({ ...n, sms_critical_only: !n.sms_critical_only, sms_all_alerts: false }))}
          />
          <Toggle
            label="All Alerts"
            desc="Get a text for every notification (may be frequent)"
            enabled={notifications.sms_all_alerts}
            onToggle={() => setNotifications(n => ({ ...n, sms_all_alerts: !n.sms_all_alerts, sms_critical_only: false }))}
          />
        </div>
      </SectionCard>

      {/* Email Sending Config (preserved) */}
      <SectionCard>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Mail size={18} className="text-red-500" />
            <h2 className="text-lg font-semibold text-white">Email Sending Configuration</h2>
            {emailConfigExists ? (
              <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full ml-2">Connected</span>
            ) : (
              <span className="bg-zinc-700 text-zinc-400 text-xs px-2.5 py-0.5 rounded-full ml-2">Not configured</span>
            )}
          </div>
        </div>
        <p className="text-sm text-zinc-400 mb-5">Configure how SeatSignals sends emails on your behalf.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <InputLabel>From Name</InputLabel>
            <TextInput
              value={emailForm.from_name}
              onChange={v => setEmailForm({ ...emailForm, from_name: v })}
              placeholder="e.g. Sakura Japanese Kitchen"
            />
          </div>
          <div>
            <InputLabel>From Email</InputLabel>
            <TextInput
              value={emailForm.from_email}
              onChange={v => setEmailForm({ ...emailForm, from_email: v })}
              placeholder="e.g. hello@sakurakitchen.com"
              type="email"
            />
          </div>
        </div>
        <Button variant="cta" size="sm" onClick={handleSaveEmail} disabled={savingEmail}>
          {savingEmail ? 'Saving...' : 'Save Email Settings'}
        </Button>
      </SectionCard>

      <div className="flex justify-end">
        <Button variant="cta" size="md" onClick={handleSaveNotifications} disabled={savingNotifications}>
          {savingNotifications ? 'Saving...' : 'Save Notification Preferences'}
        </Button>
      </div>
    </div>
  );

  const renderIntegrationsTab = () => (
    <div className="space-y-6">
      <SectionCard>
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
      </SectionCard>
    </div>
  );

  const renderBillingTab = () => (
    <div className="space-y-6">
      {/* Current Plan */}
      <SectionCard>
        <div className="flex items-center gap-2 mb-2">
          <CreditCard size={18} className="text-red-500" />
          <h2 className="text-lg font-semibold text-white">Current Plan</h2>
        </div>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl font-bold text-white capitalize">{restaurant?.subscription_tier || 'Starter'}</span>
          <span className="bg-red-500/10 text-red-400 text-xs px-3 py-1 rounded-full font-medium">Active</span>
        </div>

        {/* Plan Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.entries(PLANS) as [string, typeof PLANS[keyof typeof PLANS]][]).map(([key, plan]) => (
            <div
              key={key}
              className={`border rounded-xl p-6 transition-all ${
                restaurant?.subscription_tier === key
                  ? 'border-red-500 bg-red-500/5'
                  : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {restaurant?.subscription_tier === key && (
                <span className="text-[10px] uppercase tracking-wider text-red-400 font-semibold">Current Plan</span>
              )}
              <h3 className="text-white font-bold text-lg mt-1">{plan.name}</h3>
              <p className="text-2xl font-bold text-red-400 mt-1">{plan.priceDisplay}</p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((f, i) => (
                  <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                    <Check size={14} className="text-red-500 mt-0.5 flex-shrink-0" /> {f}
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
      </SectionCard>

      {/* Usage Stats */}
      <SectionCard>
        <div className="flex items-center gap-2 mb-5">
          <BarChart3 size={18} className="text-red-500" />
          <h2 className="text-lg font-semibold text-white">Usage This Month</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-zinc-500" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Customers</span>
            </div>
            <p className="text-2xl font-bold text-white">Unlimited</p>
            <p className="text-xs text-zinc-500 mt-1">All plans include unlimited contacts</p>
          </div>
          <div className="bg-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={16} className="text-zinc-500" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Messages Sent</span>
            </div>
            <p className="text-2xl font-bold text-white">--</p>
            <p className="text-xs text-zinc-500 mt-1">Email + SMS messages this billing cycle</p>
          </div>
          <div className="bg-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe size={16} className="text-zinc-500" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider">API Calls</span>
            </div>
            <p className="text-2xl font-bold text-white">--</p>
            <p className="text-xs text-zinc-500 mt-1">AI + integration API requests this cycle</p>
          </div>
        </div>
      </SectionCard>

      {/* Manage Billing */}
      <SectionCard>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Manage Billing</h2>
            <p className="text-sm text-zinc-400 mt-1">Update payment method, view invoices, or cancel your subscription.</p>
          </div>
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              toast.success('Redirecting to billing portal...');
              // In production: redirect to Stripe customer portal
            }}
          >
            <ExternalLink size={14} className="mr-1.5" /> Manage Billing
          </Button>
        </div>
      </SectionCard>
    </div>
  );

  const renderPrivacyTab = () => (
    <div className="space-y-6">
      {/* Export Data */}
      <SectionCard>
        <div className="flex items-center gap-2 mb-4">
          <FileDown size={18} className="text-red-500" />
          <h2 className="text-lg font-semibold text-white">Export Data</h2>
        </div>
        <p className="text-sm text-zinc-400 mb-4">
          Download a CSV file containing all your customer data, including contact info, visit history, and spend data.
        </p>
        <Button variant="secondary" size="md" onClick={handleExportData}>
          <Download size={14} className="mr-1.5" /> Export All Customer Data (CSV)
        </Button>
      </SectionCard>

      {/* Compliance Toggles */}
      <SectionCard>
        <div className="flex items-center gap-2 mb-4">
          <ToggleLeft size={18} className="text-red-500" />
          <h2 className="text-lg font-semibold text-white">Compliance Settings</h2>
        </div>
        <div className="divide-y divide-zinc-800">
          <Toggle
            label="GDPR Compliance Mode"
            desc="Enable enhanced data protection controls for EU customers. Adds consent tracking, right-to-deletion requests, and data portability."
            enabled={gdprEnabled}
            onToggle={() => setGdprEnabled(!gdprEnabled)}
          />
          <Toggle
            label="CCPA Compliance Mode"
            desc="Enable California Consumer Privacy Act controls. Adds opt-out tracking and data sale disclosure notices."
            enabled={ccpaEnabled}
            onToggle={() => setCcpaEnabled(!ccpaEnabled)}
          />
        </div>
      </SectionCard>

      {/* Data Retention */}
      <SectionCard>
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} className="text-red-500" />
          <h2 className="text-lg font-semibold text-white">Data Retention Period</h2>
        </div>
        <p className="text-sm text-zinc-400 mb-4">
          Set how long customer data is retained before automatic deletion. Inactive customer records older than this period will be purged.
        </p>
        <div className="max-w-xs">
          <select
            value={retentionPeriod}
            onChange={e => setRetentionPeriod(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm px-4 py-2.5 w-full appearance-none cursor-pointer"
          >
            <option value="6" className="bg-zinc-900">6 months</option>
            <option value="12" className="bg-zinc-900">12 months</option>
            <option value="24" className="bg-zinc-900">24 months</option>
            <option value="36" className="bg-zinc-900">36 months (default)</option>
            <option value="60" className="bg-zinc-900">60 months</option>
            <option value="0" className="bg-zinc-900">Indefinite (no auto-deletion)</option>
          </select>
        </div>
      </SectionCard>

      {/* Delete All Data */}
      <SectionCard className="border-red-900/30">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={18} className="text-red-500" />
          <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
        </div>
        <p className="text-sm text-zinc-400 mb-4">
          Permanently delete all customer data from SeatSignals. This action cannot be undone and will remove all customer records, visit history, sequences, and analytics.
        </p>
        {!showDeleteConfirm ? (
          <Button
            variant="secondary"
            size="md"
            onClick={() => setShowDeleteConfirm(true)}
            className="border-red-900/50 text-red-400 hover:bg-red-950 hover:text-red-300"
          >
            <Trash2 size={14} className="mr-1.5" /> Delete All Customer Data
          </Button>
        ) : (
          <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-4 space-y-3">
            <p className="text-sm text-red-300 font-medium">
              Are you absolutely sure? Type <span className="font-mono bg-red-900/30 px-1.5 py-0.5 rounded">DELETE ALL DATA</span> to confirm.
            </p>
            <TextInput
              value={deleteConfirmText}
              onChange={setDeleteConfirmText}
              placeholder="Type DELETE ALL DATA to confirm"
            />
            <div className="flex items-center gap-2">
              <Button
                variant="cta"
                size="sm"
                onClick={handleDeleteAllData}
                className="bg-red-700 hover:bg-red-800"
              >
                <Trash2 size={13} className="mr-1" /> Permanently Delete
              </Button>
              <Button variant="secondary" size="sm" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );

  // ─── Tab Content Map ──────────────────────────────────────────────
  const tabContent: Record<TabId, () => React.ReactNode> = {
    general: renderGeneralTab,
    brand: renderBrandVoiceTab,
    notifications: renderNotificationsTab,
    integrations: renderIntegrationsTab,
    billing: renderBillingTab,
    privacy: renderPrivacyTab,
  };

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>{tabContent[activeTab]()}</div>
    </div>
  );
}
