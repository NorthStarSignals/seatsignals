import { crudGet, crudPost, crudPatch, crudDelete } from '@/lib/api-helpers';

const FIELDS = [
  'name', 'target_value', 'current_value',
  'metric_type', 'period', 'start_date', 'end_date',
] as const;

export const GET = crudGet('revenue_goals', { column: 'end_date', ascending: true });
export const POST = crudPost('revenue_goals', FIELDS);
export const PATCH = crudPatch('revenue_goals', FIELDS);
export const DELETE = crudDelete('revenue_goals');
