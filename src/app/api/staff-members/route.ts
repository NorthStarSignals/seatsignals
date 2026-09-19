import { crudGet, crudPost, crudPatch, crudDelete } from '@/lib/api-helpers';

const FIELDS = [
  'name', 'role', 'department', 'email', 'phone',
  'hire_date', 'hourly_rate', 'status', 'notes',
  'certifications', 'emergency_contact', 'emergency_phone',
] as const;

export const GET = crudGet('staff_members', { column: 'name', ascending: true });
export const POST = crudPost('staff_members', FIELDS);
export const PATCH = crudPatch('staff_members', FIELDS);
export const DELETE = crudDelete('staff_members');
