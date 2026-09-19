import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

interface CashEntry {
  id: string;
  date: string;
  register: string;
  opening_cash: number;
  cash_sales: number;
  cash_tips: number;
  payouts: number;
  expected_closing: number;
  actual_closing: number;
  variance: number;
  status: 'balanced' | 'over' | 'short';
  counted_by: string;
  notes: string;
}

function generateEntries(): CashEntry[] {
  const registers = ['Register 1 (Main)', 'Register 2 (Bar)', 'Register 3 (Patio)'];
  const staff = ['Amanda Foster', 'Marcus Johnson', 'Sarah Chen', 'Emily Rodriguez'];
  const entries: CashEntry[] = [];

  for (let d = 0; d < 7; d++) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    const dateStr = date.toISOString().split('T')[0];

    for (let r = 0; r < (d === 0 ? 3 : 2); r++) {
      const opening = 200 + Math.floor(Math.random() * 100);
      const cashSales = 800 + Math.floor(Math.random() * 1200);
      const cashTips = 50 + Math.floor(Math.random() * 150);
      const payouts = 20 + Math.floor(Math.random() * 80);
      const expected = opening + cashSales + cashTips - payouts;
      const variance = Math.floor((Math.random() - 0.4) * 20);
      const actual = expected + variance;

      entries.push({
        id: `cr-${d}-${r}`,
        date: dateStr,
        register: registers[r],
        opening_cash: opening,
        cash_sales: cashSales,
        cash_tips: cashTips,
        payouts: payouts,
        expected_closing: expected,
        actual_closing: actual,
        variance,
        status: Math.abs(variance) <= 2 ? 'balanced' : variance > 0 ? 'over' : 'short',
        counted_by: staff[Math.floor(Math.random() * staff.length)],
        notes: Math.abs(variance) > 10 ? 'Needs manager review' : '',
      });
    }
  }

  return entries;
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const entries = generateEntries();
  const today = new Date().toISOString().split('T')[0];
  const todayEntries = entries.filter(e => e.date === today);

  const totalVariance = entries.reduce((s, e) => s + e.variance, 0);
  const shortages = entries.filter(e => e.status === 'short').length;
  const balanced = entries.filter(e => e.status === 'balanced').length;

  // Daily totals
  const dailyMap = new Map<string, { cash_sales: number; variance: number; count: number }>();
  for (const e of entries) {
    const existing = dailyMap.get(e.date) || { cash_sales: 0, variance: 0, count: 0 };
    existing.cash_sales += e.cash_sales;
    existing.variance += e.variance;
    existing.count++;
    dailyMap.set(e.date, existing);
  }
  const daily_totals = Array.from(dailyMap.entries()).map(([date, data]) => ({
    date,
    ...data,
  })).sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    entries,
    today_entries: todayEntries,
    daily_totals,
    stats: {
      total_entries: entries.length,
      total_variance: totalVariance,
      shortages,
      balanced,
      accuracy_rate: entries.length > 0 ? Math.round((balanced / entries.length) * 100) : 0,
      today_cash_sales: todayEntries.reduce((s, e) => s + e.cash_sales, 0),
    },
  });
}

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const expected = body.opening_cash + body.cash_sales + (body.cash_tips || 0) - (body.payouts || 0);
  const variance = body.actual_closing - expected;

  return NextResponse.json({
    id: Date.now().toString(),
    ...body,
    expected_closing: expected,
    variance,
    status: Math.abs(variance) <= 2 ? 'balanced' : variance > 0 ? 'over' : 'short',
    date: new Date().toISOString().split('T')[0],
  });
}
