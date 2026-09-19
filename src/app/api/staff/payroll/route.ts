import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

interface PayrollEntry {
  employee_name: string;
  role: string;
  hourly_rate: number;
  regular_hours: number;
  overtime_hours: number;
  tips_earned: number;
  gross_pay: number;
  deductions: number;
  net_pay: number;
}

function generatePayroll(): PayrollEntry[] {
  const employees = [
    { name: 'Sarah Chen', role: 'Server', rate: 7.25 },
    { name: 'Marcus Johnson', role: 'Bartender', rate: 9.50 },
    { name: 'Emily Rodriguez', role: 'Host', rate: 14.00 },
    { name: 'David Kim', role: 'Server', rate: 7.25 },
    { name: 'Jessica Taylor', role: 'Line Cook', rate: 18.00 },
    { name: 'Mike Brown', role: 'Sous Chef', rate: 22.00 },
    { name: 'Ashley Williams', role: 'Server', rate: 7.25 },
    { name: 'Chris Martinez', role: 'Dishwasher', rate: 15.00 },
    { name: 'Nicole Lee', role: 'Bartender', rate: 9.50 },
    { name: 'James Wilson', role: 'Expo', rate: 16.00 },
    { name: 'Amanda Foster', role: 'Manager', rate: 28.00 },
    { name: 'Robert Garcia', role: 'Executive Chef', rate: 32.00 },
  ];

  return employees.map(emp => {
    const regular = 32 + Math.floor(Math.random() * 9);
    const overtime = Math.random() > 0.6 ? Math.floor(Math.random() * 8) : 0;
    const isTipped = ['Server', 'Bartender'].includes(emp.role);
    const tips = isTipped ? 400 + Math.floor(Math.random() * 600) : 0;
    const gross = emp.rate * regular + emp.rate * 1.5 * overtime + tips;
    const deductions = Math.round(gross * 0.22);
    const net = Math.round(gross - deductions);

    return {
      employee_name: emp.name,
      role: emp.role,
      hourly_rate: emp.rate,
      regular_hours: regular,
      overtime_hours: overtime,
      tips_earned: tips,
      gross_pay: Math.round(gross),
      deductions,
      net_pay: net,
    };
  });
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payroll = generatePayroll();
  const totalGross = payroll.reduce((s, p) => s + p.gross_pay, 0);
  const totalNet = payroll.reduce((s, p) => s + p.net_pay, 0);
  const totalTips = payroll.reduce((s, p) => s + p.tips_earned, 0);
  const totalOT = payroll.reduce((s, p) => s + p.overtime_hours, 0);
  const totalHours = payroll.reduce((s, p) => s + p.regular_hours + p.overtime_hours, 0);

  // By role
  const roleMap = new Map<string, { count: number; total_pay: number; total_hours: number }>();
  for (const p of payroll) {
    const existing = roleMap.get(p.role) || { count: 0, total_pay: 0, total_hours: 0 };
    existing.count++;
    existing.total_pay += p.gross_pay;
    existing.total_hours += p.regular_hours + p.overtime_hours;
    roleMap.set(p.role, existing);
  }
  const by_role = Array.from(roleMap.entries()).map(([role, data]) => ({
    role,
    ...data,
    avg_pay: Math.round(data.total_pay / data.count),
  })).sort((a, b) => b.total_pay - a.total_pay);

  return NextResponse.json({
    payroll,
    by_role,
    stats: {
      total_employees: payroll.length,
      total_gross: totalGross,
      total_net: totalNet,
      total_tips: totalTips,
      total_overtime_hours: totalOT,
      total_hours: totalHours,
      avg_hourly_cost: Math.round(totalGross / totalHours),
    },
    period: {
      start: '2026-03-30',
      end: '2026-04-05',
      pay_date: '2026-04-10',
    },
  });
}
