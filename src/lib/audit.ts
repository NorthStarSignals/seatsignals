import { createServerSupabase } from '@/lib/supabase';

export type AuditAction =
  | 'create' | 'update' | 'delete'
  | 'login' | 'export' | 'send_message'
  | 'generate_ai' | 'merge_customers' | 'toggle_sequence'
  | 'approve_review' | 'create_promotion' | 'webhook_fired';

export type EntityType =
  | 'customer' | 'review' | 'sequence' | 'lead'
  | 'corporate_account' | 'dead_hour' | 'birthday_event'
  | 'webhook' | 'settings' | 'report' | 'referral' | 'survey';

export interface AuditLogEntry {
  id: string;
  restaurant_id: string;
  user_id: string | null;
  action: AuditAction;
  entity_type: EntityType;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export async function logAudit(params: {
  restaurantId: string;
  userId?: string;
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createServerSupabase();

  supabase
    .from('audit_log')
    .insert({
      restaurant_id: params.restaurantId,
      user_id: params.userId || null,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      details: params.details || null,
    })
    .then(({ error }) => {
      if (error) console.error('[audit] Failed to log audit event:', error);
    });
}
