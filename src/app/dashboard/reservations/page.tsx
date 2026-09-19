'use client';

import { useState, useEffect, useCallback } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import {
  CalendarDays,
  Clock,
  Users,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  AlertTriangle,
  Check,
  UserX,
  Armchair,
} from 'lucide-react';
import toast from 'react-hot-toast';

// --- Types ---

interface Reservation {
  id: string;
  customer_id: string | null;
  date: string;
  time: string;
  party_size: number;
  table_number: number | null;
  status: 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no-show';
  notes: string | null;
  special_requests: string | null;
  customers?: { first_name: string; email: string; phone: string | null } | null;
}

interface ReservationStats {
  total_today: number;
  seated_pct: number;
  no_show_rate: number;
  avg_party_size: number;
}

interface CustomerResult {
  customer_id: string;
  first_name: string;
  email: string;
  phone: string | null;
}

// --- Status Helpers ---

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  seated: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  completed: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
  cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
  'no-show': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[status] || STATUS_STYLES.confirmed}`}>
      {status.replace('-', ' ')}
    </span>
  );
}

// --- Time Slots ---

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 11; h <= 22; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`);
    slots.push(`${h.toString().padStart(2, '0')}:30`);
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

// --- Skeleton ---

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-seat-border rounded ${className}`} />;
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-seat-card border border-seat-border rounded-xl p-5">
          <Skeleton className="h-3 w-24 mb-3" />
          <Skeleton className="h-7 w-16 mb-1" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-seat-card border border-seat-border rounded-lg p-4 flex items-center gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-12 ml-auto" />
        </div>
      ))}
    </div>
  );
}

// --- New Reservation Modal ---

function NewReservationModal({
  onClose,
  onCreated,
  selectedDate,
}: {
  onClose: () => void;
  onCreated: () => void;
  selectedDate: string;
}) {
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<CustomerResult[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [date, setDate] = useState(selectedDate);
  const [time, setTime] = useState('18:00');
  const [partySize, setPartySize] = useState(2);
  const [notes, setNotes] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const searchCustomers = useCallback(async (q: string) => {
    if (q.length < 2) {
      setCustomers([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(q)}`);
      const data = await res.json();
      setCustomers((data.customers || []).slice(0, 8));
    } catch {
      // silent fail on search
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchCustomers(customerSearch), 300);
    return () => clearTimeout(timer);
  }, [customerSearch, searchCustomers]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: selectedCustomer?.customer_id || null,
          date,
          time,
          party_size: partySize,
          notes: notes || null,
          special_requests: specialRequests || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create reservation');
      }

      toast.success('Reservation created');
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create reservation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-seat-card border border-seat-border rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-seat-border">
          <h2 className="text-lg font-semibold text-white">New Reservation</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Customer Search */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Customer</label>
            {selectedCustomer ? (
              <div className="flex items-center justify-between bg-seat-black border border-seat-border rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm text-white">{selectedCustomer.first_name}</p>
                  <p className="text-xs text-zinc-500">{selectedCustomer.email}</p>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search by name, email, or phone..."
                  className="w-full bg-seat-black border border-seat-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-seat-red"
                />
                {(customers.length > 0 || searching) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-seat-card border border-seat-border rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                    {searching ? (
                      <div className="p-3 text-xs text-zinc-500">Searching...</div>
                    ) : (
                      customers.map((c) => (
                        <button
                          key={c.customer_id}
                          onClick={() => {
                            setSelectedCustomer(c);
                            setCustomerSearch('');
                            setCustomers([]);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-seat-black transition-colors"
                        >
                          <p className="text-sm text-white">{c.first_name}</p>
                          <p className="text-xs text-zinc-500">{c.email}{c.phone ? ` / ${c.phone}` : ''}</p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-seat-black border border-seat-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-seat-red [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Time</label>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-seat-black border border-seat-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-seat-red"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Party Size */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Party Size</label>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((size) => (
                <button
                  key={size}
                  onClick={() => setPartySize(size)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                    partySize === size
                      ? 'bg-seat-red text-white'
                      : 'bg-seat-black border border-seat-border text-zinc-400 hover:text-white hover:border-zinc-600'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes..."
              className="w-full bg-seat-black border border-seat-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-seat-red"
            />
          </div>

          {/* Special Requests */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Special Requests</label>
            <textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Dietary needs, celebrations, seating preference..."
              rows={2}
              className="w-full bg-seat-black border border-seat-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-seat-red resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-seat-border">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm text-zinc-400 border border-seat-border rounded-lg hover:text-white hover:border-zinc-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !date || !time}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-seat-red rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating...' : 'Create Reservation'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Calendar Grid View ---

function CalendarGrid({ reservations, timeSlots }: { reservations: Reservation[]; timeSlots: string[] }) {
  // Group reservations by time slot
  const byTime = new Map<string, Reservation[]>();
  for (const r of reservations) {
    const slot = r.time;
    if (!byTime.has(slot)) byTime.set(slot, []);
    byTime.get(slot)!.push(r);
  }

  return (
    <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-seat-border">
        <h3 className="text-sm font-medium text-white">Time Slot View</h3>
      </div>
      <div className="divide-y divide-seat-border max-h-[500px] overflow-y-auto">
        {timeSlots.map((slot) => {
          const slotReservations = byTime.get(slot) || [];
          const activeCount = slotReservations.filter(
            (r) => r.status !== 'cancelled' && r.status !== 'no-show'
          ).length;

          return (
            <div key={slot} className="flex items-start gap-4 px-4 py-3">
              <div className="w-14 shrink-0">
                <p className="text-sm font-medium text-zinc-300">{slot}</p>
              </div>
              <div className="flex-1 min-w-0">
                {slotReservations.length === 0 ? (
                  <p className="text-xs text-zinc-600">No reservations</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {slotReservations.map((r) => (
                      <div
                        key={r.id}
                        className={`px-2.5 py-1 rounded-md text-xs border ${STATUS_STYLES[r.status]}`}
                      >
                        <span className="font-medium">
                          {r.customers?.first_name || 'Walk-in'}
                        </span>
                        <span className="opacity-70 ml-1">({r.party_size}p, T{r.table_number})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="shrink-0">
                {activeCount > 0 && (
                  <span className="text-xs text-zinc-500">{activeCount} res.</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Main Page ---

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState<ReservationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchReservations = useCallback(async () => {
    try {
      const params = new URLSearchParams({ date: selectedDate });
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/reservations?${params}`);
      const data = await res.json();

      if (res.ok) {
        setReservations(data.reservations || []);
        setStats(data.stats || null);
      } else {
        toast.error(data.error || 'Failed to load reservations');
      }
    } catch {
      toast.error('Failed to load reservations');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, statusFilter]);

  useEffect(() => {
    setLoading(true);
    fetchReservations();
  }, [fetchReservations]);

  const handleQuickAction = async (id: string, status: string) => {
    setActionLoading(id);
    try {
      const res = await fetch('/api/reservations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      toast.success(`Reservation marked as ${status}`);
      fetchReservations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const navigateDate = (direction: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + direction);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const activeReservations = reservations.filter(
    (r) => r.status !== 'cancelled'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Reservations</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage bookings, seating, and walk-ins
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-seat-red rounded-lg hover:bg-red-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Reservation
        </button>
      </div>

      {/* Stats */}
      {loading ? (
        <StatsSkeleton />
      ) : stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Today's Reservations"
            value={stats.total_today}
            subtitle={isToday ? 'Total bookings today' : `Bookings for ${selectedDate}`}
            icon={<CalendarDays className="w-4 h-4" />}
          />
          <MetricCard
            title="Seated Rate"
            value={`${stats.seated_pct}%`}
            subtitle="Confirmed guests seated"
            icon={<Armchair className="w-4 h-4" />}
          />
          <MetricCard
            title="No-Show Rate"
            value={`${stats.no_show_rate}%`}
            subtitle="Guests who didn't arrive"
            icon={<AlertTriangle className="w-4 h-4" />}
          />
          <MetricCard
            title="Avg Party Size"
            value={stats.avg_party_size}
            subtitle="Average covers per reservation"
            icon={<Users className="w-4 h-4" />}
          />
        </div>
      ) : null}

      {/* Date Navigation + Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateDate(-1)}
            className="p-2 rounded-lg border border-seat-border text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 px-3 py-2 bg-seat-card border border-seat-border rounded-lg">
            <CalendarDays className="w-4 h-4 text-zinc-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm text-white focus:outline-none [color-scheme:dark]"
            />
          </div>
          <button
            onClick={() => navigateDate(1)}
            className="p-2 rounded-lg border border-seat-border text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {!isToday && (
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="px-3 py-2 text-xs font-medium text-seat-red border border-seat-red/30 rounded-lg hover:bg-seat-red/10 transition-colors"
            >
              Today
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-seat-card border border-seat-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-seat-red"
          >
            <option value="">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="seated">Seated</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no-show">No-show</option>
          </select>
        </div>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <TableSkeleton />
      ) : (
        <CalendarGrid reservations={activeReservations} timeSlots={TIME_SLOTS} />
      )}

      {/* Reservations List */}
      <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-seat-border flex items-center justify-between">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-500" />
            {isToday ? "Today's" : selectedDate} Reservations
            <span className="text-xs text-zinc-500 font-normal">({reservations.length})</span>
          </h3>
        </div>

        {loading ? (
          <div className="p-4">
            <TableSkeleton />
          </div>
        ) : reservations.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDays className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500 mb-1">No reservations found</p>
            <p className="text-xs text-zinc-600">
              {statusFilter
                ? 'Try changing the status filter'
                : 'Click "New Reservation" to add one'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-seat-border">
            {reservations.map((r) => (
              <div
                key={r.id}
                className="px-4 py-3 flex items-center gap-4 hover:bg-seat-black/30 transition-colors"
              >
                {/* Time */}
                <div className="w-14 shrink-0">
                  <p className="text-sm font-medium text-white">{r.time}</p>
                </div>

                {/* Guest Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">
                    {r.customers?.first_name || 'Walk-in Guest'}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">
                    {r.customers?.phone || r.customers?.email || 'No contact info'}
                    {r.special_requests && (
                      <span className="ml-2 text-amber-400">* {r.special_requests}</span>
                    )}
                  </p>
                </div>

                {/* Party size + table */}
                <div className="hidden sm:flex items-center gap-3 shrink-0">
                  <span className="text-xs text-zinc-400 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {r.party_size}
                  </span>
                  {r.table_number && (
                    <span className="text-xs text-zinc-500">T{r.table_number}</span>
                  )}
                </div>

                {/* Status */}
                <div className="shrink-0">
                  <StatusBadge status={r.status} />
                </div>

                {/* Quick Actions */}
                <div className="shrink-0 flex items-center gap-1">
                  {r.status === 'confirmed' && (
                    <>
                      <button
                        onClick={() => handleQuickAction(r.id, 'seated')}
                        disabled={actionLoading === r.id}
                        title="Seat guest"
                        className="p-1.5 rounded-md text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                      >
                        <Armchair className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleQuickAction(r.id, 'no-show')}
                        disabled={actionLoading === r.id}
                        title="Mark as no-show"
                        className="p-1.5 rounded-md text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-50"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {r.status === 'seated' && (
                    <button
                      onClick={() => handleQuickAction(r.id, 'completed')}
                      disabled={actionLoading === r.id}
                      title="Complete"
                      className="p-1.5 rounded-md text-zinc-400 hover:bg-zinc-500/10 transition-colors disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Reservation Modal */}
      {showModal && (
        <NewReservationModal
          selectedDate={selectedDate}
          onClose={() => setShowModal(false)}
          onCreated={fetchReservations}
        />
      )}
    </div>
  );
}
