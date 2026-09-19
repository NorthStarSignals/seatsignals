import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

interface OnlineOrder {
  id: string;
  customer_name: string;
  phone: string;
  items: { name: string; quantity: number; price: number; mods: string[] }[];
  subtotal: number;
  tax: number;
  delivery_fee: number;
  tip: number;
  total: number;
  type: 'pickup' | 'delivery';
  status: 'new' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled';
  estimated_time: number;
  delivery_address?: string;
  notes: string;
  created_at: string;
}

function generateOrders(): OnlineOrder[] {
  const menuItems = [
    { name: 'Grilled Salmon', price: 28 },
    { name: 'Caesar Salad', price: 14 },
    { name: 'Margherita Pizza', price: 18 },
    { name: 'Pasta Carbonara', price: 22 },
    { name: 'Chicken Wings (12pc)', price: 16 },
    { name: 'Steak Frites', price: 34 },
    { name: 'Fish & Chips', price: 19 },
    { name: 'Truffle Mac & Cheese', price: 17 },
    { name: 'Burger & Fries', price: 16 },
    { name: 'Thai Green Curry', price: 20 },
  ];

  const customers = [
    { name: 'Alex Thompson', phone: '(555) 301-0001' },
    { name: 'Maria Santos', phone: '(555) 301-0002' },
    { name: 'Kevin Park', phone: '(555) 301-0003' },
    { name: 'Sarah Mitchell', phone: '(555) 301-0004' },
    { name: 'Jordan Lee', phone: '(555) 301-0005' },
    { name: 'Priya Patel', phone: '(555) 301-0006' },
    { name: 'Derek Johnson', phone: '(555) 301-0007' },
    { name: 'Emma Chen', phone: '(555) 301-0008' },
  ];

  const statuses: OnlineOrder['status'][] = ['new', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'completed', 'completed'];
  const orders: OnlineOrder[] = [];

  for (let i = 0; i < 12; i++) {
    const customer = customers[i % customers.length];
    const numItems = 1 + Math.floor(Math.random() * 3);
    const items: OnlineOrder['items'] = [];
    for (let j = 0; j < numItems; j++) {
      const item = menuItems[Math.floor(Math.random() * menuItems.length)];
      items.push({
        name: item.name,
        quantity: 1 + Math.floor(Math.random() * 2),
        price: item.price,
        mods: Math.random() > 0.6 ? ['No onions'] : [],
      });
    }
    const subtotal = items.reduce((s, item) => s + item.price * item.quantity, 0);
    const isDelivery = Math.random() > 0.4;
    const tax = Math.round(subtotal * 0.08);
    const deliveryFee = isDelivery ? 5 : 0;
    const tip = Math.round(subtotal * (0.15 + Math.random() * 0.1));
    const status = statuses[i % statuses.length];

    orders.push({
      id: `oo-${i + 1}`,
      customer_name: customer.name,
      phone: customer.phone,
      items,
      subtotal,
      tax,
      delivery_fee: deliveryFee,
      tip,
      total: subtotal + tax + deliveryFee + tip,
      type: isDelivery ? 'delivery' : 'pickup',
      status,
      estimated_time: 25 + Math.floor(Math.random() * 20),
      delivery_address: isDelivery ? `${100 + i * 10} Main St, Apt ${i + 1}` : undefined,
      notes: Math.random() > 0.7 ? 'Ring doorbell' : '',
      created_at: new Date(Date.now() - i * 1800000).toISOString(),
    });
  }

  return orders;
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orders = generateOrders();
  const activeOrders = orders.filter(o => !['completed', 'cancelled'].includes(o.status));
  const todayRevenue = orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.total, 0);

  return NextResponse.json({
    orders,
    stats: {
      active_orders: activeOrders.length,
      completed_today: orders.filter(o => o.status === 'completed').length,
      today_revenue: todayRevenue,
      avg_order_value: orders.length > 0 ? Math.round(todayRevenue / Math.max(orders.filter(o => o.status === 'completed').length, 1)) : 0,
      pickup_count: orders.filter(o => o.type === 'pickup').length,
      delivery_count: orders.filter(o => o.type === 'delivery').length,
    },
  });
}

export async function PUT(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  return NextResponse.json({ ...body, updated: true });
}
