import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

function getRestaurant(supabase: ReturnType<typeof createServerSupabase>, userId: string) {
  return supabase.from('restaurants').select('restaurant_id').eq('clerk_user_id', userId).single();
}

function escapeCSVField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const { data: customers, error } = await supabase
    .from('customers')
    .select('*')
    .eq('restaurant_id', restaurant.restaurant_id)
    .order('last_seen', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const columns = [
    'first_name',
    'email',
    'phone',
    'birthday',
    'source',
    'visit_count',
    'total_spend',
    'first_seen',
    'last_seen',
    'company',
    'job_title',
  ];

  const headerRow = columns.join(',');
  const dataRows = (customers || []).map((customer) =>
    columns.map((col) => escapeCSVField(customer[col])).join(',')
  );

  const csv = [headerRow, ...dataRows].join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="customers-export-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}
