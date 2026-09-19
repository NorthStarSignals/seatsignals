import { crudGet, crudPost, crudPatch, crudDelete } from '@/lib/api-helpers';

const FIELDS = [
  'name', 'tier_name', 'tier_order',
  'points_threshold', 'spend_threshold',
  'min_spend', 'earn_multiplier',
  'perks', 'perks_text', 'color', 'members', 'active',
] as const;

export const GET = crudGet('loyalty_tiers', { column: 'tier_order', ascending: true });
export const POST = crudPost('loyalty_tiers', FIELDS);
export const PATCH = crudPatch('loyalty_tiers', FIELDS);
export const DELETE = crudDelete('loyalty_tiers');
