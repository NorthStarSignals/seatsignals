import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

interface OrderItem {
  menu_item_id: string;
  name: string;
  quantity: number;
  mods: string;
  price: number;
}

interface MenuItemRow {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string | null;
  is_active: boolean;
}

interface CategoryGroup {
  category: string;
  items: MenuItemRow[];
}

function generateMockMenu(): CategoryGroup[] {
  return [
    {
      category: 'Appetizers',
      items: [
        { id: 'app-1', name: 'Truffle Fries', category: 'Appetizers', price: 12.00, description: 'Parmesan & truffle oil', is_active: true },
        { id: 'app-2', name: 'Crispy Calamari', category: 'Appetizers', price: 14.00, description: 'Lemon aioli', is_active: true },
        { id: 'app-3', name: 'Bruschetta', category: 'Appetizers', price: 11.00, description: 'Heirloom tomato & basil', is_active: true },
        { id: 'app-4', name: 'Lobster Bisque', category: 'Appetizers', price: 16.00, description: 'Cognac cream', is_active: true },
        { id: 'app-5', name: 'Crab Cakes', category: 'Appetizers', price: 18.00, description: 'Remoulade sauce', is_active: true },
        { id: 'app-6', name: 'Shrimp Cocktail', category: 'Appetizers', price: 17.00, description: 'Horseradish cocktail sauce', is_active: true },
      ],
    },
    {
      category: 'Entrees',
      items: [
        { id: 'ent-1', name: 'Grilled Salmon', category: 'Entrees', price: 32.00, description: 'Lemon dill butter', is_active: true },
        { id: 'ent-2', name: 'Ribeye Steak 12oz', category: 'Entrees', price: 48.00, description: 'Au poivre sauce', is_active: true },
        { id: 'ent-3', name: 'Chicken Parmesan', category: 'Entrees', price: 26.00, description: 'House marinara', is_active: true },
        { id: 'ent-4', name: 'Filet Mignon 8oz', category: 'Entrees', price: 52.00, description: 'Red wine reduction', is_active: true },
        { id: 'ent-5', name: 'Pan-Seared Duck', category: 'Entrees', price: 38.00, description: 'Cherry glaze', is_active: true },
        { id: 'ent-6', name: 'Wagyu Burger', category: 'Entrees', price: 28.00, description: 'Brioche bun, aged cheddar', is_active: true },
      ],
    },
    {
      category: 'Sides',
      items: [
        { id: 'sid-1', name: 'Garlic Mashed Potatoes', category: 'Sides', price: 9.00, description: 'Roasted garlic & cream', is_active: true },
        { id: 'sid-2', name: 'Grilled Asparagus', category: 'Sides', price: 10.00, description: 'Lemon & olive oil', is_active: true },
        { id: 'sid-3', name: 'Caesar Salad', category: 'Sides', price: 12.00, description: 'House-made dressing', is_active: true },
        { id: 'sid-4', name: 'Mushroom Risotto', category: 'Sides', price: 14.00, description: 'Wild mushroom blend', is_active: true },
        { id: 'sid-5', name: 'Mac & Cheese', category: 'Sides', price: 11.00, description: 'Four cheese blend', is_active: true },
      ],
    },
    {
      category: 'Desserts',
      items: [
        { id: 'des-1', name: 'Tiramisu', category: 'Desserts', price: 13.00, description: 'Classic Italian', is_active: true },
        { id: 'des-2', name: 'Chocolate Lava Cake', category: 'Desserts', price: 14.00, description: 'Vanilla ice cream', is_active: true },
        { id: 'des-3', name: 'Creme Brulee', category: 'Desserts', price: 12.00, description: 'Madagascar vanilla', is_active: true },
        { id: 'des-4', name: 'New York Cheesecake', category: 'Desserts', price: 12.00, description: 'Berry compote', is_active: true },
      ],
    },
    {
      category: 'Drinks',
      items: [
        { id: 'drk-1', name: 'Sparkling Water', category: 'Drinks', price: 5.00, description: 'San Pellegrino', is_active: true },
        { id: 'drk-2', name: 'Fresh Lemonade', category: 'Drinks', price: 6.00, description: 'House-squeezed', is_active: true },
        { id: 'drk-3', name: 'Iced Tea', category: 'Drinks', price: 4.00, description: 'Unsweetened or sweet', is_active: true },
        { id: 'drk-4', name: 'Espresso', category: 'Drinks', price: 5.00, description: 'Double shot', is_active: true },
        { id: 'drk-5', name: 'Craft Cocktail', category: 'Drinks', price: 16.00, description: 'Ask server for selections', is_active: true },
      ],
    },
  ];
}

async function getRestaurant(supabase: ReturnType<typeof createServerSupabase>, userId: string) {
  const { data } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();
  return data;
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  // Try to fetch real menu items
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('id, name, category, price, description, is_active')
    .eq('restaurant_id', restaurant.restaurant_id)
    .eq('is_active', true)
    .order('category')
    .order('name');

  if (menuItems && menuItems.length > 0) {
    const grouped: Record<string, MenuItemRow[]> = {};
    for (const item of menuItems as MenuItemRow[]) {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    }
    const categories: CategoryGroup[] = Object.entries(grouped).map(([category, items]) => ({
      category,
      items,
    }));
    return NextResponse.json({ categories });
  }

  // Fall back to mock menu
  return NextResponse.json({ categories: generateMockMenu() });
}

export async function POST(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();
  const { table_number, server_name, items } = body as {
    table_number: number;
    server_name: string;
    items: OrderItem[];
  };

  if (!table_number || !server_name || !items || items.length === 0) {
    return NextResponse.json({ error: 'Missing required fields: table_number, server_name, items' }, { status: 400 });
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;

  return NextResponse.json({
    success: true,
    order: {
      order_id: orderId,
      restaurant_id: restaurant.restaurant_id,
      table_number,
      server_name,
      items,
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
      status: 'new',
      created_at: new Date().toISOString(),
    },
  });
}
