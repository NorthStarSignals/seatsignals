import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

/**
 * Custom Segment Builder API
 * Create, manage, and query customer segments with flexible rules
 */

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const { data: segments, error } = await supabase
    .from('customer_segments')
    .select('*')
    .eq('restaurant_id', restaurant.restaurant_id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // For each segment, count matching customers
  const enriched = await Promise.all(
    (segments || []).map(async (seg) => {
      const count = await countSegmentMatches(supabase, restaurant.restaurant_id, seg.rules);
      return { ...seg, customer_count: count };
    })
  );

  return NextResponse.json(enriched);
}

export async function POST(request: Request) {
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
  const { name, description, rules, color } = body;

  if (!name || !rules) {
    return NextResponse.json({ error: 'name and rules required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('customer_segments')
    .insert({
      restaurant_id: restaurant.restaurant_id,
      name,
      description: description || '',
      rules,
      color: color || '#E11D48',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const count = await countSegmentMatches(supabase, restaurant.restaurant_id, rules);
  return NextResponse.json({ ...data, customer_count: count }, { status: 201 });
}

export async function DELETE(request: Request) {
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
  const { id } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase
    .from('customer_segments')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', restaurant.restaurant_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

interface Rule {
  field: string;
  operator: string;
  value: string | number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function countSegmentMatches(supabase: any, restaurantId: string, rules: Rule[]): Promise<number> {
  let query = supabase
    .from('customers')
    .select('customer_id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId);

  for (const rule of rules || []) {
    switch (rule.operator) {
      case 'gt': query = query.gt(rule.field, rule.value); break;
      case 'gte': query = query.gte(rule.field, rule.value); break;
      case 'lt': query = query.lt(rule.field, rule.value); break;
      case 'lte': query = query.lte(rule.field, rule.value); break;
      case 'eq': query = query.eq(rule.field, rule.value); break;
      case 'neq': query = query.neq(rule.field, rule.value); break;
      case 'contains': query = query.ilike(rule.field, `%${rule.value}%`); break;
    }
  }

  const { count } = await query;
  return count || 0;
}
