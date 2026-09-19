import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

async function getRestaurant(supabase: ReturnType<typeof createServerSupabase>, userId: string) {
  const { data } = await supabase.from('restaurants').select('restaurant_id').eq('clerk_user_id', userId).single();
  return data;
}

export async function GET(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const rid = restaurant.restaurant_id;
  const category = request.nextUrl.searchParams.get('category') || '';
  const status = request.nextUrl.searchParams.get('status') || 'all';

  let query = supabase
    .from('inventory_items')
    .select('*')
    .eq('restaurant_id', rid)
    .order('name', { ascending: true });

  if (category) {
    query = query.eq('category', category);
  }

  const { data: items, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const allItems = items || [];

  // Flag items below reorder point
  const enriched = allItems.map(item => ({
    ...item,
    is_low_stock: item.quantity <= item.reorder_point,
  }));

  // Filter by status
  let filtered = enriched;
  if (status === 'low') {
    filtered = enriched.filter(item => item.is_low_stock);
  } else if (status === 'ok') {
    filtered = enriched.filter(item => !item.is_low_stock);
  }

  // Compute stats
  const totalItems = allItems.length;
  const lowStockCount = enriched.filter(item => item.is_low_stock).length;
  const totalValue = allItems.reduce((sum, item) => sum + (item.quantity * (item.cost_per_unit || 0)), 0);

  // Get distinct categories
  const categorySet = new Set<string>();
  for (const item of allItems) {
    if (item.category) categorySet.add(item.category);
  }
  const categories = Array.from(categorySet).sort();

  // Low stock alerts
  const lowStockAlerts = enriched
    .filter(item => item.is_low_stock)
    .map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      reorder_point: item.reorder_point,
      unit: item.unit,
    }));

  return NextResponse.json({
    items: filtered,
    categories,
    low_stock_alerts: lowStockAlerts,
    stats: {
      total_items: totalItems,
      low_stock_count: lowStockCount,
      total_value: Math.round(totalValue * 100) / 100,
    },
  });
}

export async function POST(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();
  const { name, category, quantity, unit, reorder_point, cost_per_unit, supplier } = body;

  if (!name || quantity === undefined || !unit) {
    return NextResponse.json({ error: 'Missing required fields: name, quantity, unit' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('inventory_items')
    .insert({
      restaurant_id: restaurant.restaurant_id,
      name,
      category: category || 'Uncategorized',
      quantity: Number(quantity),
      unit,
      reorder_point: Number(reorder_point) || 10,
      cost_per_unit: Number(cost_per_unit) || 0,
      supplier: supplier || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ item: data }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();
  const { id, quantity, reorder_point, name, category, unit, cost_per_unit, supplier } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing item id' }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (quantity !== undefined) updates.quantity = Number(quantity);
  if (reorder_point !== undefined) updates.reorder_point = Number(reorder_point);
  if (name !== undefined) updates.name = name;
  if (category !== undefined) updates.category = category;
  if (unit !== undefined) updates.unit = unit;
  if (cost_per_unit !== undefined) updates.cost_per_unit = Number(cost_per_unit);
  if (supplier !== undefined) updates.supplier = supplier;

  const { data, error } = await supabase
    .from('inventory_items')
    .update(updates)
    .eq('id', id)
    .eq('restaurant_id', restaurant.restaurant_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ item: data });
}

export async function DELETE(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: 'Missing item id' }, { status: 400 });
  }

  const { error } = await supabase
    .from('inventory_items')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', restaurant.restaurant_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
