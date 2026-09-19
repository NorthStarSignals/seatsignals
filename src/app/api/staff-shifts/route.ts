import { crudGet, crudPost, crudPatch, crudDelete } from '@/lib/api-helpers';

const FIELDS = [
  'staff_id', 'staff_name', 'role',
  'date', 'shift_date', 'start_time', 'end_time',
  'status', 'notes', 'published',
] as const;

export const GET = crudGet('staff_shifts', { column: 'date', ascending: true });
export const POST = crudPost('staff_shifts', FIELDS);
export const PATCH = crudPatch('staff_shifts', FIELDS);
export const DELETE = crudDelete('staff_shifts');
