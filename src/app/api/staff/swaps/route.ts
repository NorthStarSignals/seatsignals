import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

interface SwapRequest {
  id: string;
  requester_name: string;
  requester_role: string;
  original_date: string;
  original_shift: 'morning' | 'afternoon' | 'evening';
  reason: string;
  status: 'open' | 'claimed' | 'approved' | 'denied';
  claimed_by: string | null;
  created_at: string;
  urgency: 'normal' | 'urgent';
}

const mockSwaps: SwapRequest[] = [
  {
    id: 'swap-001',
    requester_name: 'Maria Lopez',
    requester_role: 'Server',
    original_date: '2026-04-10',
    original_shift: 'evening',
    reason: 'Family emergency',
    status: 'open',
    claimed_by: null,
    created_at: '2026-04-07T08:15:00Z',
    urgency: 'urgent',
  },
  {
    id: 'swap-002',
    requester_name: 'James Chen',
    requester_role: 'Bartender',
    original_date: '2026-04-11',
    original_shift: 'evening',
    reason: 'Doctor appointment',
    status: 'claimed',
    claimed_by: 'Tyler Brooks',
    created_at: '2026-04-06T14:30:00Z',
    urgency: 'normal',
  },
  {
    id: 'swap-003',
    requester_name: 'Aisha Patel',
    requester_role: 'Host',
    original_date: '2026-04-09',
    original_shift: 'morning',
    reason: 'Class schedule conflict',
    status: 'approved',
    claimed_by: 'Devon Wright',
    created_at: '2026-04-05T09:00:00Z',
    urgency: 'normal',
  },
  {
    id: 'swap-004',
    requester_name: 'Carlos Rivera',
    requester_role: 'Line Cook',
    original_date: '2026-04-12',
    original_shift: 'morning',
    reason: 'Car trouble — need afternoon to get it fixed',
    status: 'open',
    claimed_by: null,
    created_at: '2026-04-07T06:45:00Z',
    urgency: 'urgent',
  },
  {
    id: 'swap-005',
    requester_name: 'Sophie Turner',
    requester_role: 'Server',
    original_date: '2026-04-13',
    original_shift: 'afternoon',
    reason: 'Wedding rehearsal',
    status: 'open',
    claimed_by: null,
    created_at: '2026-04-06T20:00:00Z',
    urgency: 'normal',
  },
  {
    id: 'swap-006',
    requester_name: 'Marcus Johnson',
    requester_role: 'Sous Chef',
    original_date: '2026-04-08',
    original_shift: 'evening',
    reason: 'Feeling unwell',
    status: 'denied',
    claimed_by: null,
    created_at: '2026-04-04T17:20:00Z',
    urgency: 'urgent',
  },
  {
    id: 'swap-007',
    requester_name: 'Emily Nguyen',
    requester_role: 'Server',
    original_date: '2026-04-14',
    original_shift: 'morning',
    reason: 'Childcare issue',
    status: 'claimed',
    claimed_by: 'Maria Lopez',
    created_at: '2026-04-06T11:10:00Z',
    urgency: 'normal',
  },
  {
    id: 'swap-008',
    requester_name: 'Tyler Brooks',
    requester_role: 'Bartender',
    original_date: '2026-04-15',
    original_shift: 'evening',
    reason: 'Concert tickets (bought months ago)',
    status: 'open',
    claimed_by: null,
    created_at: '2026-04-07T10:30:00Z',
    urgency: 'normal',
  },
  {
    id: 'swap-009',
    requester_name: 'Devon Wright',
    requester_role: 'Host',
    original_date: '2026-04-09',
    original_shift: 'afternoon',
    reason: 'Moving day',
    status: 'approved',
    claimed_by: 'Aisha Patel',
    created_at: '2026-04-03T15:00:00Z',
    urgency: 'normal',
  },
  {
    id: 'swap-010',
    requester_name: 'Rachel Kim',
    requester_role: 'Dishwasher',
    original_date: '2026-04-11',
    original_shift: 'morning',
    reason: 'Personal day',
    status: 'open',
    claimed_by: null,
    created_at: '2026-04-07T07:00:00Z',
    urgency: 'normal',
  },
];

export async function GET() {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // No swaps table yet — will use createServerSupabase() once migrated
  void createServerSupabase;

  const openSwaps = mockSwaps.filter((s) => s.status === 'open').length;
  const pendingApproval = mockSwaps.filter((s) => s.status === 'claimed').length;
  const completedThisWeek = mockSwaps.filter((s) => s.status === 'approved').length;

  return NextResponse.json({
    swaps: mockSwaps,
    stats: {
      open_swaps: openSwaps,
      pending_approval: pendingApproval,
      completed_this_week: completedThisWeek,
    },
  });
}

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { requester_name, requester_role, original_date, original_shift, reason, urgency } = body;

  if (!requester_name || !original_date || !original_shift || !reason) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const newSwap: SwapRequest = {
    id: `swap-${Date.now()}`,
    requester_name,
    requester_role: requester_role || 'Server',
    original_date,
    original_shift,
    reason,
    status: 'open',
    claimed_by: null,
    created_at: new Date().toISOString(),
    urgency: urgency || 'normal',
  };

  return NextResponse.json({ swap: newSwap }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { swap_id, action, claimed_by } = body;

  if (!swap_id || !action) {
    return NextResponse.json({ error: 'Missing swap_id or action' }, { status: 400 });
  }

  const swap = mockSwaps.find((s) => s.id === swap_id);
  if (!swap) {
    return NextResponse.json({ error: 'Swap not found' }, { status: 404 });
  }

  if (action === 'claim') {
    return NextResponse.json({
      swap: { ...swap, status: 'claimed', claimed_by: claimed_by || 'You' },
    });
  }

  if (action === 'approve') {
    return NextResponse.json({
      swap: { ...swap, status: 'approved' },
    });
  }

  if (action === 'deny') {
    return NextResponse.json({
      swap: { ...swap, status: 'denied' },
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
