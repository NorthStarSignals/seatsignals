'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Plug,
  Check,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// ---------------------------------------------------------------------------
// Square (real integration)
// ---------------------------------------------------------------------------

interface SquareStatus {
  connection: {
    merchant_id: string | null;
    environment: string;
    scopes: string | null;
    connected_at: string;
    last_synced_at: string | null;
    status: 'active' | 'disconnected' | 'error';
    last_error: string | null;
  } | null;
  catalog_count: number;
}

function SquarePanel() {
  const [status, setStatus] = useState<SquareStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingOrders, setSyncingOrders] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/square');
      if (!res.ok) throw new Error('Failed to load Square status');
      setStatus(await res.json());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const syncCatalog = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/integrations/square/sync-catalog', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Sync failed');
      toast.success(`Synced ${body.items} items (${body.inserted} new, ${body.updated} updated)`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const syncOrders = async () => {
    setSyncingOrders(true);
    try {
      const res = await fetch('/api/integrations/square/sync-orders?days=90', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Sync failed');
      toast.success(
        `Synced ${body.fetched} orders across ${body.locations} location(s) — ${body.inserted} new, ${body.updated} updated`
      );
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncingOrders(false);
    }
  };

  const [seeding, setSeeding] = useState(false);
  const seedDemo = async () => {
    if (!confirm('Seed demo data? This will create 10 catalog items and 20 paid orders in your connected Square sandbox. Safe to run multiple times.')) return;
    setSeeding(true);
    try {
      const res = await fetch('/api/integrations/square/seed-demo-orders?count=20', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Seed failed');
      toast.success(`Seeded ${body.catalog_seeded_items} items + ${body.orders_paid}/${body.orders_created} paid orders ($${((body.total_revenue_cents || 0) / 100).toFixed(2)})`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Seed failed');
    } finally {
      setSeeding(false);
    }
  };

  const disconnect = async () => {
    if (!confirm('Disconnect Square? You can reconnect any time.')) return;
    try {
      const res = await fetch('/api/integrations/square', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to disconnect');
      toast.success('Square disconnected');
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  const connected = !!status?.connection && status.connection.status === 'active';

  return (
    <div className={cn(
      'bg-seat-card border rounded-xl p-5',
      connected ? 'border-green-500/30' : 'border-seat-border'
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm bg-zinc-900 border border-zinc-700">
            S
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              Square POS
              <span className="text-[10px] bg-seat-red/10 text-seat-red px-2 py-0.5 rounded-full font-medium">
                LIVE
              </span>
            </h3>
            <span className="text-[10px] text-zinc-500">POS · {status?.connection?.environment || 'sandbox'}</span>
          </div>
        </div>
        {connected && <Check size={16} className="text-green-400" />}
        {status?.connection?.status === 'error' && <AlertCircle size={16} className="text-red-400" />}
      </div>

      <p className="text-xs text-zinc-400 mb-4">
        Pulls catalog, orders, customers, and inventory from your Square account. Sandbox is safe to experiment with.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Loader2 size={12} className="animate-spin" /> Loading…
        </div>
      ) : connected ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-[10px] text-zinc-500 uppercase">Catalog items</div>
              <div className="text-white font-semibold">{status.catalog_count.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase">Last sync</div>
              <div className="text-white font-semibold">
                {status.connection!.last_synced_at
                  ? new Date(status.connection!.last_synced_at).toLocaleString()
                  : 'never'}
              </div>
            </div>
          </div>
          {status.connection!.last_error && (
            <div className="text-[11px] text-red-400 bg-red-500/10 rounded p-2">
              Last error: {status.connection!.last_error}
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={syncCatalog}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-seat-red hover:bg-seat-red/90 disabled:opacity-50 text-white rounded-lg text-xs font-medium"
            >
              <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing…' : 'Sync Catalog'}
            </button>
            <button
              onClick={syncOrders}
              disabled={syncingOrders}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium"
            >
              <RefreshCw size={12} className={syncingOrders ? 'animate-spin' : ''} />
              {syncingOrders ? 'Syncing…' : 'Sync Orders (90d)'}
            </button>
            <button
              onClick={seedDemo}
              disabled={seeding}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-amber-500/40 text-amber-300 disabled:opacity-50 rounded-lg text-xs font-medium"
              title="Sandbox-only — creates fake catalog + orders for demo"
            >
              <RefreshCw size={12} className={seeding ? 'animate-spin' : ''} />
              {seeding ? 'Seeding…' : '🌱 Seed demo data'}
            </button>
            <button
              onClick={disconnect}
              className="px-3 py-1.5 bg-zinc-800 text-zinc-400 hover:text-red-400 rounded-lg text-xs font-medium"
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <a
          href="/api/integrations/square/connect"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg text-xs font-medium"
        >
          <ExternalLink size={12} />
          Connect Square
        </a>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Klaviyo (real integration — private API key)
// ---------------------------------------------------------------------------

interface KlaviyoMetadata {
  test_account?: boolean;
  lists?: Array<{ id: string; name: string }>;
  profile_sample?: number | null;
}

interface KlaviyoStatus {
  connection: {
    external_account_id: string | null;
    external_account_name: string | null;
    metadata: KlaviyoMetadata | null;
    connected_at: string;
    last_synced_at: string | null;
    status: 'active' | 'disconnected' | 'error';
    last_error: string | null;
  } | null;
}

function KlaviyoPanel() {
  const [status, setStatus] = useState<KlaviyoStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConnect, setShowConnect] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/klaviyo');
      if (!res.ok) throw new Error('Failed to load Klaviyo status');
      setStatus(await res.json());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const connect = async () => {
    if (!apiKeyInput.trim().startsWith('pk_')) {
      toast.error('Key should start with "pk_"');
      return;
    }
    setConnecting(true);
    try {
      const res = await fetch('/api/integrations/klaviyo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKeyInput.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to connect');
      toast.success(`Connected to ${body.account.name || 'Klaviyo'}`);
      setShowConnect(false);
      setApiKeyInput('');
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setConnecting(false);
    }
  };

  const syncLists = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/integrations/klaviyo/sync-lists', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Sync failed');
      toast.success(`Synced ${body.lists} list(s)`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const disconnect = async () => {
    if (!confirm('Disconnect Klaviyo?')) return;
    try {
      const res = await fetch('/api/integrations/klaviyo', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      toast.success('Klaviyo disconnected');
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  const connected = !!status?.connection && status.connection.status === 'active';
  const listCount = status?.connection?.metadata?.lists?.length ?? 0;

  return (
    <div className={cn(
      'bg-seat-card border rounded-xl p-5',
      connected ? 'border-green-500/30' : 'border-seat-border'
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm bg-purple-600">
            K
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              Klaviyo
              <span className="text-[10px] bg-seat-red/10 text-seat-red px-2 py-0.5 rounded-full font-medium">LIVE</span>
            </h3>
            <span className="text-[10px] text-zinc-500">Marketing · email + SMS</span>
          </div>
        </div>
        {connected && <Check size={16} className="text-green-400" />}
        {status?.connection?.status === 'error' && <AlertCircle size={16} className="text-red-400" />}
      </div>

      <p className="text-xs text-zinc-400 mb-4">
        Sync your guest segments directly into Klaviyo audiences. Uses your private API key — no OAuth hoops.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Loader2 size={12} className="animate-spin" /> Loading…
        </div>
      ) : connected ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-[10px] text-zinc-500 uppercase">Account</div>
              <div className="text-white font-medium truncate">{status!.connection!.external_account_name || status!.connection!.external_account_id}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase">Lists</div>
              <div className="text-white font-semibold">{listCount}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={syncLists}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-seat-red hover:bg-seat-red/90 disabled:opacity-50 text-white rounded-lg text-xs font-medium"
            >
              <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing…' : 'Sync Lists'}
            </button>
            <button
              onClick={disconnect}
              className="px-3 py-1.5 bg-zinc-800 text-zinc-400 hover:text-red-400 rounded-lg text-xs font-medium"
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : showConnect ? (
        <div className="space-y-3">
          <input
            type="password"
            placeholder="pk_..."
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            className="w-full bg-seat-black border border-seat-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-seat-red"
          />
          <p className="text-[10px] text-zinc-500">
            Get your key from Klaviyo → Account → Settings → API Keys → Private Key.
          </p>
          <div className="flex gap-2">
            <button
              onClick={connect}
              disabled={connecting || !apiKeyInput.trim()}
              className="flex-1 px-3 py-1.5 bg-seat-red hover:bg-seat-red/90 disabled:opacity-50 text-white rounded-lg text-xs font-medium"
            >
              {connecting ? 'Connecting…' : 'Connect'}
            </button>
            <button
              onClick={() => { setShowConnect(false); setApiKeyInput(''); }}
              className="px-3 py-1.5 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg text-xs font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowConnect(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg text-xs font-medium"
        >
          <ExternalLink size={12} />
          Connect Klaviyo
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Twilio (real integration — Account SID + Auth Token)
// ---------------------------------------------------------------------------

interface TwilioNumber { sid: string; phone_number: string; friendly_name: string; sms: boolean }
interface TwilioMetadata { numbers?: TwilioNumber[]; account_status?: string }

interface TwilioStatus {
  connection: {
    external_account_id: string | null;
    external_account_name: string | null;
    metadata: TwilioMetadata | null;
    connected_at: string;
    last_synced_at: string | null;
    status: 'active' | 'disconnected' | 'error';
    last_error: string | null;
  } | null;
}

function TwilioPanel() {
  const [status, setStatus] = useState<TwilioStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConnect, setShowConnect] = useState(false);
  const [sidInput, setSidInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState('');

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/twilio');
      if (!res.ok) throw new Error('Failed to load Twilio status');
      setStatus(await res.json());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const connect = async () => {
    setConnecting(true);
    try {
      const res = await fetch('/api/integrations/twilio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_sid: sidInput.trim(), auth_token: tokenInput.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to connect');
      toast.success(`Connected · ${body.numbers} phone number(s)`);
      setShowConnect(false);
      setSidInput('');
      setTokenInput('');
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setConnecting(false);
    }
  };

  const sendTest = async () => {
    const from = status?.connection?.metadata?.numbers?.[0]?.phone_number;
    if (!from) { toast.error('No SMS-capable number on this account'); return; }
    if (!testTo.trim()) { toast.error('Enter a destination number'); return; }
    setTesting(true);
    try {
      const res = await fetch('/api/integrations/twilio/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: testTo.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Send failed');
      toast.success(`Sent · ${body.status} · ${body.sid.slice(0, 10)}…`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setTesting(false);
    }
  };

  const disconnect = async () => {
    if (!confirm('Disconnect Twilio?')) return;
    try {
      const res = await fetch('/api/integrations/twilio', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      toast.success('Twilio disconnected');
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  const connected = !!status?.connection && status.connection.status === 'active';
  const numbers = status?.connection?.metadata?.numbers ?? [];
  const smsNumbers = numbers.filter((n) => n.sms);

  return (
    <div className={cn(
      'bg-seat-card border rounded-xl p-5',
      connected ? 'border-green-500/30' : 'border-seat-border'
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm bg-red-500">T</div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              Twilio
              <span className="text-[10px] bg-seat-red/10 text-seat-red px-2 py-0.5 rounded-full font-medium">LIVE</span>
            </h3>
            <span className="text-[10px] text-zinc-500">SMS · campaigns + notifications</span>
          </div>
        </div>
        {connected && <Check size={16} className="text-green-400" />}
        {status?.connection?.status === 'error' && <AlertCircle size={16} className="text-red-400" />}
      </div>

      <p className="text-xs text-zinc-400 mb-4">
        Paste your Twilio Account SID + Auth Token. We&apos;ll pull your phone numbers so campaigns can fire.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Loader2 size={12} className="animate-spin" /> Loading…
        </div>
      ) : connected ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-[10px] text-zinc-500 uppercase">Account</div>
              <div className="text-white font-medium truncate">{status!.connection!.external_account_name}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase">SMS Numbers</div>
              <div className="text-white font-semibold">{smsNumbers.length}</div>
            </div>
          </div>
          {smsNumbers[0] && (
            <div className="bg-seat-black border border-seat-border rounded p-2 text-[11px]">
              <span className="text-zinc-500">Sender:</span>{' '}
              <span className="text-white font-mono">{smsNumbers[0].phone_number}</span>
            </div>
          )}
          <div className="space-y-2">
            <input
              type="tel"
              placeholder="+15551234567 — your phone to test"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              className="w-full bg-seat-black border border-seat-border rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-zinc-600"
            />
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={sendTest}
                disabled={testing || smsNumbers.length === 0}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-seat-red hover:bg-seat-red/90 disabled:opacity-50 text-white rounded-lg text-xs font-medium"
              >
                {testing ? 'Sending…' : 'Send test SMS'}
              </button>
              <button
                onClick={disconnect}
                className="px-3 py-1.5 bg-zinc-800 text-zinc-400 hover:text-red-400 rounded-lg text-xs font-medium"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      ) : showConnect ? (
        <div className="space-y-3">
          <input
            placeholder="Account SID (AC...)"
            value={sidInput}
            onChange={(e) => setSidInput(e.target.value)}
            className="w-full bg-seat-black border border-seat-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600"
          />
          <input
            type="password"
            placeholder="Auth Token"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            className="w-full bg-seat-black border border-seat-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600"
          />
          <p className="text-[10px] text-zinc-500">
            Find both at the top of https://console.twilio.com. Auth Token is behind an &quot;eye&quot; icon.
          </p>
          <div className="flex gap-2">
            <button
              onClick={connect}
              disabled={connecting || !sidInput.trim() || !tokenInput.trim()}
              className="flex-1 px-3 py-1.5 bg-seat-red hover:bg-seat-red/90 disabled:opacity-50 text-white rounded-lg text-xs font-medium"
            >
              {connecting ? 'Connecting…' : 'Connect'}
            </button>
            <button
              onClick={() => { setShowConnect(false); setSidInput(''); setTokenInput(''); }}
              className="px-3 py-1.5 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg text-xs font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowConnect(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-seat-red hover:bg-seat-red/90 text-white rounded-lg text-xs font-medium"
        >
          <ExternalLink size={12} /> Connect Twilio
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Static placeholders for the rest (coming soon)
// ---------------------------------------------------------------------------

interface Integration {
  id: string;
  name: string;
  category: string;
  description: string;
  logo_letter: string;
  color: string;
}

const PLACEHOLDERS: Integration[] = [
  { id: 'toast', name: 'Toast POS', category: 'POS', description: 'Sync transactions, menu items, and guest data from Toast', logo_letter: 'T', color: 'bg-orange-500' },
  { id: 'clover', name: 'Clover POS', category: 'POS', description: 'Connect your Clover terminal for real-time data sync', logo_letter: 'C', color: 'bg-green-600' },
  { id: 'resy', name: 'Resy', category: 'Reservations', description: 'Sync reservation data and guest profiles', logo_letter: 'R', color: 'bg-blue-600' },
  { id: 'opentable', name: 'OpenTable', category: 'Reservations', description: 'Import reservations and diner preferences', logo_letter: 'O', color: 'bg-red-600' },
  { id: 'doordash', name: 'DoorDash', category: 'Delivery', description: 'Manage DoorDash orders and track delivery metrics', logo_letter: 'D', color: 'bg-red-600' },
  { id: 'ubereats', name: 'Uber Eats', category: 'Delivery', description: 'Sync Uber Eats orders and revenue data', logo_letter: 'U', color: 'bg-emerald-600' },
  { id: 'grubhub', name: 'Grubhub', category: 'Delivery', description: 'Connect Grubhub for order management', logo_letter: 'G', color: 'bg-orange-600' },
  { id: 'quickbooks', name: 'QuickBooks', category: 'Accounting', description: 'Export financial data to QuickBooks', logo_letter: 'Q', color: 'bg-green-500' },
  { id: 'xero', name: 'Xero', category: 'Accounting', description: 'Sync revenue and expense data with Xero', logo_letter: 'X', color: 'bg-blue-400' },
];

function PlaceholderCard({ integration }: { integration: Integration }) {
  const [requested, setRequested] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const request = async () => {
    if (requested) return;
    setRequesting(true);
    try {
      const res = await fetch('/api/integration-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: integration.id, provider_name: integration.name }),
      });
      if (!res.ok) throw new Error(await res.text());
      setRequested(true);
      toast.success(`We'll ping you when ${integration.name} is live`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="bg-seat-card border border-seat-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm', integration.color)}>
            {integration.logo_letter}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{integration.name}</h3>
            <span className="text-[10px] text-zinc-500">{integration.category}</span>
          </div>
        </div>
      </div>
      <p className="text-xs text-zinc-400 mb-4">{integration.description}</p>
      <button
        onClick={request}
        disabled={requested || requesting}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
          requested
            ? 'bg-green-500/10 text-green-400'
            : 'bg-zinc-800 text-zinc-400 hover:bg-seat-red hover:text-white'
        )}
      >
        {requested ? (
          <><Check size={12} /> Requested — we&apos;ll email you</>
        ) : requesting ? (
          <>Requesting…</>
        ) : (
          <>Request this integration →</>
        )}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function IntegrationsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [catFilter, setCatFilter] = useState('all');

  // Handle OAuth redirect callbacks (?connected=square, ?error=...)
  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    const detail = searchParams.get('detail');
    if (connected === 'square') {
      toast.success('Square connected!');
      router.replace('/dashboard/settings/integrations');
    } else if (error) {
      toast.error(`Connect failed: ${error}${detail ? ` (${decodeURIComponent(detail)})` : ''}`);
      router.replace('/dashboard/settings/integrations');
    }
  }, [searchParams, router]);

  const categories = Array.from(new Set(['POS', 'Marketing', 'Communication', ...PLACEHOLDERS.map(i => i.category)]));
  const filtered = catFilter === 'all' ? PLACEHOLDERS : PLACEHOLDERS.filter(i => i.category === catFilter);
  const showSquare = catFilter === 'all' || catFilter === 'POS';
  const showKlaviyo = catFilter === 'all' || catFilter === 'Marketing';
  const showTwilio = catFilter === 'all' || catFilter === 'Communication';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
          <Plug className="w-5 h-5 text-seat-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Integrations</h1>
          <p className="text-sm text-zinc-500">3 live · {PLACEHOLDERS.length} coming</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setCatFilter('all')}
          className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            catFilter === 'all' ? 'bg-seat-red text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white')}>
          All ({PLACEHOLDERS.length + 3})
        </button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setCatFilter(cat)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              catFilter === cat ? 'bg-seat-red text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white')}>
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {showSquare && <SquarePanel />}
        {showKlaviyo && <KlaviyoPanel />}
        {showTwilio && <TwilioPanel />}
        {filtered.map(i => <PlaceholderCard key={i.id} integration={i} />)}
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-500">Loading…</div>}>
      <IntegrationsInner />
    </Suspense>
  );
}
