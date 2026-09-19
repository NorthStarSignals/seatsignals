import { crudGet, crudPost, crudPatch, crudDelete } from '@/lib/api-helpers';

const FIELDS = [
  'name', 'description', 'rules', 'color',
] as const;

export const GET = crudGet('customer_segments', { column: 'name', ascending: true });
export const POST = crudPost('customer_segments', FIELDS);
export const PATCH = crudPatch('customer_segments', FIELDS);
export const DELETE = crudDelete('customer_segments');
