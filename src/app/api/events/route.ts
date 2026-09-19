import { crudGet, crudPost, crudPatch, crudDelete } from '@/lib/api-helpers';

const FIELDS = [
  'name', 'type', 'date', 'time', 'guests',
  'price_per_person', 'section', 'status', 'description', 'contact',
] as const;

export const GET = crudGet('events', { column: 'date', ascending: true });
export const POST = crudPost('events', FIELDS);
export const PATCH = crudPatch('events', FIELDS);
export const DELETE = crudDelete('events');
