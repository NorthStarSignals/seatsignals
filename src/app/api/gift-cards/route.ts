import { crudGet, crudPost, crudPatch, crudDelete } from '@/lib/api-helpers';

const FIELDS = [
  'code', 'original_amount', 'current_balance',
  'purchaser_name', 'purchaser_email',
  'recipient_name', 'recipient_email',
  'message', 'status', 'expires_at',
] as const;

export const GET = crudGet('gift_cards');
export const POST = crudPost('gift_cards', FIELDS);
export const PATCH = crudPatch('gift_cards', FIELDS);
export const DELETE = crudDelete('gift_cards');
