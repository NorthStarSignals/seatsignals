import { crudGet, crudPost, crudPatch, crudDelete } from '@/lib/api-helpers';

const FIELDS = [
  'number', 'section', 'seats', 'status',
  'current_party', 'server', 'seated_at',
] as const;

export const GET = crudGet('floor_tables', { column: 'number', ascending: true });
export const POST = crudPost('floor_tables', FIELDS);
export const PATCH = crudPatch('floor_tables', FIELDS);
export const DELETE = crudDelete('floor_tables');
