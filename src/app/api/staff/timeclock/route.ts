import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

interface TimeEntry {
  id: string;
  employee_name: string;
  role: string;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  total_hours: number | null;
  status: 'clocked_in' | 'on_break' | 'clocked_out';
  date: string;
}

function generateMockEntries(): TimeEntry[] {
  const employees = [
    { name: 'Sarah Chen', role: 'Server' },
    { name: 'Marcus Johnson', role: 'Bartender' },
    { name: 'Emily Rodriguez', role: 'Host' },
    { name: 'David Kim', role: 'Server' },
    { name: 'Jessica Taylor', role: 'Line Cook' },
    { name: 'Mike Brown', role: 'Sous Chef' },
    { name: 'Ashley Williams', role: 'Server' },
    { name: 'Chris Martinez', role: 'Dishwasher' },
    { name: 'Nicole Lee', role: 'Bartender' },
    { name: 'James Wilson', role: 'Expo' },
  ];

  const today = new Date().toISOString().split('T')[0];
  const entries: TimeEntry[] = [];

  // Today's active shifts
  employees.slice(0, 6).forEach((emp, i) => {
    const clockInHour = 8 + Math.floor(i * 1.5);
    const clockIn = new Date();
    clockIn.setHours(clockInHour, Math.floor(Math.random() * 30), 0);

    const isOut = i < 2;
    const isBreak = i === 3;
    let clockOut: Date | null = null;
    let totalHours: number | null = null;

    if (isOut) {
      clockOut = new Date(clockIn);
      clockOut.setHours(clockInHour + 6 + Math.floor(Math.random() * 3));
      totalHours = parseFloat(((clockOut.getTime() - clockIn.getTime()) / 3600000).toFixed(2));
    }

    entries.push({
      id: `tc-${i + 1}`,
      employee_name: emp.name,
      role: emp.role,
      clock_in: clockIn.toISOString(),
      clock_out: clockOut?.toISOString() || null,
      break_minutes: isOut ? 30 : isBreak ? 15 : 0,
      total_hours: totalHours,
      status: isOut ? 'clocked_out' : isBreak ? 'on_break' : 'clocked_in',
      date: today,
    });
  });

  // Yesterday's entries
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yDate = yesterday.toISOString().split('T')[0];

  employees.forEach((emp, i) => {
    const clockIn = new Date(yesterday);
    clockIn.setHours(9 + (i % 4) * 2, Math.floor(Math.random() * 30), 0);
    const clockOut = new Date(clockIn);
    clockOut.setHours(clockIn.getHours() + 5 + Math.floor(Math.random() * 4));
    const hrs = parseFloat(((clockOut.getTime() - clockIn.getTime()) / 3600000).toFixed(2));

    entries.push({
      id: `tc-y-${i + 1}`,
      employee_name: emp.name,
      role: emp.role,
      clock_in: clockIn.toISOString(),
      clock_out: clockOut.toISOString(),
      break_minutes: 30,
      total_hours: hrs,
      status: 'clocked_out',
      date: yDate,
    });
  });

  return entries;
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const entries = generateMockEntries();
  const today = new Date().toISOString().split('T')[0];
  const todayEntries = entries.filter(e => e.date === today);

  const clockedIn = todayEntries.filter(e => e.status === 'clocked_in').length;
  const onBreak = todayEntries.filter(e => e.status === 'on_break').length;
  const clockedOut = todayEntries.filter(e => e.status === 'clocked_out').length;
  const totalHoursToday = todayEntries
    .filter(e => e.total_hours)
    .reduce((s, e) => s + (e.total_hours || 0), 0);

  // Active employees currently working
  const activeEntries = todayEntries.filter(e => e.status !== 'clocked_out').map(e => {
    const elapsed = (Date.now() - new Date(e.clock_in).getTime()) / 3600000;
    return { ...e, elapsed_hours: parseFloat(elapsed.toFixed(2)) };
  });

  return NextResponse.json({
    entries,
    today_entries: todayEntries,
    active: activeEntries,
    stats: {
      clocked_in: clockedIn,
      on_break: onBreak,
      clocked_out: clockedOut,
      total_hours_today: parseFloat(totalHoursToday.toFixed(1)),
      active_now: clockedIn + onBreak,
    },
  });
}

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { employee_name, role, action } = body;

  if (action === 'clock_in') {
    return NextResponse.json({
      id: Date.now().toString(),
      employee_name,
      role,
      clock_in: new Date().toISOString(),
      clock_out: null,
      break_minutes: 0,
      total_hours: null,
      status: 'clocked_in',
      date: new Date().toISOString().split('T')[0],
    });
  }

  return NextResponse.json({ success: true });
}

export async function PUT(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  return NextResponse.json({ ...body, updated: true });
}
