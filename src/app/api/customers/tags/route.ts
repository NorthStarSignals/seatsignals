import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  // If single customer_id param is provided, return tags for that customer
  const singleCustomerId = request.nextUrl.searchParams.get('customer_id');
  if (singleCustomerId) {
    const { data, error } = await supabase
      .from('customer_tags')
      .select('tag')
      .eq('customer_id', singleCustomerId)
      .eq('restaurant_id', restaurant.restaurant_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ tags: data || [] });
  }

  // If customer_ids param is provided, return per-customer tag mapping
  const customerIdsParam = request.nextUrl.searchParams.get('customer_ids');
  if (customerIdsParam) {
    const customerIds = customerIdsParam.split(',').filter(Boolean);
    let query = supabase
      .from('customer_tags')
      .select('customer_id, tag')
      .eq('restaurant_id', restaurant.restaurant_id);

    if (customerIds.length <= 100) {
      query = query.in('customer_id', customerIds);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const customerTags: Record<string, string[]> = {};
    for (const row of data || []) {
      if (!customerTags[row.customer_id]) customerTags[row.customer_id] = [];
      customerTags[row.customer_id].push(row.tag);
    }

    return NextResponse.json({ customer_tags: customerTags });
  }

  const { data, error } = await supabase
    .from('customer_tags')
    .select('tag')
    .eq('restaurant_id', restaurant.restaurant_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Count tags
  const tagCounts = new Map<string, number>();
  for (const row of data || []) {
    tagCounts.set(row.tag, (tagCounts.get(row.tag) || 0) + 1);
  }

  const tags = Array.from(tagCounts.entries()).map(([tag, count]) => ({ tag, count }));
  tags.sort((a, b) => b.count - a.count);

  return NextResponse.json({ tags });
}

export async function POST(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();
  const { customer_id, tags, remove_tags } = body as {
    customer_id: string;
    tags?: string[];
    remove_tags?: string[];
  };

  if (!customer_id) {
    return NextResponse.json({ error: 'customer_id required' }, { status: 400 });
  }

  // Verify customer belongs to restaurant
  const { data: customer } = await supabase
    .from('customers')
    .select('customer_id')
    .eq('customer_id', customer_id)
    .eq('restaurant_id', restaurant.restaurant_id)
    .single();

  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

  // Add tags
  if (tags && tags.length > 0) {
    const rows = tags.map((tag) => ({
      restaurant_id: restaurant.restaurant_id,
      customer_id,
      tag: tag.trim(),
    }));

    const { error } = await supabase
      .from('customer_tags')
      .upsert(rows, { onConflict: 'customer_id,tag' });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Remove tags
  if (remove_tags && remove_tags.length > 0) {
    const { error } = await supabase
      .from('customer_tags')
      .delete()
      .eq('customer_id', customer_id)
      .in('tag', remove_tags);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
