import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

async function getRestaurant(supabase: ReturnType<typeof createServerSupabase>, userId: string) {
  const { data } = await supabase.from('restaurants').select('restaurant_id').eq('clerk_user_id', userId).single();
  return data;
}

type OrderStatus = 'new' | 'cooking' | 'ready' | 'served';
type Priority = 'normal' | 'rush' | 'vip';

interface KitchenItem {
  item_id: string;
  name: string;
  quantity: number;
  mods: string[];
  status: OrderStatus;
  started_at: string | null;
}

interface KitchenOrder {
  order_id: string;
  table_number: number;
  server_name: string;
  items: KitchenItem[];
  priority: Priority;
  special_instructions: string;
  created_at: string;
  status: OrderStatus;
}

function generateMockOrders(): KitchenOrder[] {
  const now = Date.now();
  const servers = ['Maria S.', 'James T.', 'Aisha K.', 'Devon R.', 'Sofia L.'];
  const menuItems: Array<{ name: string; mods: string[][] }> = [
    { name: 'Grilled Salmon', mods: [['no butter', 'extra lemon'], ['gluten-free'], []] },
    { name: 'Ribeye Steak 12oz', mods: [['medium-rare'], ['well-done', 'no salt'], ['rare']] },
    { name: 'Caesar Salad', mods: [['no croutons'], ['add chicken'], ['dressing on side']] },
    { name: 'Truffle Fries', mods: [['extra parmesan'], [], ['light salt']] },
    { name: 'Lobster Bisque', mods: [['no cream'], [], []] },
    { name: 'Margherita Pizza', mods: [['extra basil'], ['no cheese'], []] },
    { name: 'Chicken Parmesan', mods: [['gluten-free pasta'], [], ['extra sauce']] },
    { name: 'Mushroom Risotto', mods: [['vegan'], ['add truffle oil'], []] },
    { name: 'Fish Tacos', mods: [['no slaw'], ['extra lime'], ['spicy']] },
    { name: 'Filet Mignon 8oz', mods: [['medium'], ['rare', 'no sauce'], ['medium-well']] },
    { name: 'Shrimp Scampi', mods: [['no garlic'], ['extra butter'], []] },
    { name: 'Wagyu Burger', mods: [['no bun'], ['add bacon', 'add egg'], []] },
    { name: 'Pan-Seared Duck', mods: [['extra glaze'], [], ['no skin']] },
    { name: 'Crab Cakes', mods: [['no remoulade'], [], ['double order']] },
  ];

  const instructions = [
    '', '', '', '',
    'Nut allergy at table', 'Birthday dinner - dessert coming',
    'VIP guest - extra attention', 'Gluten allergy - separate prep',
    'Kids at table - mild spice', 'Anniversary celebration',
  ];

  const statuses: OrderStatus[] = ['new', 'cooking', 'ready', 'served'];
  const priorities: Priority[] = ['normal', 'normal', 'normal', 'normal', 'normal', 'rush', 'vip'];

  const orders: KitchenOrder[] = [];
  const usedTables = new Set<number>();

  for (let i = 0; i < 14; i++) {
    let table: number;
    do {
      table = Math.floor(Math.random() * 25) + 1;
    } while (usedTables.has(table));
    usedTables.add(table);

    const orderStatus = statuses[Math.min(Math.floor(i / 3.5), 3)];
    const minutesAgo = orderStatus === 'new' ? Math.floor(Math.random() * 8) + 1
      : orderStatus === 'cooking' ? Math.floor(Math.random() * 15) + 5
      : orderStatus === 'ready' ? Math.floor(Math.random() * 20) + 10
      : Math.floor(Math.random() * 30) + 15;

    const itemCount = Math.floor(Math.random() * 3) + 1;
    const items: KitchenItem[] = [];
    for (let j = 0; j < itemCount; j++) {
      const menuItem = menuItems[Math.floor(Math.random() * menuItems.length)];
      const modSet = menuItem.mods[Math.floor(Math.random() * menuItem.mods.length)];
      items.push({
        item_id: `item-${i}-${j}`,
        name: menuItem.name,
        quantity: Math.random() > 0.7 ? 2 : 1,
        mods: modSet,
        status: orderStatus,
        started_at: orderStatus !== 'new' ? new Date(now - minutesAgo * 60000 + 60000).toISOString() : null,
      });
    }

    orders.push({
      order_id: `ORD-${1000 + i}`,
      table_number: table,
      server_name: servers[Math.floor(Math.random() * servers.length)],
      items,
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      special_instructions: instructions[Math.floor(Math.random() * instructions.length)],
      created_at: new Date(now - minutesAgo * 60000).toISOString(),
      status: orderStatus,
    });
  }

  return orders;
}

// Cache mock data per request cycle so GET is consistent
let cachedOrders: KitchenOrder[] | null = null;

function getOrders(): KitchenOrder[] {
  if (!cachedOrders) {
    cachedOrders = generateMockOrders();
  }
  return cachedOrders;
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const orders = getOrders();

  const ordersPending = orders.filter(o => o.status === 'new').length;
  const ordersCooking = orders.filter(o => o.status === 'cooking').length;
  const servedOrders = orders.filter(o => o.status === 'served');
  const ordersCompletedToday = servedOrders.length + 47; // Add realistic prior completions

  const now = Date.now();
  const ticketTimes = orders
    .filter(o => o.status === 'served' || o.status === 'ready')
    .map(o => (now - new Date(o.created_at).getTime()) / 60000);
  const avgTicketTime = ticketTimes.length > 0
    ? Math.round(ticketTimes.reduce((a, b) => a + b, 0) / ticketTimes.length)
    : 0;

  return NextResponse.json({
    orders,
    stats: {
      orders_pending: ordersPending,
      orders_cooking: ordersCooking,
      avg_ticket_time: avgTicketTime,
      orders_completed_today: ordersCompletedToday,
    },
  });
}

export async function PUT(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();
  const { order_id, new_status } = body as { order_id: string; new_status: OrderStatus };

  if (!order_id || !new_status) {
    return NextResponse.json({ error: 'Missing order_id or new_status' }, { status: 400 });
  }

  const validStatuses: OrderStatus[] = ['new', 'cooking', 'ready', 'served'];
  if (!validStatuses.includes(new_status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  // In production, this would update the database
  // For now, return success with the mock update
  return NextResponse.json({
    success: true,
    order_id,
    new_status,
    updated_at: new Date().toISOString(),
  });
}
