'use client';

import { useState, useEffect, useMemo } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  CreditCard,
  DollarSign,
  Gift,
  Search,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  Copy,
  Ban,
  CheckCircle,
  Clock,
  AlertTriangle,
  ShieldX,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────

interface GiftCard {
  id: string;
  restaurant_id: string;
  code: string;
  initial_balance: number;
  current_balance: number;
  purchaser_name: string;
  purchaser_email: string;
  recipient_name: string;
  recipient_email: string;
  status: 'active' | 'redeemed' | 'expired' | 'deactivated';
  issued_at: string;
  expires_at: string;
  last_used_at: string | null;
}

interface Stats {
  total_sold: number;
  total_sold_value: number;
  outstanding_balance: number;
  redeemed_value: number;
  active_cards: number;
}

// ── Helpers ─────────────────────────────────────────────────────────

function maskCode(code: string): string {
  if (code.length <= 4) return code;
  return '\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 ' + code.slice(-4);
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'active':
      return { label: 'Active', className: 'text-emerald-400 bg-emerald-500/10', icon: CheckCircle };
    case 'redeemed':
      return { label: 'Redeemed', className: 'text-blue-400 bg-blue-500/10', icon: Gift };
    case 'expired':
      return { label: 'Expired', className: 'text-amber-400 bg-amber-500/10', icon: Clock };
    case 'deactivated':
      return { label: 'Deactivated', className: 'text-red-400 bg-red-500/10', icon: ShieldX };
    default:
      return { label: status, className: 'text-zinc-400 bg-zinc-500/10', icon: AlertTriangle };
  }
}

// ── Page ────────────────────────────────────────────────────────────

