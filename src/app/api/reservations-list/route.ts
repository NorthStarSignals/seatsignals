import { crudGet, crudPost, crudPatch, crudDelete } from '@/lib/api-helpers';

const FIELDS = [
  'customer_id', 'customer_name', 'customer_phone', 'customer_email',
  'date', 'time', 'party_size', 'table_number',
  'status', 'notes', 'special_requests',
] as const;

export const GET = crudGet('reservations', { column: 'date', ascending: true });
export const POST = crudPost('reservations', FIELDS);
export const PATCH = crudPatch('reservations', FIELDS);
export const DELETE = crudDelete('reservations');
