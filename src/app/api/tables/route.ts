import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

async function getRestaurant(supabase: ReturnType<typeof createServerSupabase>, userId: string) {
  const { data } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();
  return data;
}

interface Table {
  id: string;
  number: number;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
  section: string;
  current_party_size: number | null;
  seated_at: string | null;
  server_name: string | null;
  estimated_finish: string | null;
}

function generateMockTables(restaurantId: string): Table[] {
  const sections = ['Main', 'Patio', 'Bar', 'Private'];
  const servers = ['Alex', 'Jordan', 'Sam', 'Casey', 'Morgan'];
  const statuses: Table['status'][] = ['available', 'occupied', 'reserved', 'cleaning'];
  const tables: Table[] = [];

  for (let i = 1; i <= 24; i++) {
    const status = statuses[Math.floor(Math.random() * 4)];
    const capacity = [2, 4, 4, 6, 8][Math.floor(Math.random() * 5)];
    const now = new Date();

    tables.push({
      id: `${restaurantId}-table-${i}`,
      number: i,
      capacity,
      status,
      section: sections[Math.floor((i - 1) / 6)],
      current_party_size: status === 'occupied' ? Math.ceil(Math.random() * capacity) : null,
      seated_at: status === 'occupied' ? new Date(now.getTime() - Math.random() * 90 * 60 * 1000).toISOString() : null,
      server_name: status === 'occupied' ? servers[Math.floor(Math.random() * servers.length)] : null,
      estimated_finish: status === 'occupied' ? new Date(now.getTime() + Math.random() * 60 * 60 * 1000).toISOString() : null,
    });
  }

  return tables;
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const tables = generateMockTables(restaurant.restaurant_id);

  const stats = {
    total: tables.length,
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    cleaning: tables.filter(t => t.status === 'cleaning').length,
    occupancy_rate: Math.round((tables.filter(t => t.status === 'occupied').length / tables.length) * 100),
    total_seated: tables.reduce((s, t) => s + (t.current_party_size || 0), 0),
  };

  return NextResponse.json({ tables, stats });
}

export async function PUT(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { id, status } = body;

  if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 });

  return NextResponse.json({ id, status, updated_at: new Date().toISOString() });
}