export default function GiftCardsPage() {
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_sold: 0,
    total_sold_value: 0,
    outstanding_balance: 0,
    redeemed_value: 0,
    active_cards: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [formAmount, setFormAmount] = useState('');
  const [formPurchaserName, setFormPurchaserName] = useState('');
  const [formPurchaserEmail, setFormPurchaserEmail] = useState('');
  const [formRecipientName, setFormRecipientName] = useState('');
  const [formRecipientEmail, setFormRecipientEmail] = useState('');
  const [formExpiry, setFormExpiry] = useState('');

  async function fetchData() {
    try {
      const res = await fetch('/api/gift-cards');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setGiftCards(data.giftCards || []);
      setStats(data.stats || stats);
    } catch {
      toast.error('Failed to load gift card data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function resetForm() {
    setFormAmount('');
    setFormPurchaserName('');
    setFormPurchaserEmail('');
    setFormRecipientName('');
    setFormRecipientEmail('');
    setFormExpiry('');
  }

  async function handleIssue() {
    if (!formAmount || !formPurchaserName || !formPurchaserEmail) {
      toast.error('Please fill in amount, purchaser name, and email');
      return;
    }

    if (Number(formAmount) <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    try {
      const res = await fetch('/api/gift-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initial_balance: Number(formAmount),
          purchaser_name: formPurchaserName,
          purchaser_email: formPurchaserEmail,
          recipient_name: formRecipientName || undefined,
          recipient_email: formRecipientEmail || undefined,
          expires_at: formExpiry ? new Date(formExpiry).toISOString() : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to issue gift card');
      }

      toast.success('Gift card issued successfully');
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to issue gift card');
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm('Deactivate this gift card? The remaining balance will be voided.')) return;

    try {
      const res = await fetch('/api/gift-cards', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error('Failed to deactivate');
      toast.success('Gift card deactivated');
      fetchData();
    } catch {
      toast.error('Failed to deactivate gift card');
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      toast.success('Code copied to clipboard');
    }, () => {
      toast.error('Failed to copy code');
    });
  }

  // Filtered cards
  const filteredCards = useMemo(() => {
    let cards = giftCards;

    if (statusFilter !== 'all') {
      cards = cards.filter(gc => gc.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      cards = cards.filter(gc =>
        gc.code.toLowerCase().includes(q) ||
        gc.purchaser_name.toLowerCase().includes(q) ||
        gc.recipient_name.toLowerCase().includes(q) ||
        gc.purchaser_email.toLowerCase().includes(q) ||
        gc.recipient_email.toLowerCase().includes(q)
      );
    }

    return cards;
  }, [giftCards, statusFilter, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-seat-red" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
            <CreditCard className="text-seat-red" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Gift Cards</h1>
            <p className="text-sm text-zinc-500">Issue and manage gift cards for your restaurant</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={16} className="mr-1.5" />
          Issue Gift Card
        </Button>
      </div>

      {/* ── Metric Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Sold"
          value={stats.total_sold}
          subtitle={`${formatCurrency(stats.total_sold_value)} total value`}
          icon={<CreditCard size={18} />}
        />
        <MetricCard
          title="Outstanding Balance"
          value={formatCurrency(stats.outstanding_balance)}
          subtitle="Unredeemed on active cards"
          icon={<DollarSign size={18} />}
        />
        <MetricCard
          title="Redeemed Value"
          value={formatCurrency(stats.redeemed_value)}
          subtitle="Total amount used"
          icon={<Gift size={18} />}
        />
        <MetricCard
          title="Active Cards"
          value={stats.active_cards}
          subtitle={`of ${stats.total_sold} total cards`}
          icon={<CheckCircle size={18} />}
        />
      </div>

      {/* ── Search & Filter ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder="Search by code, name, or email..."
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-seat-card border border-seat-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-seat-red min-w-[140px]"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="redeemed">Redeemed</option>
          <option value="expired">Expired</option>
          <option value="deactivated">Deactivated</option>
        </select>
      </div>

      {/* ── Gift Card Table ─────────────────────────────────────── */}
      <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-seat-border text-xs font-medium text-zinc-500 uppercase tracking-wider">
          <div className="col-span-1" />
          <div className="col-span-3">Code</div>
          <div className="col-span-2">Recipient</div>
          <div className="col-span-2 text-right">Balance</div>
          <div className="col-span-2 text-center">Status</div>
          <div className="col-span-2 text-right">Issued</div>
        </div>

        {/* Table Body */}
        {filteredCards.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <CreditCard className="mx-auto text-zinc-600 mb-3" size={40} />
            <p className="text-zinc-400 font-medium">No gift cards found</p>
            <p className="text-zinc-600 text-sm mt-1">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filter'
                : 'Issue your first gift card to get started'}
            </p>
          </div>
        ) : (
          filteredCards.map((gc) => {
            const isExpanded = expandedId === gc.id;
            const statusConfig = getStatusConfig(gc.status);
            const StatusIcon = statusConfig.icon;
            const usedPct = gc.initial_balance > 0
              ? Math.round(((gc.initial_balance - gc.current_balance) / gc.initial_balance) * 100)
              : 0;

            return (
              <div key={gc.id}>
                {/* Main Row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : gc.id)}
                  className="w-full grid grid-cols-12 gap-2 px-5 py-3.5 items-center hover:bg-zinc-800/30 transition-colors text-left border-b border-zinc-800/50"
                >
                  <div className="col-span-1">
                    {isExpanded ? (
                      <ChevronDown size={14} className="text-zinc-500" />
                    ) : (
                      <ChevronRight size={14} className="text-zinc-500" />
                    )}
                  </div>
                  <div className="col-span-3">
                    <span className="text-sm text-white font-mono">{maskCode(gc.code)}</span>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-white truncate">{gc.recipient_name}</p>
                    <p className="text-xs text-zinc-500 truncate">{gc.recipient_email}</p>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-sm text-white font-medium">{formatCurrency(gc.current_balance)}</p>
                    <p className="text-xs text-zinc-500">of {formatCurrency(gc.initial_balance)}</p>
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${statusConfig.className}`}>
                      <StatusIcon size={10} />
                      {statusConfig.label}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-xs text-zinc-400">{formatDate(gc.issued_at)}</span>
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="bg-zinc-900/40 px-5 py-4 border-b border-zinc-800/50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Card Details */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Card Details</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500 w-16">Code:</span>
                            <span className="text-sm text-white font-mono">{gc.code}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); copyCode(gc.code); }}
                              className="text-zinc-500 hover:text-white transition-colors"
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500 w-16">Initial:</span>
                            <span className="text-sm text-white">{formatCurrency(gc.initial_balance)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500 w-16">Current:</span>
                            <span className="text-sm text-white">{formatCurrency(gc.current_balance)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500 w-16">Used:</span>
                            <div className="flex items-center gap-2 flex-1">
                              <div className="h-1.5 flex-1 bg-zinc-800 rounded-full overflow-hidden max-w-[120px]">
                                <div
                                  className="h-full bg-seat-red rounded-full transition-all"
                                  style={{ width: `${usedPct}%` }}
                                />
                              </div>
                              <span className="text-xs text-zinc-400">{usedPct}%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* People */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">People</h4>
                        <div className="space-y-3">
                          <div>
                            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Purchaser</p>
                            <p className="text-sm text-white">{gc.purchaser_name}</p>
                            <p className="text-xs text-zinc-500">{gc.purchaser_email}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Recipient</p>
                            <p className="text-sm text-white">{gc.recipient_name}</p>
                            <p className="text-xs text-zinc-500">{gc.recipient_email}</p>
                          </div>
                        </div>
                      </div>

                      {/* Dates & Actions */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Dates</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500 w-16">Issued:</span>
                            <span className="text-xs text-zinc-400">{formatDate(gc.issued_at)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500 w-16">Expires:</span>
                            <span className="text-xs text-zinc-400">{formatDate(gc.expires_at)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500 w-16">Last Use:</span>
                            <span className="text-xs text-zinc-400">
                              {gc.last_used_at ? formatDate(gc.last_used_at) : 'Never'}
                            </span>
                          </div>
                        </div>

                        {gc.status === 'active' && (
                          <div className="pt-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeactivate(gc.id); }}
                              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 transition-colors"
                            >
                              <Ban size={12} /> Deactivate Card
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Issue Gift Card Modal ───────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-seat-dark border border-seat-border rounded-2xl w-full max-w-lg shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-seat-border">
              <h3 className="text-white font-semibold">Issue Gift Card</h3>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Amount ($)</label>
                <Input
                  type="number"
                  value={formAmount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormAmount(e.target.value)}
                  placeholder="e.g., 100"
                  min="1"
                  step="0.01"
                />
              </div>

              {/* Purchaser Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Purchaser Name</label>
                  <Input
                    value={formPurchaserName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormPurchaserName(e.target.value)}
                    placeholder="e.g., Sarah Johnson"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Purchaser Email</label>
                  <Input
                    type="email"
                    value={formPurchaserEmail}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormPurchaserEmail(e.target.value)}
                    placeholder="e.g., sarah@email.com"
                  />
                </div>
              </div>

              {/* Recipient Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Recipient Name (optional)</label>
                  <Input
                    value={formRecipientName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormRecipientName(e.target.value)}
                    placeholder="e.g., Mike Johnson"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Recipient Email (optional)</label>
                  <Input
                    type="email"
                    value={formRecipientEmail}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormRecipientEmail(e.target.value)}
                    placeholder="e.g., mike@email.com"
                  />
                </div>
              </div>

              {/* Expiry */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Expiry Date (optional, defaults to 1 year)</label>
                <Input
                  type="date"
                  value={formExpiry}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormExpiry(e.target.value)}
                />
              </div>

              {/* Preview */}
              {formAmount && Number(formAmount) > 0 && (
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Preview</p>
                  <p className="text-sm text-white">
                    {formatCurrency(Number(formAmount))} gift card
                    {formRecipientName ? ` for ${formRecipientName}` : ''}
                    {formPurchaserName ? ` from ${formPurchaserName}` : ''}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-seat-border">
              <Button
                variant="ghost"
                onClick={() => { setShowModal(false); resetForm(); }}
              >
                Cancel
              </Button>
              <Button onClick={handleIssue}>
                Issue Gift Card
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
