import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

/**
 * Public Menu API - no auth required
 * Returns the restaurant's active menu items grouped by category
 */

export async function GET(
  _request: Request,
  { params }: { params: { restaurantId: string } }
) {
  const { restaurantId } = params;
  const supabase = createServerSupabase();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id, name, cuisine_type')
    .eq('restaurant_id', restaurantId)
    .single();

  if (!restaurant) {
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
  }

  const { data: items } = await supabase
    .from('menu_items')
    .select('id, name, category, price, avg_rating, is_active')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .order('category')
    .order('name');

  // Group by category
  const categories: Record<string, typeof items> = {};
  for (const item of items || []) {
    if (!categories[item.category]) categories[item.category] = [];
    categories[item.category]!.push(item);
  }

  return NextResponse.json({
    restaurant_name: restaurant.name,
    cuisine_type: restaurant.cuisine_type,
    categories: Object.entries(categories).map(([name, menuItems]) => ({
      name,
      items: menuItems,
    })),
  });
}
