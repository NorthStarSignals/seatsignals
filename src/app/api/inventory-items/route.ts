import { crudGet, crudPost, crudPatch, crudDelete } from '@/lib/api-helpers';

const FIELDS = [
  'name', 'category', 'quantity', 'unit',
  'reorder_point', 'cost_per_unit', 'supplier',
  'is_low_stock', 'last_restocked',
] as const;

export const GET = crudGet('inventory_items', { column: 'name', ascending: true });
export const POST = crudPost('inventory_items', FIELDS);
export const PATCH = crudPatch('inventory_items', FIELDS);
export const DELETE = crudDelete('inventory_items');
