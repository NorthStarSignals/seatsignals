import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

async function getRestaurant(supabase: ReturnType<typeof createServerSupabase>, userId: string) {
  const { data } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();
  return data;
}

interface ReportSchedule {
  id: string;
  name: string;
  type: string;
  frequency: string;
  recipients: string[];
  last_sent: string | null;
  next_send: string;
  enabled: boolean;
  format: string;
  created_at: string;
}

function generateMockSchedules(restaurantId: string): ReportSchedule[] {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  return [
    {
      id: `${restaurantId}-rpt-1`,
      name: 'Daily Revenue Summary',
      type: 'revenue',
      frequency: 'daily',
      recipients: ['owner@restaurant.com'],
      last_sent: yesterday.toISOString(),
      next_send: tomorrow.toISOString(),
      enabled: true,
      format: 'pdf',
      created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: `${restaurantId}-rpt-2`,
      name: 'Weekly Customer Insights',
      type: 'customers',
      frequency: 'weekly',
      recipients: ['owner@restaurant.com', 'manager@restaurant.com'],
      last_sent: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      next_send: nextWeek.toISOString(),
      enabled: true,
      format: 'pdf',
      created_at: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: `${restaurantId}-rpt-3`,
      name: 'Monthly Performance Report',
      type: 'performance',
      frequency: 'monthly',
      recipients: ['owner@restaurant.com', 'investor@example.com'],
      last_sent: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
      next_send: nextMonth.toISOString(),
      enabled: true,
      format: 'pdf',
      created_at: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: `${restaurantId}-rpt-4`,
      name: 'Weekly Review Digest',
      type: 'reviews',
      frequency: 'weekly',
      recipients: ['manager@restaurant.com'],
      last_sent: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      next_send: nextWeek.toISOString(),
      enabled: false,
      format: 'email',
      created_at: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: `${restaurantId}-rpt-5`,
      name: 'Daily Inventory Alert',
      type: 'inventory',
      frequency: 'daily',
      recipients: ['kitchen@restaurant.com'],
      last_sent: yesterday.toISOString(),
      next_send: tomorrow.toISOString(),
      enabled: true,
      format: 'email',
      created_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const schedules = generateMockSchedules(restaurant.restaurant_id);

  const stats = {
    total_schedules: schedules.length,
    active: schedules.filter(s => s.enabled).length,
    sent_this_week: schedules.filter(s => {
      if (!s.last_sent) return false;
      const sent = new Date(s.last_sent);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return sent > weekAgo;
    }).length,
    report_types: Array.from(new Set(schedules.map(s => s.type))).length,
  };

  return NextResponse.json({ schedules, stats });
}

export async function POST(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();
  const { name, type, frequency, recipients, format } = body;

  if (!name || !type || !frequency) {
    return NextResponse.json({ error: 'name, type, and frequency are required' }, { status: 400 });
  }

  const now = new Date();
  let nextSend: Date;
  switch (frequency) {
    case 'daily': nextSend = new Date(now.getTime() + 24 * 60 * 60 * 1000); break;
    case 'weekly': nextSend = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); break;
    case 'monthly': nextSend = new Date(now.getFullYear(), now.getMonth() + 1, 1); break;
    default: nextSend = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }

  const newSchedule: ReportSchedule = {
    id: `${restaurant.restaurant_id}-rpt-${Date.now()}`,
    name,
    type,
    frequency,
    recipients: recipients || [],
    last_sent: null,
    next_send: nextSend.toISOString(),
    enabled: true,
    format: format || 'pdf',
    created_at: now.toISOString(),
  };

  return NextResponse.json(newSchedule, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { id, enabled } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  return NextResponse.json({ id, enabled, updated_at: new Date().toISOString() });
}

export async function DELETE(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { id } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  return NextResponse.json({ deleted: true, id });
}
