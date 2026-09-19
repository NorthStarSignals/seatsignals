import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

interface Bill {
  id: string;
  vendor_name: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'approved' | 'paid' | 'overdue';
  category: string;
  description: string;
  created_at: string;
}

function generateBills(): Bill[] {
  const bills: Omit<Bill, 'id'>[] = [
    { vendor_name: 'Fresh Farms Produce', invoice_number: 'FF-2026-0412', amount: 2340, due_date: '2026-04-15', status: 'pending', category: 'Produce', description: 'Weekly produce delivery', created_at: '2026-04-01' },
    { vendor_name: 'Pacific Seafood Co', invoice_number: 'PS-8834', amount: 4120, due_date: '2026-04-12', status: 'overdue', category: 'Seafood', description: 'Salmon, shrimp, and shellfish', created_at: '2026-03-28' },
    { vendor_name: 'Valley Meats', invoice_number: 'VM-2026-088', amount: 3890, due_date: '2026-04-20', status: 'approved', category: 'Meat', description: 'Prime cuts, ground beef, chicken', created_at: '2026-04-03' },
    { vendor_name: 'Premier Beverage', invoice_number: 'PB-44521', amount: 5200, due_date: '2026-04-18', status: 'pending', category: 'Beverages', description: 'Wine, spirits, and craft beer', created_at: '2026-04-02' },
    { vendor_name: 'Sysco Distribution', invoice_number: 'SY-9982341', amount: 2890, due_date: '2026-04-10', status: 'paid', category: 'Dry Goods', description: 'Monthly dry goods and supplies', created_at: '2026-03-25' },
    { vendor_name: 'Linens & Things Pro', invoice_number: 'LTP-1122', amount: 680, due_date: '2026-04-25', status: 'pending', category: 'Supplies', description: 'Table linens and napkins', created_at: '2026-04-05' },
    { vendor_name: 'City Gas & Electric', invoice_number: 'CGE-APR26', amount: 1450, due_date: '2026-04-30', status: 'pending', category: 'Utilities', description: 'April utilities', created_at: '2026-04-01' },
    { vendor_name: 'RestoParts Inc', invoice_number: 'RP-5567', amount: 890, due_date: '2026-04-08', status: 'paid', category: 'Equipment', description: 'Replacement parts for dishwasher', created_at: '2026-03-20' },
    { vendor_name: 'Dairy Direct', invoice_number: 'DD-7743', amount: 1200, due_date: '2026-04-14', status: 'approved', category: 'Dairy', description: 'Butter, cream, cheeses', created_at: '2026-04-01' },
    { vendor_name: 'Green Clean Co', invoice_number: 'GCC-APR', amount: 950, due_date: '2026-04-22', status: 'pending', category: 'Cleaning', description: 'Monthly cleaning supplies', created_at: '2026-04-03' },
  ];

  return bills.map((b, i) => ({ id: `ap-${i + 1}`, ...b }));
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const bills = generateBills();
  const totalOwed = bills.filter(b => b.status !== 'paid').reduce((s, b) => s + b.amount, 0);
  const overdue = bills.filter(b => b.status === 'overdue');
  const dueThisWeek = bills.filter(b => {
    const due = new Date(b.due_date);
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 86400000);
    return b.status !== 'paid' && due >= now && due <= weekFromNow;
  });

  return NextResponse.json({
    bills,
    stats: {
      total_bills: bills.length,
      total_owed: totalOwed,
      overdue_count: overdue.length,
      overdue_amount: overdue.reduce((s, b) => s + b.amount, 0),
      due_this_week: dueThisWeek.length,
      paid_this_month: bills.filter(b => b.status === 'paid').reduce((s, b) => s + b.amount, 0),
    },
  });
}

export async function PUT(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  return NextResponse.json({ ...body, updated: true });
}
