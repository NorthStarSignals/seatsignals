import { crudGet, crudPost, crudPatch, crudDelete } from '@/lib/api-helpers';

const FIELDS = [
  'name', 'category', 'price', 'cost',
  'times_ordered', 'total_revenue', 'avg_rating', 'is_active',
] as const;

export const GET = crudGet('menu_items', { column: 'category', ascending: true });
export const POST = crudPost('menu_items', FIELDS);
export const PATCH = crudPatch('menu_items', FIELDS);
export const DELETE = crudDelete('menu_items');
