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

interface Shift {
  id: string;
  staff_name: string;
  role: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'no_show';
  notes: string;
}

function generateMockSchedule(restaurantId: string): Shift[] {
  const roles = ['Server', 'Host', 'Bartender', 'Line Cook', 'Sous Chef', 'Dishwasher', 'Manager'];
  const names = ['Alex M.', 'Jordan T.', 'Sam R.', 'Casey L.', 'Morgan B.', 'Taylor K.', 'Riley D.', 'Jamie P.'];
  const shifts: Shift[] = [];

  const today = new Date();
  for (let dayOffset = -3; dayOffset <= 10; dayOffset++) {
    const date = new Date(today.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    const staffCount = 4 + Math.floor(Math.random() * 4);

    for (let s = 0; s < staffCount; s++) {
      const isAM = Math.random() > 0.5;
      shifts.push({
        id: `${restaurantId}-shift-${dayOffset}-${s}`,
        staff_name: names[s % names.length],
        role: roles[s % roles.length],
        date: dateStr,
        start_time: isAM ? '08:00' : '16:00',
        end_time: isAM ? '16:00' : '23:00',
        status: dayOffset < 0 ? 'completed' : dayOffset === 0 ? 'confirmed' : 'scheduled',
        notes: '',
      });
    }
  }

  return shifts;
}

export async function GET(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const params = request.nextUrl.searchParams;
  const week = params.get('week'); // YYYY-MM-DD of week start

  const allShifts = generateMockSchedule(restaurant.restaurant_id);

  let filtered = allShifts;
  if (week) {
    const weekStart = new Date(week);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    filtered = allShifts.filter(s => {
      const d = new Date(s.date);
      return d >= weekStart && d < weekEnd;
    });
  }

  // Stats
  const today = new Date().toISOString().split('T')[0];
  const todayShifts = allShifts.filter(s => s.date === today);
  const thisWeekShifts = allShifts.filter(s => {
    const d = new Date(s.date);
    const now = new Date();
    const startOfWeek = new Date(now.getTime() - now.getDay() * 24 * 60 * 60 * 1000);
    const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
    return d >= startOfWeek && d < endOfWeek;
  });

  const uniqueStaff = Array.from(new Set(allShifts.map(s => s.staff_name)));
  const totalHoursThisWeek = thisWeekShifts.reduce((sum, s) => {
    const start = parseInt(s.start_time.split(':')[0]);
    const end = parseInt(s.end_time.split(':')[0]);
    return sum + (end > start ? end - start : 24 - start + end);
  }, 0);

  return NextResponse.json({
    shifts: filtered,
    stats: {
      today_shifts: todayShifts.length,
      week_shifts: thisWeekShifts.length,
      total_staff: uniqueStaff.length,
      hours_scheduled: totalHoursThisWeek,
    },
  });
}

export async function POST(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();
  const { staff_name, role, date, start_time, end_time, notes } = body;

  if (!staff_name || !role || !date || !start_time || !end_time) {
    return NextResponse.json({ error: 'All fields required' }, { status: 400 });
  }

  const shift: Shift = {
    id: `${restaurant.restaurant_id}-shift-${Date.now()}`,
    staff_name,
    role,
    date,
    start_time,
    end_time,
    status: 'scheduled',
    notes: notes || '',
  };

  return NextResponse.json(shift, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  return NextResponse.json({ ...body, updated_at: new Date().toISOString() });
}

export async function DELETE(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  return NextResponse.json({ deleted: true, id: body.id });
}
