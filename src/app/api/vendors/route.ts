import { crudGet, crudPost, crudPatch, crudDelete } from '@/lib/api-helpers';

const FIELDS = [
  'name', 'category', 'contact_name', 'email', 'phone',
  'payment_terms', 'rating', 'status', 'total_spend',
  'last_order_date', 'delivery_days', 'notes',
  // keep legacy columns writable too
  'contact_email', 'contact_phone',
] as const;

export const GET = crudGet('vendors', { column: 'name', ascending: true });
export const POST = crudPost('vendors', FIELDS);
export const PATCH = crudPatch('vendors', FIELDS);
export const DELETE = crudDelete('vendors');
