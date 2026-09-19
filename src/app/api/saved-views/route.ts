import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

interface SavedView {
  id: string;
  name: string;
  page: string;
  filters: Record<string, string>;
  sort_by: string;
  sort_dir: 'asc' | 'desc';
  columns: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const MOCK_VIEWS: SavedView[] = [
  { id: 'sv-1', name: 'VIP Customers', page: 'customers', filters: { min_spend: '1000', min_visits: '10' }, sort_by: 'total_spend', sort_dir: 'desc', columns: ['name', 'email', 'total_spend', 'visit_count', 'last_visit'], is_default: false, created_at: '2026-03-01', updated_at: '2026-04-01' },
  { id: 'sv-2', name: 'New This Month', page: 'customers', filters: { created_after: '2026-04-01', source: 'all' }, sort_by: 'created_at', sort_dir: 'desc', columns: ['name', 'email', 'source', 'created_at'], is_default: false, created_at: '2026-04-01', updated_at: '2026-04-01' },
  { id: 'sv-3', name: 'Churning Risk', page: 'customers', filters: { days_since_visit: '60', min_spend: '200' }, sort_by: 'last_visit_date', sort_dir: 'asc', columns: ['name', 'total_spend', 'visit_count', 'last_visit'], is_default: false, created_at: '2026-03-15', updated_at: '2026-03-20' },
  { id: 'sv-4', name: 'High Revenue Days', page: 'analytics', filters: { min_revenue: '5000' }, sort_by: 'revenue', sort_dir: 'desc', columns: ['date', 'revenue', 'transactions', 'avg_check'], is_default: false, created_at: '2026-03-10', updated_at: '2026-03-10' },
  { id: 'sv-5', name: 'Negative Reviews', page: 'reviews', filters: { max_rating: '3', sentiment: 'negative' }, sort_by: 'created_at', sort_dir: 'desc', columns: ['reviewer', 'rating', 'source', 'text'], is_default: true, created_at: '2026-02-15', updated_at: '2026-04-05' },
  { id: 'sv-6', name: 'Weekend Traffic', page: 'analytics', filters: { day_of_week: 'fri,sat,sun' }, sort_by: 'date', sort_dir: 'desc', columns: ['date', 'revenue', 'covers', 'avg_check'], is_default: false, created_at: '2026-03-01', updated_at: '2026-03-01' },
];

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const pages = Array.from(new Set(MOCK_VIEWS.map(v => v.page)));

  return NextResponse.json({
    views: MOCK_VIEWS,
    by_page: pages.map(p => ({
      page: p,
      count: MOCK_VIEWS.filter(v => v.page === p).length,
    })),
    stats: {
      total_views: MOCK_VIEWS.length,
      pages_with_views: pages.length,
      default_views: MOCK_VIEWS.filter(v => v.is_default).length,
    },
  });
}

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  return NextResponse.json({
    id: `sv-${Date.now()}`,
    ...body,
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

export async function PUT(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  return NextResponse.json({ ...body, updated_at: new Date().toISOString() });
}

export async function DELETE(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await request.json();
  return NextResponse.json({ deleted: id });
}
