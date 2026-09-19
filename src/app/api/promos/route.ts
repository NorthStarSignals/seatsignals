import { crudGet, crudPost, crudPatch, crudDelete } from '@/lib/api-helpers';

const FIELDS = [
  'code', 'name', 'description',
  'type', 'value', 'min_order', 'max_uses', 'current_uses',
  'start_date', 'end_date', 'status', 'applicable_to',
  // legacy columns still writable
  'discount_type', 'discount_value', 'starts_at', 'expires_at', 'active',
] as const;

export const GET = crudGet('promos');
export const POST = crudPost('promos', FIELDS);
export const PATCH = crudPatch('promos', FIELDS);
export const DELETE = crudDelete('promos');
