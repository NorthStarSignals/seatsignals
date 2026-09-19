import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

async function getRestaurant(supabase: ReturnType<typeof createServerSupabase>, userId: string) {
  const { data } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();
  return data;
}

export async function GET(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const rid = restaurant.restaurant_id;
  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year') || new Date().getFullYear().toString();
  const quarter = searchParams.get('quarter'); // Q1, Q2, Q3, Q4

  let startDate: string;
  let endDate: string;

  if (quarter) {
    const q = parseInt(quarter.replace('Q', ''));
    startDate = `${year}-${String((q - 1) * 3 + 1).padStart(2, '0')}-01`;
    const endMonth = q * 3;
    endDate = `${year}-${String(endMonth).padStart(2, '0')}-${endMonth === 2 ? '28' : ['04', '06', '09', '11'].includes(String(endMonth).padStart(2, '0')) ? '30' : '31'}`;
  } else {
    startDate = `${year}-01-01`;
    endDate = `${year}-12-31`;
  }

  const { data: visits } = await supabase
    .from('visits')
    .select('amount, tips, visit_type, created_at')
    .eq('restaurant_id', rid)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  const allVisits = visits || [];

  const grossRevenue = allVisits.reduce((s, v) => s + (v.amount || 0), 0);
  const totalTips = allVisits.reduce((s, v) => s + (v.tips || 0), 0);
  const taxRate = 0.08;
  const salesTax = Math.round(grossRevenue * taxRate);

  // Estimated deductions
  const cogs = Math.round(grossRevenue * 0.30);
  const labor = Math.round(grossRevenue * 0.28);
  const rent = Math.round(grossRevenue * 0.08);
  const utilities = Math.round(grossRevenue * 0.03);
  const insurance = Math.round(grossRevenue * 0.02);
  const marketing = Math.round(grossRevenue * 0.04);
  const supplies = Math.round(grossRevenue * 0.03);
  const depreciation = Math.round(grossRevenue * 0.02);

  const totalDeductions = cogs + labor + rent + utilities + insurance + marketing + supplies + depreciation;
  const taxableIncome = grossRevenue - totalDeductions;
  const estimatedTax = Math.round(taxableIncome * 0.21);

  // Monthly breakdown
  const monthly: { month: string; revenue: number; tax_collected: number; expenses: number }[] = [];
  const monthMap = new Map<string, { revenue: number; count: number }>();
  for (const v of allVisits) {
    const m = new Date(v.created_at).toLocaleString('default', { month: 'short' });
    const existing = monthMap.get(m) || { revenue: 0, count: 0 };
    existing.revenue += v.amount || 0;
    existing.count++;
    monthMap.set(m, existing);
  }
  for (const [month, data] of Array.from(monthMap.entries())) {
    monthly.push({
      month,
      revenue: Math.round(data.revenue),
      tax_collected: Math.round(data.revenue * taxRate),
      expenses: Math.round(data.revenue * 0.80),
    });
  }

  // By visit type
  const typeMap = new Map<string, number>();
  for (const v of allVisits) {
    const type = v.visit_type || 'dine-in';
    typeMap.set(type, (typeMap.get(type) || 0) + (v.amount || 0));
  }
  const by_type = Array.from(typeMap.entries()).map(([type, revenue]) => ({
    type,
    revenue: Math.round(revenue),
    tax: Math.round(revenue * taxRate),
  }));

  return NextResponse.json({
    period: { year, quarter: quarter || 'Full Year', start: startDate, end: endDate },
    income: {
      gross_revenue: Math.round(grossRevenue),
      tips_collected: Math.round(totalTips),
      sales_tax_collected: salesTax,
      net_revenue: Math.round(grossRevenue - salesTax),
    },
    deductions: {
      cost_of_goods: cogs,
      labor: labor,
      rent: rent,
      utilities: utilities,
      insurance: insurance,
      marketing: marketing,
      supplies: supplies,
      depreciation: depreciation,
      total: totalDeductions,
    },
    tax: {
      taxable_income: taxableIncome,
      estimated_tax_rate: 21,
      estimated_tax: estimatedTax,
      sales_tax_owed: salesTax,
      total_tax_liability: estimatedTax + salesTax,
    },
    monthly,
    by_type,
    transactions: allVisits.length,
  });
}
