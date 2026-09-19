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

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const rid = restaurant.restaurant_id;
  const { type, format, date_from, date_to } = await request.json();

  let data: Record<string, unknown>[] = [];
  let filename = '';

  switch (type) {
    case 'customers': {
      const { data: customers } = await supabase
        .from('customers')
        .select('first_name, last_name, email, phone, total_spend, visit_count, last_visit_date, source, created_at')
        .eq('restaurant_id', rid)
        .order('total_spend', { ascending: false })
        .limit(5000);
      data = (customers || []).map(c => ({
        Name: `${c.first_name} ${c.last_name}`,
        Email: c.email || '',
        Phone: c.phone || '',
        'Total Spend': c.total_spend || 0,
        Visits: c.visit_count || 0,
        'Last Visit': c.last_visit_date || '',
        Source: c.source || '',
        'Created At': c.created_at,
      }));
      filename = `customers_export_${new Date().toISOString().split('T')[0]}`;
      break;
    }
    case 'visits': {
      let query = supabase
        .from('visits')
        .select('amount, party_size, visit_type, server_name, created_at')
        .eq('restaurant_id', rid)
        .order('created_at', { ascending: false })
        .limit(5000);
      if (date_from) query = query.gte('created_at', date_from);
      if (date_to) query = query.lte('created_at', date_to);
      const { data: visits } = await query;
      data = (visits || []).map(v => ({
        Date: new Date(v.created_at).toLocaleDateString(),
        Amount: v.amount || 0,
        'Party Size': v.party_size || 0,
        Type: v.visit_type || 'dine-in',
        Server: v.server_name || '',
      }));
      filename = `visits_export_${new Date().toISOString().split('T')[0]}`;
      break;
    }
    case 'reviews': {
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating, review_text, source, reviewer_name, created_at, sentiment')
        .eq('restaurant_id', rid)
        .order('created_at', { ascending: false })
        .limit(5000);
      data = (reviews || []).map(r => ({
        Date: new Date(r.created_at).toLocaleDateString(),
        Rating: r.rating,
        Source: r.source || '',
        Reviewer: r.reviewer_name || '',
        Sentiment: r.sentiment || '',
        Review: (r.review_text || '').substring(0, 200),
      }));
      filename = `reviews_export_${new Date().toISOString().split('T')[0]}`;
      break;
    }
    case 'menu': {
      const { data: items } = await supabase
        .from('menu_items')
        .select('name, category, price, food_cost_pct, is_available, times_ordered')
        .eq('restaurant_id', rid)
        .order('category');
      data = (items || []).map(m => ({
        Name: m.name,
        Category: m.category || '',
        Price: m.price || 0,
        'Food Cost %': m.food_cost_pct || 0,
        Available: m.is_available ? 'Yes' : 'No',
        'Times Ordered': m.times_ordered || 0,
      }));
      filename = `menu_export_${new Date().toISOString().split('T')[0]}`;
      break;
    }
    default:
      return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
  }

  if (format === 'csv') {
    if (data.length === 0) {
      return NextResponse.json({ error: 'No data to export' }, { status: 404 });
    }
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(h => {
          const val = String(row[h] ?? '');
          return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
        }).join(',')
      ),
    ];
    const csv = csvRows.join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    });
  }

  // JSON format
  return NextResponse.json({ data, filename, count: data.length });
}
