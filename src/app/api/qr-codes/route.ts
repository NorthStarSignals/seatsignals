import { crudGet, crudPost, crudPatch, crudDelete } from '@/lib/api-helpers';

const FIELDS = [
  'slug', 'label', 'purpose', 'target_url', 'active',
] as const;

export const GET = crudGet('qr_codes');
export const POST = crudPost('qr_codes', FIELDS);
export const PATCH = crudPatch('qr_codes', FIELDS);
export const DELETE = crudDelete('qr_codes');
