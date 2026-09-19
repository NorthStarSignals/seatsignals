import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

function getRestaurant(supabase: ReturnType<typeof createServerSupabase>, userId: string) {
  return supabase.from('restaurants').select('restaurant_id').eq('clerk_user_id', userId).single();
}

export async function GET(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const params = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(params.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') || '50', 10)));
  const action = params.get('action');
  const entityType = params.get('entity_type');
  const from = params.get('from');
  const to = params.get('to');

  // Default date range: last 7 days
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 7);

  const dateFrom = from || defaultFrom.toISOString();
  const dateTo = to || now.toISOString();

  // Build count query
  let countQuery = supabase
    .from('audit_log')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurant.restaurant_id)
    .gte('created_at', dateFrom)
    .lte('created_at', dateTo);

  if (action) countQuery = countQuery.eq('action', action);
  if (entityType) countQuery = countQuery.eq('entity_type', entityType);

  const { count: total } = await countQuery;
  const totalCount = total || 0;
  const pages = Math.ceil(totalCount / limit);

  // Build data query
  let query = supabase
    .from('audit_log')
    .select('*')
    .eq('restaurant_id', restaurant.restaurant_id)
    .gte('created_at', dateFrom)
    .lte('created_at', dateTo)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (action) query = query.eq('action', action);
  if (entityType) query = query.eq('entity_type', entityType);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    logs: data || [],
    total: totalCount,
    page,
    pages,
  });
}
