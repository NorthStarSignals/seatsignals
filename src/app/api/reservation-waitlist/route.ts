import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// --- Mock Data: Tonight's Reservations ---

const mockReservations = [
  {
    id: 'res-001',
    guest_name: 'Marcus & Elena Rivera',
    party_size: 4,
    time: '17:30',
    status: 'seated' as const,
    table_number: 12,
    notes: 'Anniversary dinner, champagne on arrival',
  },
  {
    id: 'res-002',
    guest_name: 'James Whitfield',
    party_size: 2,
    time: '18:00',
    status: 'confirmed' as const,
    table_number: 7,
    notes: 'Allergic to shellfish',
  },
  {
    id: 'res-003',
    guest_name: 'Sophia Chen',
    party_size: 6,
    time: '18:00',
    status: 'confirmed' as const,
    table_number: 21,
    notes: 'Birthday party, cake arriving at 19:30',
  },
  {
    id: 'res-004',
    guest_name: 'David & Maria Torres',
    party_size: 2,
    time: '18:30',
    status: 'no_show' as const,
    table_number: 3,
    notes: 'VIP regulars - 3rd no-show this month',
  },
  {
    id: 'res-005',
    guest_name: 'Angela Brooks',
    party_size: 3,
    time: '19:00',
    status: 'confirmed' as const,
    table_number: 9,
    notes: null,
  },
  {
    id: 'res-006',
    guest_name: 'Robert Kim',
    party_size: 8,
    time: '19:00',
    status: 'confirmed' as const,
    table_number: 25,
    notes: 'Corporate dinner, separate checks',
  },
  {
    id: 'res-007',
    guest_name: 'Patricia Hall',
    party_size: 2,
    time: '19:30',
    status: 'cancelled' as const,
    table_number: 5,
    notes: 'Cancelled 2 hours before',
  },
  {
    id: 'res-008',
    guest_name: 'Michael & Janet Adams',
    party_size: 4,
    time: '20:00',
    status: 'confirmed' as const,
    table_number: 14,
    notes: 'Prefer booth seating',
  },
  {
    id: 'res-009',
    guest_name: 'Lisa Nakamura',
    party_size: 5,
    time: '20:00',
    status: 'confirmed' as const,
    table_number: 18,
    notes: 'Vegetarian menu requested',
  },
  {
    id: 'res-010',
    guest_name: 'William Foster',
    party_size: 2,
    time: '20:30',
    status: 'confirmed' as const,
    table_number: 6,
    notes: 'First time guest via OpenTable',
  },
  {
    id: 'res-011',
    guest_name: 'Sandra Mitchell',
    party_size: 3,
    time: '21:00',
    status: 'confirmed' as const,
    table_number: 11,
    notes: null,
  },
];

// --- Mock Data: Live Waitlist ---

const mockWaitlist = [
  {
    id: 'wl-001',
    guest_name: 'Thomas Grant',
    party_size: 2,
    wait_time_min: 34,
    status: 'notified' as const,
    phone: '(555) 234-5678',
    quoted_wait: 25,
  },
  {
    id: 'wl-002',
    guest_name: 'Keisha Williams',
    party_size: 4,
    wait_time_min: 22,
    status: 'waiting' as const,
    phone: '(555) 345-6789',
    quoted_wait: 30,
  },
  {
    id: 'wl-003',
    guest_name: 'Daniel Ortiz',
    party_size: 3,
    wait_time_min: 18,
    status: 'waiting' as const,
    phone: '(555) 456-7890',
    quoted_wait: 35,
  },
  {
    id: 'wl-004',
    guest_name: 'Amanda Clarke',
    party_size: 2,
    wait_time_min: 12,
    status: 'waiting' as const,
    phone: '(555) 567-8901',
    quoted_wait: 30,
  },
  {
    id: 'wl-005',
    guest_name: 'Ray & June Patterson',
    party_size: 6,
    wait_time_min: 8,
    status: 'waiting' as const,
    phone: '(555) 678-9012',
    quoted_wait: 45,
  },
  {
    id: 'wl-006',
    guest_name: 'Irene Vasquez',
    party_size: 2,
    wait_time_min: 45,
    status: 'seated' as const,
    phone: '(555) 789-0123',
    quoted_wait: 40,
  },
  {
    id: 'wl-007',
    guest_name: 'Chris Donovan',
    party_size: 3,
    wait_time_min: 52,
    status: 'left' as const,
    phone: '(555) 890-1234',
    quoted_wait: 35,
  },
];

// --- No-Show Predictions (AI-based on history) ---

const noShowPredictions = [
  {
    reservation_id: 'res-005',
    guest_name: 'Angela Brooks',
    risk_score: 0.72,
    reason: 'Has cancelled 4 of last 6 reservations',
  },
  {
    reservation_id: 'res-010',
    guest_name: 'William Foster',
    risk_score: 0.45,
    reason: 'First-time guest via third-party platform',
  },
  {
    reservation_id: 'res-011',
    guest_name: 'Sandra Mitchell',
    risk_score: 0.31,
    reason: 'Late-evening slot historically sees 30% no-shows',
  },
];

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const activeReservations = mockReservations.filter(
    (r) => r.status !== 'cancelled'
  );
  const seatedReservations = mockReservations.filter(
    (r) => r.status === 'seated'
  );
  const noShows = mockReservations.filter((r) => r.status === 'no_show');
  const activeWaitlist = mockWaitlist.filter(
    (w) => w.status === 'waiting' || w.status === 'notified'
  );
  const totalTables = 30;
  const occupiedTables =
    seatedReservations.length + mockWaitlist.filter((w) => w.status === 'seated').length;

  const waitTimes = activeWaitlist.map((w) => w.wait_time_min);
  const avgWait =
    waitTimes.length > 0
      ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
      : 0;

  return NextResponse.json({
    reservations: mockReservations,
    waitlist: mockWaitlist,
    no_show_predictions: noShowPredictions,
    available_tables: totalTables - occupiedTables,
    upcoming_reservations: activeReservations.filter(
      (r) => r.status === 'confirmed'
    ).length,
    current_waitlist: activeWaitlist.length,
    stats: {
      total_tonight: activeReservations.length,
      seated: seatedReservations.length,
      waiting: activeWaitlist.length,
      no_shows: noShows.length,
      avg_wait_time: avgWait,
    },
  });
}
