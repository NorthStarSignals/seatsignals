import { crudGet, crudPost, crudPatch, crudDelete } from '@/lib/api-helpers';

const FIELDS = [
  'name', 'phone', 'party_size', 'estimated_wait',
  'status', 'position', 'added_at', 'seated_at',
] as const;

export const GET = crudGet('waitlist', { column: 'position', ascending: true });
export const POST = crudPost('waitlist', FIELDS);
export const PATCH = crudPatch('waitlist', FIELDS);
export const DELETE = crudDelete('waitlist');
